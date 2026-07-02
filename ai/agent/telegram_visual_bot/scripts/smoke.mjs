import path from "node:path";
import fs from "node:fs/promises";

const { handleVisualBotUpdate, TelegramStateStore } = await import("../dist/agent/telegram_visual_bot/src/index.js");

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
const chatId = 777001;
const userId = 777001;
const deps = { telegram, stateStore, enableAi: false };

await handleVisualBotUpdate({
  update_id: 1,
  message: { message_id: 1, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "сделай новую картинку для монополии история знакомства" },
}, deps);

let state = await stateStore.getChatState(String(chatId));
if (!state.active_job_id || !state.active_output_path || state.last_project_key !== "monopoly") throw new Error("Smoke failed: monopoly active job was not saved.");

await handleVisualBotUpdate({ update_id: 2, callback_query: { id: "callback-smoke-1", from: { id: userId, username: "smoke" }, message: { message_id: 2, chat: { id: chatId, type: "private" } }, data: "visual:revise:text" } }, deps);
await handleVisualBotUpdate({ update_id: 3, message: { message_id: 3, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ" } }, deps);
await handleVisualBotUpdate({ update_id: 4, callback_query: { id: "callback-smoke-2", from: { id: userId, username: "smoke" }, message: { message_id: 4, chat: { id: chatId, type: "private" } }, data: "visual:show_post_text" } }, deps);
await handleVisualBotUpdate({ update_id: 5, callback_query: { id: "callback-smoke-3", from: { id: userId, username: "smoke" }, message: { message_id: 5, chat: { id: chatId, type: "private" } }, data: "visual:regenerate" } }, deps);
await handleVisualBotUpdate({ update_id: 6, message: { message_id: 6, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "задача для хоккея набор детей" } }, deps);
await handleVisualBotUpdate({ update_id: 7, message: { message_id: 7, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "/debug_job" } }, deps);
await handleVisualBotUpdate({ update_id: 8, message: { message_id: 8, from: { id: userId, username: "smoke" }, chat: { id: chatId, type: "private" }, text: "/ai_status" } }, deps);

state = await stateStore.getChatState(String(chatId));
if (state.last_project_key !== "gorilla_hockey") throw new Error("Smoke failed: hockey project was not detected.");
const photoCalls = telegram.calls.filter((call) => call.method === "sendPhotoFromFile");
if (photoCalls.length < 4) throw new Error("Smoke failed: expected produce, revision, regenerate and hockey photo sends.");
if (!telegram.calls.some((call) => call.method === "sendMessage" && String(call.text).includes("Текст поста"))) throw new Error("Smoke failed: post text was not shown.");
if (!telegram.calls.some((call) => call.method === "sendMessage" && String(call.text).includes("job_id:"))) throw new Error("Smoke failed: debug job was not shown.");
if (!telegram.calls.some((call) => call.method === "sendMessage" && String(call.text).includes("AI enabled:"))) throw new Error("Smoke failed: AI status was not shown.");

console.log(JSON.stringify({ ok: true, job_id: state.active_job_id, output_path: state.active_output_path, telegram_calls: telegram.calls.map((call) => call.method) }, null, 2));
