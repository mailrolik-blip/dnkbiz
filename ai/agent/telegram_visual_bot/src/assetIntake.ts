import fs from "node:fs/promises";
import path from "node:path";
import type { VisualAssetType } from "../../visual_composer/src/assets/types";
import type { VisualMode, VisualProjectKey } from "../../visual_composer/src/types";
import type { TelegramClient, TelegramMessage } from "./types";
import { getLargestPhoto, getMessageText } from "./telegramUpdate";

export interface ParsedAssetCaption {
  project_key: VisualProjectKey;
  type: VisualAssetType;
  tags: string[];
}

const projectAliases: Record<string, VisualProjectKey> = {
  monopoly: "monopoly",
  "монополия": "monopoly",
  "монополии": "monopoly",
  pay: "monopoly_pay",
  "пэй": "monopoly_pay",
  monopoly_pay: "monopoly_pay",
  "monopoly pay": "monopoly_pay",
  "монополия пэй": "monopoly_pay",
  "монополии пэй": "monopoly_pay",
  casper: "casper",
  "каспер": "casper",
  hockey: "gorilla_hockey",
  gorilla: "gorilla_hockey",
  gorilla_hockey: "gorilla_hockey",
  "хоккей": "gorilla_hockey",
  "горилла": "gorilla_hockey",
};

const typeAliases: Record<string, VisualAssetType> = {
  background: "background",
  bg: "background",
  фон: "background",
  illustration: "illustration",
  иллюстрация: "illustration",
  logo: "logo",
  логотип: "logo",
  reference: "reference",
  ref: "reference",
  референс: "reference",
  template: "template",
  шаблон: "template",
  icon: "icon",
  иконка: "icon",
  photo: "photo",
  фото: "photo",
  qr: "qr",
  print: "print",
  печать: "print",
};

const dirByType: Record<VisualAssetType, string> = {
  background: "backgrounds",
  illustration: "illustrations",
  logo: "logos",
  reference: "references",
  template: "templates",
  icon: "icons",
  photo: "photos",
  qr: "qr",
  print: "print",
};

export function parseAssetCaption(caption: string): ParsedAssetCaption | null {
  const text = caption.trim();
  if (!/^asset\s+/i.test(text)) return null;
  const body = text.replace(/^asset\s+/i, "").trim();
  const tagsMatch = body.match(/\btags\s*:\s*(.+)$/iu);
  const beforeTags = (tagsMatch ? body.slice(0, tagsMatch.index).trim() : body).replace(/\s+/g, " ");
  const tokens = beforeTags.split(" ").filter(Boolean);
  if (tokens.length < 2) return null;

  let project: VisualProjectKey | undefined;
  let type: VisualAssetType | undefined;
  for (let projectTokenCount = Math.min(2, tokens.length - 1); projectTokenCount >= 1; projectTokenCount -= 1) {
    const projectAlias = tokens.slice(0, projectTokenCount).join(" ").toLowerCase();
    project = projectAliases[projectAlias];
    if (project) {
      type = typeAliases[tokens[projectTokenCount]?.toLowerCase() || ""];
      break;
    }
  }
  if (!project || !type) return null;

  return {
    project_key: project,
    type,
    tags: (tagsMatch?.[1] || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  };
}

export async function saveTelegramAssetFromMessage(input: {
  telegram: TelegramClient;
  message: TelegramMessage;
  parsed: ParsedAssetCaption;
}): Promise<{ ok: true; asset_path: string; meta_path: string; relative_asset_path: string }> {
  const photo = getLargestPhoto(input.message);
  const document = input.message.document;
  const fileId = photo?.file_id || document?.file_id;
  if (!fileId) throw new Error("asset message has no photo/document file_id.");

  const file = await input.telegram.getFile(fileId);
  if (!file.file_path) throw new Error("Telegram did not return file_path.");

  const ext = path.extname(file.file_path) || path.extname(document?.file_name || "") || ".jpg";
  const fileName = `${Date.now()}-${safePart(fileId)}${ext}`;
  const projectDir = path.join(
    process.cwd(),
    "ai",
    "agent",
    "visual_assets",
    "manual_project_packs",
    input.parsed.project_key,
    dirByType[input.parsed.type],
  );
  await fs.mkdir(projectDir, { recursive: true });
  const assetPath = path.join(projectDir, fileName);
  await input.telegram.downloadFile(file.file_path, assetPath);

  const metaPath = assetPath.replace(/\.[^.]+$/, ".meta.json");
  const meta = {
    tags: input.parsed.tags,
    usage: input.parsed.type,
    safe_for_auto_use: true,
    description: `Telegram uploaded ${input.parsed.project_key}/${input.parsed.type}`,
    priority: 10,
    project_key: input.parsed.project_key,
    recommended_modes: recommendedModes(input.parsed.project_key),
    notes: `source=telegram caption=${getMessageText(input.message)}`,
  };
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), "utf8");

  return {
    ok: true,
    asset_path: assetPath,
    meta_path: metaPath,
    relative_asset_path: path.relative(process.cwd(), assetPath).replace(/\\/g, "/"),
  };
}

function recommendedModes(projectKey: VisualProjectKey): VisualMode[] {
  if (projectKey === "monopoly" || projectKey === "monopoly_pay") return ["composer"];
  if (projectKey === "casper") return ["style_generation"];
  if (projectKey === "gorilla_hockey") return ["hockey_generated_poster", "hockey_photo_template", "hockey_print_layout"];
  return ["post_generation"];
}

function safePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
