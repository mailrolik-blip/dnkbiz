import { TelegramApi } from "@/ai/agent/telegram_visual_bot/src/telegramApi";
import { TelegramStateStore } from "@/ai/agent/telegram_visual_bot/src/telegramStateStore";
import { handleVisualBotUpdate } from "@/ai/agent/telegram_visual_bot/src/visualBotHandler";
import { getUpdateChatId } from "@/ai/agent/telegram_visual_bot/src/telegramUpdate";
import type { TelegramUpdate } from "@/ai/agent/telegram_visual_bot/src/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isEnabled() {
  return process.env.VISUAL_BOT_ENABLED !== "false";
}

function parseAllowedUserIds(): string[] {
  return (process.env.VISUAL_BOT_ALLOWED_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function checkSecret(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) return true;
  return request.headers.get("x-telegram-bot-api-secret-token") === expectedSecret;
}

export async function POST(request: Request) {
  if (!isEnabled()) return Response.json({ ok: true, disabled: true });
  if (!checkSecret(request)) return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const telegram = new TelegramApi();
  try {
    await handleVisualBotUpdate(update, {
      telegram,
      stateStore: new TelegramStateStore(),
      enableAi: process.env.VISUAL_BOT_ENABLE_AI === "true",
      sendPostText: process.env.VISUAL_BOT_SEND_POST_TEXT === "true",
      allowedUserIds: parseAllowedUserIds(),
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram visual bot webhook failed", error);
    const chatId = getUpdateChatId(update);
    if (chatId) {
      try {
        await telegram.sendMessage(chatId, `Visual bot error: ${error instanceof Error ? error.message.slice(0, 500) : "unknown error"}`);
      } catch (notifyError) {
        console.error("Telegram visual bot error notification failed", notifyError);
      }
    }
    return Response.json({ ok: true, handled: false, error: "VISUAL_BOT_FAILED" });
  }
}
