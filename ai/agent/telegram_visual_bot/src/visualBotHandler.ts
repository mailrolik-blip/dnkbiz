import path from "node:path";
import fs from "node:fs/promises";
import { produceVisualFromCommand, reviseProducedVisual } from "../../visual_composer/src/production";
import { FileVisualJobStore } from "../../visual_composer/src/store";
import { indexVisualAssets } from "../../visual_composer/src/assets/indexAssets";
import { loadDefaultAssetManifest } from "../../visual_composer/src/assets/assetResolver";
import { getUsageSummary } from "../../visual_composer/src/ai/usageGuard";
import type { RevisionTarget } from "../../visual_composer/src/revision";
import type { UploadedAsset } from "../../visual_composer/src/jobBuilder";
import { TelegramStateStore } from "./telegramStateStore";
import type { TelegramClient, TelegramMessage, TelegramUpdate, UploadedTelegramAsset, VisualRevisionTarget } from "./types";
import { getLargestPhoto, getMessageText, getUpdateChatId, getUpdateUserId } from "./telegramUpdate";
import { assetProjectFromAlias, parseAssetCaption, saveTelegramAssetFromMessage } from "./assetIntake";
import { splitTelegramText } from "./telegramApi";

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
  title_image: "текст",
  character: "деда/персонажа",
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
        { text: "Дед/персонаж", callback_data: "visual:revise:character" },
      ],
      [
        { text: "Фон", callback_data: "visual:revise:background" },
        { text: "Композиция", callback_data: "visual:revise:layout" },
      ],
      [
        { text: "Новый вариант", callback_data: "visual:regenerate" },
        { text: "Текст поста", callback_data: "visual:show_post_text" },
      ],
      [
        { text: "PNG без сжатия", callback_data: "visual:send_original" },
        { text: "Слои ZIP", callback_data: "visual:send_layer_pack" },
      ],
      [{ text: "❌ Закрыть", callback_data: "visual:close" }],
    ],
  };
}

export async function handleVisualBotUpdate(update: TelegramUpdate, deps: VisualBotHandlerDeps): Promise<VisualBotHandleResult> {
  const stateStore = deps.stateStore || new TelegramStateStore();
  const effectiveDeps = { ...deps, enableAi: await resolveAiEnabled(deps.enableAi) };
  const chatId = getUpdateChatId(update);
  const userId = getUpdateUserId(update);
  if (!chatId) return { ok: true, handled: false, reason: "missing_chat_id" };

  if (deps.allowedUserIds?.length && (!userId || !deps.allowedUserIds.includes(userId))) {
    await deps.telegram.sendMessage(chatId, "Доступ к этому боту закрыт.");
    return { ok: true, handled: true, reason: "forbidden_user" };
  }

  if (update.callback_query?.data) {
    await handleCallback(update.callback_query.id, chatId, userId || undefined, update.callback_query.data, effectiveDeps, stateStore);
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
      const pending = await maybeDownloadPhotoAsset(chatId, message, effectiveDeps, stateStore);
      const projectHint = stateBeforeUpload.active_asset_project ? `\nactive project: ${stateBeforeUpload.active_asset_project}` : "";
      await deps.telegram.sendMessage(chatId, `Файл получил как pending asset.${projectHint}\nЧтобы сохранить в style pack, отправь файл с caption: asset monopoly character role: main_character tags: ded,main lock: locked\nИли выбери проект: /asset_project monopoly`);
      return { ok: true, handled: true };
    }
    await handleAssetUpload(chatId, message, parsedAsset, deps.telegram);
    return { ok: true, handled: true };
  }

  const uploadedAsset = await maybeDownloadPhotoAsset(chatId, message, effectiveDeps, stateStore);
  if (!text && uploadedAsset) {
    if (uploadedAsset.path) await deps.telegram.sendMessage(chatId, "Фото получил. Теперь напиши, что с ним сделать.");
    else await deps.telegram.sendMessage(chatId, "Фото получил, но скачать файл не удалось. Можно продолжить текстом, но фото не попадет в макет.");
    return { ok: true, handled: true };
  }

  const state = await stateStore.getChatState(chatId);
  if (state.mode === "awaiting_visual_revision") {
    await handleRevisionMessage(chatId, userId || undefined, text, state.revision_target, state.active_job_id, effectiveDeps, stateStore);
    return { ok: true, handled: true };
  }

  if (!text) {
    await deps.telegram.sendMessage(chatId, "Напиши задачу текстом. Например: сделай картинку для монополии история знакомства");
    return { ok: true, handled: true };
  }

  const pendingAsset = uploadedAsset || state.pending_uploaded_asset;
  await handleNewVisualTask(chatId, userId || undefined, text, pendingAsset, effectiveDeps, stateStore);
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
      "asset monopoly character role: main_character tags: ded,main lock: locked",
      "asset pay icon tags: bank,pay",
      "asset casper reference tags: warning,news",
      "asset hockey logo tags: main",
      "/asset_status monopoly",
      "/asset_list",
      "/asset_project hockey",
      "После загрузки: /asset_index",
    ].join("\n"));
    return;
  }
  if (command === "/asset_status") {
    const projectArg = text.split(/\s+/)[1];
    if (projectArg) {
      await sendAssetProjectStatus(chatId, telegram, projectArg);
    } else {
      const state = await stateStore.getChatState(chatId);
      await telegram.sendMessage(chatId, `asset_intake_enabled: ${state.asset_intake_enabled ? "true" : "false"}\nUse: /asset_status monopoly`);
    }
    return;
  }
  if (command === "/asset_list") {
    await sendAssetList(chatId, telegram);
    return;
  }
  if (command === "/asset_project") {
    const project = assetProjectFromAlias(text.split(/\s+/)[1] || "");
    if (!project) {
      await telegram.sendMessage(chatId, "Не понял проект. Используй: /asset_project monopoly|pay|casper|hockey");
      return;
    }
    await stateStore.setActiveAssetProject(chatId, project);
    await telegram.sendMessage(chatId, `Active asset project: ${project}\nAsset intake mode включен. Теперь отправляй ассеты с caption, затем /asset_index.`);
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
  if (command === "/debug_job" || command === "/debug_job_full") {
    await safeSendDebugJob(chatId, telegram, stateStore, command === "/debug_job_full");
    return;
  }
  if (command === "/ai_status" || command === "/ai_usage") {
    await sendAiStatus(chatId, telegram);
    return;
  }
  if (command === "/ai_on") {
    await setAiOverride(true);
    await telegram.sendMessage(chatId, "AI runtime override: on. Env default не изменён.");
    return;
  }
  if (command === "/ai_off") {
    await setAiOverride(false);
    await telegram.sendMessage(chatId, "AI runtime override: off. Env default не изменён.");
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
  if (data === "visual:send_original") {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Отправляю PNG");
    await sendOriginalPng(chatId, state.active_job_id, deps.telegram);
    return;
  }
  if (data === "visual:send_layer_pack") {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Собираю ZIP");
    await sendLayerPack(chatId, state.active_job_id, deps.telegram);
    return;
  }
  if (data === "visual:regenerate") {
    await deps.telegram.answerCallbackQuery(callbackQueryId, "Собираю новый вариант");
    await regenerateActiveJob(chatId, userId, state.active_job_id, deps, stateStore);
    return;
  }
  let target = data.replace("visual:revise:", "") as VisualRevisionTarget;
  if (target === "illustration" && state.last_project_key && ["monopoly", "monopoly_pay"].includes(state.last_project_key)) target = "character";
  if (!["text", "title_image", "character", "illustration", "background", "layout"].includes(target)) {
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
    title_image: "✏️ Напиши новый заголовок. Для Monopoly/Pay будет пересобран только title image layer.",
    character: "Напиши, что изменить у деда/персонажа. Например: дед держит кубок. Locked character сохраняется без explicit unlock.",
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
  if ((result.visual_job.output_format === "print_a4" || result.visual_job.output_format === "print_a5") && deps.telegram.sendDocumentFromFile) {
    await deps.telegram.sendPhotoFromFile(chatId, result.output_path, buildProducedCaption(result), visualRevisionKeyboard());
    await deps.telegram.sendDocumentFromFile(chatId, result.output_path, "PNG без сжатия");
  } else {
    await deps.telegram.sendPhotoFromFile(chatId, result.output_path, buildProducedCaption(result), visualRevisionKeyboard());
  }
  if (process.env.VISUAL_BOT_AUTO_SEND_ORIGINAL === "true" && deps.telegram.sendDocumentFromFile) {
    await deps.telegram.sendDocumentFromFile(chatId, result.output_path, "PNG без сжатия");
  }
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

async function sendOriginalPng(chatId: string, activeJobId: string | undefined, telegram: TelegramClient) {
  if (!activeJobId) {
    await telegram.sendMessage(chatId, "Нет активной картинки для отправки PNG.");
    return;
  }
  const record = await new FileVisualJobStore().get(activeJobId);
  const outputPath = record?.outputs.at(-1)?.output_path || record?.visual_job.output_path;
  if (!record || !outputPath) {
    await telegram.sendMessage(chatId, "Не нашел output_path для PNG.");
    return;
  }
  if (!telegram.sendDocumentFromFile) {
    await telegram.sendMessage(chatId, `PNG без сжатия: ${outputPath}`);
    return;
  }
  await telegram.sendDocumentFromFile(chatId, outputPath, "PNG без сжатия");
}

async function sendLayerPack(chatId: string, activeJobId: string | undefined, telegram: TelegramClient) {
  if (!activeJobId) {
    await telegram.sendMessage(chatId, "Нет активной картинки для ZIP слоёв.");
    return;
  }
  const record = await new FileVisualJobStore().get(activeJobId);
  const outputPath = record?.outputs.at(-1)?.output_path || record?.visual_job.output_path;
  if (!record || !outputPath) {
    await telegram.sendMessage(chatId, "Не нашел output_path для ZIP слоёв.");
    return;
  }
  const { exportLayerPack } = await import("../../visual_composer/src/layerPack/exportLayerPack");
  const { loadDefaultAssetManifest } = await import("../../visual_composer/src/assets/assetResolver");
  const pack = await exportLayerPack({ job_id: activeJobId, visual_job: record.visual_job, final_output_path: outputPath, manifest: loadDefaultAssetManifest() });
  if (!telegram.sendDocumentFromFile) {
    await telegram.sendMessage(chatId, `ZIP слоёв: ${pack.zip_path}`);
    return;
  }
  await telegram.sendDocumentFromFile(chatId, pack.zip_path, "Слои ZIP");
}

async function safeSendDebugJob(chatId: string, telegram: TelegramClient, stateStore: TelegramStateStore, full: boolean) {
  try {
    await sendDebugJob(chatId, telegram, stateStore, full);
  } catch (error) {
    console.error("Failed to send visual debug job", error);
    await safeSendMessage(
      telegram,
      chatId,
      `Debug слишком длинный или не удалось отправить. Ошибка: ${error instanceof Error ? error.message.slice(0, 500) : "unknown error"}`,
    );
  }
}

async function sendDebugJob(chatId: string, telegram: TelegramClient, stateStore: TelegramStateStore, full = false) {
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
  const usage = await getUsageSummary();
  const aiUsed = Boolean(job.illustration_layer?.generated_by_ai || job.background_layer?.generated_by_ai);
  const manifest = loadDefaultAssetManifest();
  const projectAssets = manifest.assets.filter((asset) => asset.project_key === record.detected.project_key);
  const count = (type: string) => projectAssets.filter((asset) => asset.type === type).length;
  const composerUsage = (record.compose_log || []).find((line) => line.startsWith("composer_usage")) || "composer_usage background=unknown character=unknown logo=unknown";
  const selectionLog = record.asset_selection_log || [];
  const selectedLine = (type: string) => selectionLog.filter((line) => line.includes(`type=${type}`) || line.includes(`/${type}`)).slice(-2).join("; ") || "-";
  const aiSkippedReason = detectAiSkippedReason(record.ai_generation_log || [], job);
  const summary = [
    `job_id: ${record.job_id}`,
    `project: ${record.detected.project_key}`,
    `mode: ${record.detected.visual_mode}`,
    `layout: ${job.layout.variant}`,
    `resolved_size: ${job.layout.width || job.final_composite?.width || "-"}x${job.layout.height || job.final_composite?.height || "-"}`,
    `versions: ${record.outputs.length}`,
    `title: ${job.text_layer?.text || "-"}`,
    `post_caption: ${record.post_caption ? "yes" : "no"}`,
    `manifest_total: ${projectAssets.length}`,
    `manifest_backgrounds: ${count("background")}`,
    `manifest_characters: ${count("character")}`,
    `manifest_logos: ${count("logo")}`,
    `manifest_references: ${count("reference")}`,
    `manifest_icons: ${count("icon")}`,
    `AI used: ${aiUsed ? "yes" : "no"}`,
    `AI image attempted: ${(record.ai_generation_log || []).some((line) => line.includes("AI requested")) ? "yes" : "no"}`,
    `AI skipped reason: ${aiSkippedReason}`,
    `background: ${job.background_layer?.asset_path || "-"}`,
    `character_layer: ${job.character_layer?.asset_path || job.illustration_layer?.asset_path || "-"}`,
    `title_image_layer: source=${job.title_image_layer?.source || "-"} path=${job.title_image_layer?.asset_path || job.title_image_layer?.generated_asset_path || "-"} transparent=${job.title_image_layer?.transparent_background ? "yes" : "no"} text=${job.title_image_layer?.text || "-"}`,
    `illustration: ${job.illustration_layer?.asset_path || "-"}`,
    `logo: ${job.brand?.logo_path || "-"}`,
    `main_character: ${job.style_assets?.main_character || "-"}`,
    `style_reference: ${job.style_assets?.reference || "-"}`,
    `icons: ${(job.style_assets?.icons || [job.style_assets?.icon].filter(Boolean)).join(", ") || "-"}`,
    `selection_background: ${selectedLine("background")}`,
    `selection_character: ${selectedLine("character")}`,
    `selection_logo: ${selectedLine("logo")}`,
    `composer: ${composerUsage}`,
    `usage_today: images=${usage.image_generations_count}, text=${usage.text_generations_count}, failed=${usage.failed_generations_count}`,
    full ? "full_debug: sending details below" : "full_debug: use /debug_job_full for detailed logs",
  ].join("\n");

  const details = [
    `template: ${job.style_assets?.template || "-"}`,
    `locked_assets: ${(job.style_assets?.locked_assets || []).join(", ") || "-"}`,
    `selection_reference: ${selectedLine("reference")}`,
    `selection_icon: ${selectedLine("icon")}`,
    `quality_warnings: ${(record.quality_warnings || []).join("; ") || "-"}`,
    `style_warnings: ${(job.style_assets?.warnings || []).join("; ") || "-"}`,
    `asset_selection:\n${(record.asset_selection_log || []).join("\n") || "-"}`,
    `ai_generation:\n${(record.ai_generation_log || []).join("\n") || "-"}`,
    `compose_log:\n${(record.compose_log || []).join("\n") || "-"}`,
    `prompt: ${record.visual_job.illustration_layer?.prompt_used?.slice(0, 220) || record.visual_job.background_layer?.prompt_used?.slice(0, 220) || "-"}`,
  ].join("\n");

  await sendLongText(telegram, chatId, summary.slice(0, 3500));
  if (full && details.trim()) await sendLongText(telegram, chatId, details);
}

async function sendLongText(telegram: TelegramClient, chatId: string | number, text: string): Promise<void> {
  if (telegram.sendLongMessage) {
    await telegram.sendLongMessage(chatId, text);
    return;
  }
  const chunks = splitTelegramText(text);
  for (let index = 0; index < chunks.length; index += 1) {
    const prefix = chunks.length > 1 ? `Debug details ${index + 1}/${chunks.length}\n` : "";
    await telegram.sendMessage(chatId, `${prefix}${chunks[index]}`);
  }
}

async function safeSendMessage(telegram: TelegramClient, chatId: string | number, text: string): Promise<void> {
  try {
    await telegram.sendMessage(chatId, text.slice(0, 3500));
  } catch (error) {
    console.error("Failed to send Telegram fallback message", error);
  }
}

function detectAiSkippedReason(aiLog: string[], job: { illustration_layer?: { generated_by_ai?: boolean }; background_layer?: { generated_by_ai?: boolean }; style_assets?: { locked_assets?: string[] } }): string {
  const joined = aiLog.join("; ");
  if (joined.includes("VISUAL_AI_DAILY_LIMIT")) return "daily_limit";
  if (joined.includes("OPENAI_API_KEY missing")) return "missing_key";
  if (joined.includes("OpenAI image fallback")) return "provider_error";
  if (job.style_assets?.locked_assets?.length && !job.illustration_layer?.generated_by_ai && !job.background_layer?.generated_by_ai) return "asset_locked";
  if (joined.includes("AI skipped")) return "disabled";
  return "-";
}

async function sendAssetProjectStatus(chatId: string, telegram: TelegramClient, projectAlias: string) {
  const project = assetProjectFromAlias(projectAlias);
  if (!project) {
    await telegram.sendMessage(chatId, "Не понял проект. Используй: monopoly, pay, casper, hockey.");
    return;
  }
  const manifest = loadDefaultAssetManifest();
  const assets = manifest.assets.filter((asset) => asset.project_key === project);
  const count = (type: string) => assets.filter((asset) => asset.type === type).length;
  const safe = assets.filter((asset) => asset.safe_for_auto_use !== false).length;
  const locked = assets.filter((asset) => asset.lock_policy === "locked").length;
  await telegram.sendMessage(chatId, [
    `project: ${project}`,
    `backgrounds: ${count("background")}`,
    `characters: ${count("character")}`,
    `logos: ${count("logo")}`,
    `references: ${count("reference")}`,
    `templates: ${count("template")}`,
    `icons: ${count("icon")}`,
    `safe_for_auto_use: ${safe}`,
    `locked_assets: ${locked}`,
  ].join("\n"));
}

async function sendAssetList(chatId: string, telegram: TelegramClient) {
  const manifest = loadDefaultAssetManifest();
  const rows = manifest.assets
    .slice(-20)
    .map((asset) => `${asset.project_key}/${asset.type}/${asset.role || "-"} lock=${asset.lock_policy || "-"} tags=${asset.tags.join(",") || "-"}`);
  await telegram.sendMessage(chatId, rows.length ? rows.join("\n") : "Asset manifest пуст. Запусти /asset_index после загрузки ассетов.");
}

async function sendAiStatus(chatId: string, telegram: TelegramClient) {
  const override = await readAiOverride();
  const enabled = await resolveAiEnabled(process.env.VISUAL_BOT_ENABLE_AI === "true");
  const usage = await getUsageSummary();
  await telegram.sendMessage(chatId, [
    `AI enabled: ${enabled ? "yes" : "no"}`,
    `runtime override: ${override === null ? "null" : override ? "true" : "false"}`,
    `key present: ${process.env.OPENAI_API_KEY ? "yes" : "no"}`,
    `text model: ${process.env.OPENAI_TEXT_MODEL || "gpt-5-mini"}`,
    `image model: ${process.env.OPENAI_IMAGE_MODEL || "gpt-image-1"}`,
    `image quality: ${process.env.OPENAI_IMAGE_QUALITY || process.env.VISUAL_OUTPUT_QUALITY || "medium"}`,
    `image size: ${process.env.OPENAI_IMAGE_SIZE || "1024x1024"}`,
    `daily limit: ${usage.daily_limit}`,
    `usage today: images=${usage.image_generations_count}, text=${usage.text_generations_count}, failed=${usage.failed_generations_count}`,
  ].join("\n"));
}

async function resolveAiEnabled(envDefault?: boolean): Promise<boolean> {
  const override = await readAiOverride();
  if (override !== null) return override;
  return Boolean(envDefault);
}

async function readAiOverride(): Promise<boolean | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(aiConfigPath(), "utf8")) as { ai_enabled_override?: boolean | null };
    return typeof parsed.ai_enabled_override === "boolean" ? parsed.ai_enabled_override : null;
  } catch {
    return null;
  }
}

async function setAiOverride(value: boolean | null): Promise<void> {
  await fs.mkdir(path.dirname(aiConfigPath()), { recursive: true });
  await fs.writeFile(aiConfigPath(), JSON.stringify({ ai_enabled_override: value }, null, 2), "utf8");
}

function aiConfigPath(): string {
  return path.join(process.cwd(), ".storage", "telegram_visual_bot", "config.json");
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
