const { TelegramApi } = await import("../dist/agent/telegram_visual_bot/src/index.js");

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

const baseUrl = readArg("--url") || process.env.NEXT_PUBLIC_APP_URL || "";
if (!baseUrl) {
  console.error("Usage: npm run telegram:visual:set-webhook -- --url https://xxxxx.trycloudflare.com");
  process.exit(1);
}

const api = new TelegramApi();
const result = await api.setWebhook(baseUrl, process.env.TELEGRAM_WEBHOOK_SECRET || undefined, {
  dropPendingUpdates: hasFlag("--drop-pending"),
});
console.log(JSON.stringify(result, null, 2));
