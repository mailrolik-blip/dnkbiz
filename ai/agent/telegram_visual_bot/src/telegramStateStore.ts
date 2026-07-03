import fs from "node:fs/promises";
import path from "node:path";
import type { UploadedTelegramAsset, VisualRevisionTarget } from "./types";
import type { VisualProjectKey } from "../../visual_composer/src/types";

export type TelegramVisualBotMode = "idle" | "awaiting_visual_revision";

export interface TelegramVisualBotState {
  chat_id: string;
  user_id?: string;
  mode: TelegramVisualBotMode;
  active_job_id?: string;
  active_output_url?: string;
  active_output_path?: string;
  revision_target: VisualRevisionTarget | null;
  last_project_key?: string;
  last_visual_mode?: string;
  pending_uploaded_asset?: UploadedTelegramAsset;
  asset_intake_enabled?: boolean;
  active_asset_project?: VisualProjectKey;
  updated_at: string;
}

export class TelegramStateStore {
  constructor(private readonly rootDir = path.join(process.cwd(), ".storage", "telegram_visual_bot")) {}

  async getChatState(chatId: string): Promise<TelegramVisualBotState> {
    try {
      const raw = await fs.readFile(this.pathFor(chatId), "utf8");
      return JSON.parse(raw) as TelegramVisualBotState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return {
        chat_id: chatId,
        mode: "idle",
        revision_target: null,
        updated_at: new Date().toISOString(),
      };
    }
  }

  async saveChatState(chatId: string, state: TelegramVisualBotState): Promise<TelegramVisualBotState> {
    await fs.mkdir(this.rootDir, { recursive: true });
    const nextState = {
      ...state,
      chat_id: chatId,
      updated_at: new Date().toISOString(),
    };
    await fs.writeFile(this.pathFor(chatId), JSON.stringify(nextState, null, 2), "utf8");
    return nextState;
  }

  async clearChatMode(chatId: string): Promise<TelegramVisualBotState> {
    const state = await this.getChatState(chatId);
    return this.saveChatState(chatId, {
      ...state,
      mode: "idle",
      revision_target: null,
    });
  }

  async setActiveJob(input: {
    chat_id: string;
    user_id?: string;
    active_job_id: string;
    active_output_url?: string;
    active_output_path?: string;
    last_project_key?: string;
    last_visual_mode?: string;
  }): Promise<TelegramVisualBotState> {
    const state = await this.getChatState(input.chat_id);
    return this.saveChatState(input.chat_id, {
      ...state,
      user_id: input.user_id || state.user_id,
      mode: "idle",
      active_job_id: input.active_job_id,
      active_output_url: input.active_output_url,
      active_output_path: input.active_output_path,
      revision_target: null,
      last_project_key: input.last_project_key || state.last_project_key,
      last_visual_mode: input.last_visual_mode || state.last_visual_mode,
      pending_uploaded_asset: undefined,
    });
  }

  async setAwaitingRevision(chatId: string, target: VisualRevisionTarget): Promise<TelegramVisualBotState> {
    const state = await this.getChatState(chatId);
    return this.saveChatState(chatId, {
      ...state,
      mode: "awaiting_visual_revision",
      revision_target: target,
    });
  }

  async setPendingUploadedAsset(chatId: string, asset: UploadedTelegramAsset): Promise<TelegramVisualBotState> {
    const state = await this.getChatState(chatId);
    return this.saveChatState(chatId, {
      ...state,
      pending_uploaded_asset: asset,
    });
  }

  async setAssetIntakeMode(chatId: string, enabled: boolean): Promise<TelegramVisualBotState> {
    const state = await this.getChatState(chatId);
    return this.saveChatState(chatId, {
      ...state,
      asset_intake_enabled: enabled,
    });
  }

  async setActiveAssetProject(chatId: string, projectKey: VisualProjectKey): Promise<TelegramVisualBotState> {
    const state = await this.getChatState(chatId);
    return this.saveChatState(chatId, {
      ...state,
      asset_intake_enabled: true,
      active_asset_project: projectKey,
    });
  }

  private pathFor(chatId: string): string {
    const safeId = chatId.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.rootDir, `${safeId}.json`);
  }
}
