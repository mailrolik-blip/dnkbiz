const { TelegramApi } = await import("../dist/agent/telegram_visual_bot/src/index.js");

const api = new TelegramApi();
const result = await api.deleteWebhook();
console.log(JSON.stringify(result, null, 2));
