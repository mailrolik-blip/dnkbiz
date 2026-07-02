import path from "node:path";
import fs from "node:fs/promises";
import { produceVisualFromCommand, reviseProducedVisual } from "../../visual_composer/src/production";
import { FileVisualJobStore } from "../../visual_composer/src/store";
import { indexVisualAssets } from "../../visual_composer/src/assets/indexAssets";
import type { RevisionTarget } from "../../visual_composer/src/revision";
import type { UploadedAsset } from "../../visual_composer/src/jobBuilder";
import { TelegramStateStore } from "./telegramStateStore";
import type { TelegramClient, TelegramMessage, TelegramUpdate, UploadedTelegramAsset, VisualRevisionTarget } from "./types";
import { getLargestPhoto, getMessageText, getUpdateChatId, getUpdateUserId } from "./telegramUpdate";
import { parseAssetCaption, saveTelegramAssetFromMessage } from "./assetIntake";

export interface VisualBotHandlerDeps {
  telegram: TelegramClient;
  stateStore?: TelegramStateStore;
  enableAi?: boolean;
  sendPostText?: boolean;
  allowedUserIds?: string[];
  uploadsDir?: string;
}

export interface VisualBotHandleResult {
  ok: true;
  handled: boolean;
  reason?: string;
}

const REVISION_LABELS: Record<RevisionTarget, string> = {
  text: "текст",
  illustration: "иллюстрацию",
  background: "фон",
  layout: "композицию",
  format: "формат",
};

export function visualRevisionKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "✏️ Текст", callback_data: "visual:revise:text" },
        { text: "Иллюстрация", callback_data: "visual:revise:illustration" },
      ],
      [
        { text: "Фон", callback_data: "visual:revise:background" },
        { text: "Композиция", callback_data: "visual:revise:layout" },
      ],
      [
        { text: "Новый вариант", callback_data: "visual:regenerate" },
        { text: "Текст поста", callback_data: "visual:show_post_text" },
      ],
      [{ text: "❌ Закрыть", callback_data: "visual:close" }],
    ],
  };
}

export async function handleVisualBotUpdate(update: TelegramUpdate, deps: VisualBotHandlerDeps): Promise<VisualBotHandleResult> {
  const stateStore = deps.stateStore || new TelegramStateStore();
  const chatId = getUpdateChatId(update);
  const userId = getUpdateUserId(update);
  if (!chatId) return { ok: true, handled: false, reason: "missing_chat_id" };

  if (deps.allowedUserIds?.length && (!userId || !deps.allowedUserIds.includes(userId))) {
    await deps.telegram.sendMessage(chatId, "Доступ к этому боту закрыт.");
    return { ok: true, handled: true, reason: "forbidden_user" };
  }

  if (update.callback_query?.data) {
    await handleCallback(update.callback_query.id, chatId, userId || undefined, update.callback_query.data, deps, stateStore);
    return { ok: true, handled: true };
  }

  const message = update.message;
  if (!message) return { ok: true, handled: false, reason: "unsupported_update" };

  const text = getMessageText(message);
  if (text.startsWith("/")) {
    await handleCommand(chatId, text, deps.telegram, stateStore);
    return { ok: true, handled: true };
  }

  if (message.voice) {
    await handleVoice(chatId, message, deps, stateStore);
    return { ok: true, handled: true };
  }

  const stateBeforeUpload = await stateStore.getChatState(chatId);
  const parsedAsset = parseAssetCaption(text);
  if ((message.photo?.length || message.document) && (parsedAsset || /^asset\b/i.test(text) || stateBeforeUpload.asset_intake_enabled)) {
    if (!parsedAsset) {
      await deps.telegram.sendMessage(chatId, "Не распознал asset caption. Напиши: asset monopoly background tags: promo,orange");
      return { ok: true, handled: true };
    }
    await handleAssetUpload(chatId, message, parsedAsset, deps.telegram);
    return { ok: true, handled: true };
  }

  const uploadedAsset = await maybeDownloadPhotoAsset(chatId, message, deps, stateStore);
  if (!text && uploadedAsset) {
    if (uploadedAsset.path) await deps.telegram.sendMessage(chatId, "Фото получил. Теперь напиши, что с ним сделать.");
    else await deps.telegram.sendMessage(chatId, "Фото получил, но скачать файл не удалось. Можно продолжить текстом, но фото не попадет в макет.");
    return { ok: true, handled: true };
  }

  const state = await stateStore.getChatState(chatId);
  if (state.mode === "awaiting_visual_revision") {
    await handleRevisionMessage(chatId, userId || undefined, text, state.revision_target, state.active_job_id, deps, stateStore);
    return { ok: true, handled: true };
  }

  if (!text) {
    await deps.telegram.sendMessage(chatId, "Напиши задачу текстом. Например: сделай картинку для монополии история знакомства");
    return { ok: true, handled: true };
  }

  const pendingAsset = uploadedAsset || state.pending_uploaded_asset;
  await handleNewVisualTask(chatId, userId || undefined, text, pendingAsset, deps, stateStore);
  return { ok: true, handled: true };
}

async function handleCommand(chatId: string, text: string, telegram: TelegramClient, stateStore: TelegramStateStore) {
  const command = text.split(/\s+/)[0].toLowerCase();
  if (command === "/start") {
    await telegram.sendMessage(chatId, "Привет. Я DNK visual bot. Напиши задачу: Monopoly, Pay, Casper или Hockey.");
    return;
  }
  if (command === "/help") {
    await telegram.sendMessage(chatId, [
      "Примеры:",
      "сделай новую картинку для монополии история знакомства",
      "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс",
      "сделай новую задачу для каспера конкурс на 3000 пользователей",
      "задача для хоккея набор детей на тренировку",
      "можно отправить фото с caption: сделай хоккейную афишу набор детей",
      "для ассетов: /asset_help",
    ].join("\n"));
    return;
  }
  if (command === "/asset_help") {
    await telegram.sendMessage(chatId, [
      "Asset intake:",
      "Отправь картинку с caption:",
      "asset monopoly background tags: orange,promo,contest",
      "asset pay icon tags: bank,pay",
      "asset casper reference tags: warning,news",
      "asset hockey logo tags: main",
      "После загрузки: /asset_index",
    ].join("\n"));
    return;
  }
  if (command === "/asset_status") {
    const state = await stateStore.getChatState(chatId);
    await telegram.sendMessage(chatId, `asset_intake_enabled: ${state.asset_intake_enabled ? "true" : "false"}`);
    return;
  }
  if (command === "/asset_mode_on") {
    await stateStore.setAssetIntakeMode(chatId, true);
    await telegram.sendMessage(chatId, "Asset intake mode включен. Отправляй картинки с caption: asset monopoly background tags: promo,orange");
    return;
  }
  if (command === "/asset_mode_off") {
    await stateStore.setAssetIntakeMode(chatId, false);
    await telegram.sendMessage(chatId, "Asset intake mode выключен.");
    return;
  }
  if (command === "/asset_index") {
    const manifest = await indexVisualAssets();
    const outputPath = path.join(process.cwd(), "ai", "agent", "visual_assets", "manifest.local.json");
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");
    await telegram.sendMessage(chatId, `Asset manifest обновлен. Ассетов: ${manifest.assets.length}`);
    return;
  }
  if (command === "/debug_job") {
    await sendDebugJob(chatId, telegram, stateStore);
    return;
  }
  if (command === "/health") {
    await telegram.sendMessage(chatId, "Visual bot работает.");
    return;
  }
  if (command === "/cancel") {
    await stateStore.clearChatMode(chatId);
    await telegram.sendMessage(chatId, "Ожидание правки сброшено.");
    return;
  }
  if (command === "/status") {
    const state = await stateStore.getChatState(chatId);
    await telegram.sendMessage(chatId, [`mode: ${state.mode}`, `active_job_id: ${state.active_job_id || "-"}`, `revision_target: ${state.revision_target || "-"}`].join("\n"));
    return;
  }
  await telegram.sendMessage(chatId, "Не знаю такую команду. Напиши /help.");
}

async function handleAssetUpload(chatId: string, message: TelegramMessage, parsed: NonNullable<ReturnType<typeof parseAssetCaption>>, telegram: TelegramClient) {
  try {
    const saved = await saveTelegramAssetFromMessage({ telegram, message, parsed });
    await telegram.sendMessage(chatId, `Ассет сохранён: ${parsed.project_key}/${parsed.type}, tags: ${parsed.tags.join(",") || "-"}\n${saved.relative_asset_path}\nЗапусти /asset_index для обновления manifest.`);
  } catch (error) {
    await telegram.sendMessage(chatId, `Не удалось сохранить ассет: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

async function handleCallback(callbackQueryId: string, chatId: string, userId: string | undefined, data: string, deps: VisualBotHandlerDeps, stateStore: TelegramStateStore) {
  const state = await stateStore.getChatState(chatId);
  if (data === "visual:close") {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Закрыто");
    await stateStore.clearChatMode(chatId);
    await deps.telegram.sendMessage(chatId, "Закрыл задачу.");
    return;
  }
  if (data === "visual:show_post_text") {
    await deps.telegram.answerCallbackQuery(callbackQueryId);
    await sendPostText(chatId, state.active_job_id, deps.telegram);
    return;
  }
  if (data === "visual:regenerate") {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Собираю новый вариант");
    await regenerateActiveJob(chatId, userId, state.active_job_id, deps, stateStore);
    return;
  }
  const target = data.replace("visual:revise:", "") as VisualRevisionTarget;
  if (!["text", "illustration", "background", "layout"].includes(target)) {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Неизвестное действие");
    return;
  }
  if (!state.active_job_id) {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Нет активной картинки");
    await deps.telegram.sendMessage(chatId, "Не нашел активную картинку. Сначала создай новую.");
    return;
  }

  await deps.telegram.answerCallbackQuery(callbackQueryId);
  await stateStore.setAwaitingRevision(chatId, target);
  const prompts: Record<string, string> = {
    text: "✏️ Напиши новый текст или правку текста.\nНапример: поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ",
    illustration: "Напиши, что изменить в иллюстрации.\nНапример: сделай другую иллюстрацию / замени персонажа",
    background: "Напиши, что изменить в фоне.\nНапример: сделай фон темнее / замени фон",
    layout: "Напиши, как поменять композицию.\nНапример: сделай другую композицию / текст вниз",
  };
  await deps.telegram.sendMessage(chatId, prompts[target]);
}

async function handleNewVisualTask(chatId: string, userId: string | undefined, text: string, uploadedAsset: UploadedTelegramAsset | undefined, deps: VisualBotHandlerDeps, stateStore: TelegramStateStore) {
  await deps.telegram.sendMessage(chatId, "Принял, собираю картинку...");
  const result = await produceVisualFromCommand({
    command_text: text,
    uploaded_assets: uploadedAsset?.path ? [toVisualUploadedAsset(uploadedAsset)] : [],
    source: { chat_id: chatId, user_id: userId },
    options: { enable_ai: Boolean(deps.enableAi) },
  });
  await deps.telegram.sendPhotoFromFile(chatId, result.output_path, buildProducedCaption(result), visualRevisionKeyboard());
  if (deps.sendPostText && result.post_caption) await deps.telegram.sendMessage(chatId, `Текст поста:\n${result.post_caption}`);
  await stateStore.setActiveJob({ chat_id: chatId, user_id: userId, active_job_id: result.job_id, active_output_path: result.output_path, active_output_url: result.output_url, last_project_key: result.detected.project_key, last_visual_mode: result.detected.visual_mode });
}

async function handleRevisionMessage(chatId: string, userId: string | undefined, text: string, target: VisualRevisionTarget | null, activeJobId: string | undefined, deps: VisualBotHandlerDeps, stateStore: TelegramStateStore) {
  if (!activeJobId || !target) {
    await stateStore.clearChatMode(chatId);
    await deps.telegram.sendMessage(chatId, "Не нашел активную картинку. Сначала создай новую.");
    return;
  }
  if (!text) {
    await deps.telegram.sendMessage(chatId, "Напиши правку текстом.");
    return;
  }

  await deps.telegram.sendMessage(chatId, "Принял правку, пересобираю картинку...");
  const result = await reviseProducedVisual({ job_id: activeJobId, target, instruction: text, uploaded_assets: [], options: { enable_ai: Boolean(deps.enableAi) } });
  await deps.telegram.sendPhotoFromFile(chatId, result.output_path, `✅ Обновил: ${REVISION_LABELS[target]}\nВерсия: ${result.version}\nJob: ${result.job_id}`, visualRevisionKeyboard());
  if (deps.sendPostText && result.post_caption) await deps.telegram.sendMessage(chatId, `Текст поста:\n${result.post_caption}`);
  await stateStore.setActiveJob({ chat_id: chatId, user_id: userId, active_job_id: result.job_id, active_output_path: result.output_path, active_output_url: result.output_url });
}

async function regenerateActiveJob(chatId: string, userId: string | undefined, activeJobId: string | undefined, deps: VisualBotHandlerDeps, stateStore: TelegramStateStore) {
  if (!activeJobId) {
    await deps.telegram.sendMessage(chatId, "Нет активной картинки для нового варианта.");
    return;
  }
  const record = await new FileVisualJobStore().get(activeJobId);
  if (!record) {
    await deps.telegram.sendMessage(chatId, "Не нашел job record для нового варианта.");
    return;
  }
  const target: RevisionTarget = deps.enableAi && record.detected.project_key !== "gorilla_hockey" ? "illustration" : "layout";
  const instruction = target === "illustration" ? "new variant regenerate illustration" : "new variant другая композиция";
  const result = await reviseProducedVisual({ job_id: activeJobId, target, instruction, uploaded_assets: [], options: { enable_ai: Boolean(deps.enableAi) } });
  await deps.telegram.sendPhotoFromFile(chatId, result.output_path, `✅ Новый вариант\nВерсия: ${result.version}\nJob: ${result.job_id}`, visualRevisionKeyboard());
  await stateStore.setActiveJob({ chat_id: chatId, user_id: userId, active_job_id: result.job_id, active_output_path: result.output_path, active_output_url: result.output_url });
}

async function sendPostText(chatId: string, activeJobId: string | undefined, telegram: TelegramClient) {
  if (!activeJobId) {
    await telegram.sendMessage(chatId, "Текст поста пока не создан.");
    return;
  }
  const record = await new FileVisualJobStore().get(activeJobId);
  const postText = record?.post_caption || record?.visual_job.post_caption || record?.visual_job.text_layer?.post_caption || (record ? `${record.detected.project_key}: ${record.source.command_text}` : "");
  await telegram.sendMessage(chatId, postText ? `Текст поста:\n${postText}` : "Текст поста пока не создан.");
}

async function sendDebugJob(chatId: string, telegram: TelegramClient, stateStore: TelegramStateStore) {
  const state = await stateStore.getChatState(chatId);
  if (!state.active_job_id) {
    await telegram.sendMessage(chatId, "Нет активного job для debug.");
    return;
  }
  const record = await new FileVisualJobStore().get(state.active_job_id);
  if (!record) {
    await telegram.sendMessage(chatId, "Job record не найден.");
    return;
  }
  const job = record.visual_job;
  await telegram.sendMessage(chatId, [
    `job_id: ${record.job_id}`,
    `project: ${record.detected.project_key}`,
    `mode: ${record.detected.visual_mode}`,
    `layout: ${job.layout.variant}`,
    `versions: ${record.outputs.length}`,
    `background: ${job.background_layer?.asset_path || "-"}`,
    `illustration: ${job.illustration_layer?.asset_path || "-"}`,
    `logo: ${job.brand?.logo_path || "-"}`,
    `quality_warnings: ${(record.quality_warnings || []).join("; ") || "-"}`,
    `asset_selection: ${(record.asset_selection_log || []).slice(-6).join("; ") || "-"}`,
    `ai_generation: ${(record.ai_generation_log || []).slice(-6).join("; ") || "-"}`,
  ].join("\n"));
}

async function handleVoice(chatId: string, message: TelegramMessage, deps: VisualBotHandlerDeps, stateStore: TelegramStateStore) {
  const uploadsDir = deps.uploadsDir || path.join(process.cwd(), ".storage", "telegram_visual_bot", "uploads");
  if (message.voice?.file_id) {
    try {
      const file = await deps.telegram.getFile(message.voice.file_id);
      if (file.file_path) await deps.telegram.downloadFile(file.file_path, path.join(uploadsDir, `${Date.now()}-${message.voice.file_id}.oga`));
    } catch {
      await stateStore.clearChatMode(chatId);
    }
  }
  await deps.telegram.sendMessage(chatId, "Голосовые пока не включены в этом окружении. Напиши задачу текстом.");
}

async function maybeDownloadPhotoAsset(chatId: string, message: TelegramMessage, deps: VisualBotHandlerDeps, stateStore: TelegramStateStore): Promise<UploadedTelegramAsset | undefined> {
  const photo = getLargestPhoto(message);
  const document = message.document;
  const fileId = photo?.file_id || document?.file_id;
  if (!fileId) return undefined;

  const asset: UploadedTelegramAsset = { id: fileId, type: photo ? "photo" : "background", source: "telegram", file_id: fileId, mime_type: document?.mime_type, original_name: document?.file_name };
  try {
    const file = await deps.telegram.getFile(fileId);
    if (file.file_path) {
      const ext = path.extname(file.file_path) || ".jpg";
      const destination = path.join(deps.uploadsDir || path.join(process.cwd(), ".storage", "telegram_visual_bot", "uploads"), `${Date.now()}-${fileId}${ext}`);
      asset.path = await deps.telegram.downloadFile(file.file_path, destination);
      asset.source = "local";
    }
  } catch {
    // Keep metadata in state and let the text flow continue with a clear user message.
  }
  await stateStore.setPendingUploadedAsset(chatId, asset);
  return asset;
}

function toVisualUploadedAsset(asset: UploadedTelegramAsset): UploadedAsset {
  return { type: asset.type === "background" ? "background" : asset.type === "illustration" ? "illustration" : asset.type === "logo" ? "logo" : "photo", asset_path: asset.path || "", id: asset.id || asset.file_id };
}

function buildProducedCaption(result: Awaited<ReturnType<typeof produceVisualFromCommand>>): string {
  return ["✅ Готово", `Проект: ${result.detected.project_key}`, `Режим: ${result.detected.visual_mode}`, `Версия: ${result.version}`, `Job: ${result.job_id}`].join("\n");
}
