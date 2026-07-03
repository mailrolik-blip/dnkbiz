import fs from "node:fs/promises";
import path from "node:path";
import type { TelegramClient, TelegramFileInfo, TelegramReplyMarkup } from "./types";

export class TelegramApi implements TelegramClient {
  private readonly apiBase: string;

  constructor(private readonly token = process.env.TELEGRAM_BOT_TOKEN || "") {
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required.");
    this.apiBase = `https://api.telegram.org/bot${token}`;
  }

  async sendMessage(chatId: string | number, text: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown> {
    return this.postJson("sendMessage", {
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    });
  }

  async sendLongMessage(chatId: string | number, text: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown[]> {
    const chunks = splitTelegramText(text);
    const results: unknown[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const prefix = chunks.length > 1 ? `Debug details ${index + 1}/${chunks.length}\n` : "";
      results.push(await this.sendMessage(chatId, `${prefix}${chunks[index]}`, index === 0 ? replyMarkup : undefined));
    }
    return results;
  }

  async sendPhotoFromFile(chatId: string | number, filePath: string, caption?: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown> {
    const file = await fs.readFile(filePath);
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("photo", new Blob([new Uint8Array(file)], { type: "image/png" }), path.basename(filePath));
    if (caption) form.append("caption", caption);
    if (replyMarkup) form.append("reply_markup", JSON.stringify(replyMarkup));

    const response = await fetch(`${this.apiBase}/sendPhoto`, {
      method: "POST",
      body: form,
    });
    return this.parseTelegramResponse(response);
  }

  async sendDocumentFromFile(chatId: string | number, filePath: string, caption?: string, replyMarkup?: TelegramReplyMarkup): Promise<unknown> {
    const file = await fs.readFile(filePath);
    const form = new FormData();
    form.append("chat_id", String(chatId));
    form.append("document", new Blob([new Uint8Array(file)], { type: "application/octet-stream" }), path.basename(filePath));
    if (caption) form.append("caption", caption);
    if (replyMarkup) form.append("reply_markup", JSON.stringify(replyMarkup));
    const response = await fetch(`${this.apiBase}/sendDocument`, { method: "POST", body: form });
    return this.parseTelegramResponse(response);
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<unknown> {
    return this.postJson("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      text,
    });
  }

  async getFile(fileId: string): Promise<TelegramFileInfo> {
    const response = await this.postJson("getFile", { file_id: fileId }) as { result?: TelegramFileInfo };
    if (!response.result?.file_path) throw new Error("Telegram did not return file_path.");
    return response.result;
  }

  async downloadFile(filePath: string, destinationPath: string): Promise<string> {
    const response = await fetch(`https://api.telegram.org/file/bot${this.token}/${filePath}`);
    if (!response.ok) throw new Error(`Telegram file download failed: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, bytes);
    return destinationPath;
  }

  async setWebhook(baseUrl: string, secret?: string, options: { dropPendingUpdates?: boolean } = {}): Promise<unknown> {
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram/visual-bot/webhook`;
    return this.postJson("setWebhook", {
      url: webhookUrl,
      secret_token: secret || undefined,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: options.dropPendingUpdates || undefined,
    });
  }

  async deleteWebhook(options: { dropPendingUpdates?: boolean } = {}): Promise<unknown> {
    return this.postJson("deleteWebhook", {
      drop_pending_updates: options.dropPendingUpdates || undefined,
    });
  }

  async getWebhookInfo(): Promise<unknown> {
    return this.postJson("getWebhookInfo", {});
  }

  private async postJson(method: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.apiBase}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.parseTelegramResponse(response);
  }

  private async parseTelegramResponse(response: Response): Promise<unknown> {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) {
      const description = typeof payload?.description === "string" ? payload.description : `HTTP ${response.status}`;
      throw new Error(`Telegram API failed: ${description}`);
    }
    return payload;
  }
}

export function splitTelegramText(text: string, maxLength = 3500): string[] {
  if (maxLength <= 0) throw new Error("maxLength must be positive.");
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    const hardSlice = remaining.slice(0, maxLength);
    const breakAt = Math.max(hardSlice.lastIndexOf("\n"), hardSlice.lastIndexOf(" "));
    const splitAt = breakAt > Math.floor(maxLength * 0.55) ? breakAt : maxLength;
    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
