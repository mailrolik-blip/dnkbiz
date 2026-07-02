import type { TelegramMessage, TelegramPhotoSize, TelegramUpdate } from "./types";

export function getUpdateMessage(update: TelegramUpdate): TelegramMessage | undefined {
  return update.message || update.callback_query?.message;
}

export function getUpdateChatId(update: TelegramUpdate): string | null {
  const chatId = getUpdateMessage(update)?.chat.id;
  return chatId === undefined ? null : String(chatId);
}

export function getUpdateUserId(update: TelegramUpdate): string | null {
  const userId = update.message?.from?.id ?? update.callback_query?.from.id;
  return userId === undefined ? null : String(userId);
}

export function getMessageText(message: TelegramMessage): string {
  return (message.text || message.caption || "").trim();
}

export function getLargestPhoto(message: TelegramMessage): TelegramPhotoSize | null {
  const photos = message.photo || [];
  if (!photos.length) return null;
  return [...photos].sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] || null;
}
