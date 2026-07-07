import path from "node:path";
import fs from "node:fs/promises";

const { handleVisualBotUpdate, TelegramStateStore } = await import("../dist/agent/telegram_visual_bot/src/index.js");
const { FileVisualJobStore } = await import("../../visual_composer/dist/store/index.js");

class MockTelegramClient {
  calls = [];

  async sendMessage(chatId, text, replyMarkup) {
    this.calls.push({ method: "sendMessage", chatId, text, replyMarkup });
    return { ok: true };
  }

  async sendPhotoFromFile(chatId, filePath, caption, replyMarkup) {
    this.calls.push({ method: "sendPhotoFromFile", chatId, filePath, caption, replyMarkup });
    return { ok: true };
  }

  async sendDocumentFromFile(chatId, filePath, caption, replyMarkup) {
    this.calls.push({ method: "sendDocumentFromFile", chatId, filePath, caption, replyMarkup });
    return { ok: true };
  }

  async answerCallbackQuery(callbackQueryId, text) {
    this.calls.push({ method: "answerCallbackQuery", callbackQueryId, text });
    return { ok: true };
  }

  async getFile(fileId) {
    return { file_id: fileId, file_path: `${fileId}.jpg` };
  }

  async downloadFile(filePath, destinationPath) {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, "mock-photo");
    return destinationPath;
  }
}

const telegram = new MockTelegramClient();
const stateStore = new TelegramStateStore(path.join(process.cwd(), ".storage", "telegram_visual_bot_smoke"));
const runId = Date.now();
const chatId = 777001 + (runId % 100000);
const userId = chatId;
const deps = { telegram, stateStore, enableAi: false };

await handleVisualBotUpdate({
  update_id: runId + 1,
  message: { message_id: runId + 1, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "сделай новую картинку для монополии история знакомства" },
}, deps);

let state = await stateStore.getChatState(String(chatId));
if (!state.active_job_id || !state.active_output_path || state.last_project_key !== "monopoly") throw new Error("Smoke failed: monopoly active job was not saved.");
const firstRecord = await new FileVisualJobStore().get(state.active_job_id);
if (firstRecord?.visual_job?.production?.pipeline_route !== "hybrid_economy") throw new Error(`Smoke failed: expected hybrid_economy route, got ${firstRecord?.visual_job?.production?.pipeline_route || "-"}.`);
const beforeDuplicateCalls = telegram.calls.length;
await handleVisualBotUpdate({
  update_id: runId + 1,
  message: { message_id: runId + 1, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "сделай новую картинку для монополии история знакомства" },
}, deps);
const duplicateCalls = telegram.calls.slice(beforeDuplicateCalls);
if (!duplicateCalls.some((call) => call.method === "sendMessage" && String(call.text).includes("отфильтрован"))) throw new Error("Smoke failed: duplicate Telegram update was not filtered.");

await handleVisualBotUpdate({ update_id: runId + 2, callback_query: { id: `callback-smoke-${runId}-1`, from: { id: userId, username: "smoke" }, message: { message_id: runId + 2, chat: { id: chatId, type: "private" } }, data: "visual:revise:text" } }, deps);
await handleVisualBotUpdate({ update_id: runId + 3, message: { message_id: runId + 3, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ" } }, deps);
await handleVisualBotUpdate({ update_id: runId + 4, callback_query: { id: `callback-smoke-${runId}-2`, from: { id: userId, username: "smoke" }, message: { message_id: runId + 4, chat: { id: chatId, type: "private" } }, data: "visual:show_post_text" } }, deps);
await handleVisualBotUpdate({ update_id: runId + 5, callback_query: { id: `callback-smoke-${runId}-3`, from: { id: userId, username: "smoke" }, message: { message_id: runId + 5, chat: { id: chatId, type: "private" } }, data: "visual:regenerate" } }, deps);
await handleVisualBotUpdate({ update_id: runId + 6, message: { message_id: runId + 6, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "задача для хоккея набор детей" } }, deps);
await handleVisualBotUpdate({ update_id: runId + 7, message: { message_id: runId + 7, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "/debug_job" } }, deps);
await handleVisualBotUpdate({ update_id: runId + 8, message: { message_id: runId + 8, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "/ai_status" } }, deps);

state = await stateStore.getChatState(String(chatId));
if (state.last_project_key !== "gorilla_hockey") throw new Error("Smoke failed: hockey project was not detected.");
const photoCalls = telegram.calls.filter((call) => call.method === "sendPhotoFromFile");
if (photoCalls.length < 4) throw new Error("Smoke failed: expected produce, revision, regenerate and hockey photo sends.");
if (!telegram.calls.some((call) => call.method === "sendMessage" && String(call.text).includes("Текст поста"))) throw new Error("Smoke failed: post text was not shown.");
if (!telegram.calls.some((call) => call.method === "sendMessage" && String(call.text).includes("job_id:"))) throw new Error("Smoke failed: debug job was not shown.");
if (!telegram.calls.some((call) => call.method === "sendMessage" && String(call.text).includes("AI enabled:"))) throw new Error("Smoke failed: AI status was not shown.");

console.log(JSON.stringify({ ok: true, job_id: state.active_job_id, output_path: state.active_output_path, telegram_calls: telegram.calls.map((call) => call.method) }, null, 2));

