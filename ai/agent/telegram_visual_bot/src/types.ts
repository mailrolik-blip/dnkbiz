import type { RevisionTarget } from "../../visual_composer/src/revision";

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  is_bot?: boolean;
}

export interface TelegramChat {
  id: number;
  type?: string;
}

export interface TelegramFileRef {
  file_id: string;
  file_unique_id?: string;
  file_size?: number;
}

export interface TelegramPhotoSize extends TelegramFileRef {
  width: number;
  height: number;
}

export interface TelegramMessage {
  message_id: number;
  date?: number;
  from?: TelegramUser;
  chat: TelegramChat;
  text?: string;
  caption?: string;
  voice?: TelegramFileRef & {
    duration?: number;
    mime_type?: string;
  };
  photo?: TelegramPhotoSize[];
  document?: TelegramFileRef & {
    file_name?: string;
    mime_type?: string;
  };
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface TelegramReplyMarkup {
  inline_keyboard?: InlineKeyboardButton[][];
}

export interface TelegramFileInfo {
  file_id: string;
  file_unique_id?: string;
  file_size?: number;
  file_path?: string;
}

export interface TelegramClient {
  sendMessage(chatId: string | number, text: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown>;
  sendLongMessage?(chatId: string | number, text: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown[]>;
  sendPhotoFromFile(chatId: string | number, filePath: string, caption?: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown>;
  sendDocumentFromFile?(chatId: string | number, filePath: string, caption?: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<unknown>;
  getFile(fileId: string): Promise<TelegramFileInfo>;
  downloadFile(filePath: string, destinationPath: string): Promise<string>;
}

export type VisualRevisionTarget = RevisionTarget;

export interface UploadedTelegramAsset {
  id?: string;
  type: "background" | "illustration" | "photo" | "logo";
  source: "telegram" | "local" | "url";
  path?: string;
  url?: string;
  file_id?: string;
  mime_type?: string;
  original_name?: string;
}
