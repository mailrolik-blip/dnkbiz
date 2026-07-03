import type { OutputFormat, VisualMode, VisualProjectKey } from "../types";
import type { UploadedAsset } from "./types";
import { hasAny } from "./detectProject";
import { defaultOutputFormatByProject } from "./outputPresets";

export function detectVisualMode(
  commandText: string,
  projectKey: VisualProjectKey,
  uploadedAssets: UploadedAsset[] = [],
  explicit?: VisualMode | "",
): VisualMode {
  if (explicit) return explicit;
  const text = commandText.toLowerCase();
  const hasUploadedPhoto = uploadedAssets.some((asset) => asset.type === "photo");

  if (projectKey === "monopoly" || projectKey === "monopoly_pay") return "composer";
  if (projectKey === "casper") return "style_generation";
  if (projectKey === "gorilla_hockey") {
    if (hasUploadedPhoto) return "hockey_photo_template";
    if (hasAny(text, ["листовка", "печать", "print", "a4", "a5", "а4", "а5"])) return "hockey_print_layout";
    return "hockey_generated_poster";
  }

  return "post_generation";
}

export function detectOutputFormat(
  commandText: string,
  projectKey: VisualProjectKey,
  visualMode: VisualMode,
  explicit?: OutputFormat | "",
): OutputFormat {
  if (explicit) return explicit;
  const text = commandText.toLowerCase();

  if (hasStandaloneToken(text, "a4") || hasStandaloneToken(text, "а4")) return "print_a4";
  if (hasStandaloneToken(text, "a5") || hasStandaloneToken(text, "а5")) return "print_a5";
  if (hasAny(text, ["1920x1080", "1920х1080", "широк", "горизонт"])) return "wide_1920x1080";
  if (hasAny(text, ["1024x1024", "1024х1024"])) return "square_1024x1024";
  if (hasAny(text, ["1080x1080", "1080х1080", "квадрат"])) return "square_1080x1080";
  if (hasAny(text, ["сторис", "story", "1080x1920", "1080х1920"])) return "story_1080x1920";
  if (hasStandaloneToken(text, "vk") || hasStandaloneToken(text, "вк") || hasAny(text, ["1080x1350", "1080х1350"])) return "vertical_1080x1350";

  if (visualMode === "hockey_print_layout") return "print_a4";
  return defaultOutputFormatByProject[projectKey] || "wide_1920x1080";
}

function hasStandaloneToken(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9а-я])${escapeRegExp(token)}($|[^a-z0-9а-я])`, "iu").test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
