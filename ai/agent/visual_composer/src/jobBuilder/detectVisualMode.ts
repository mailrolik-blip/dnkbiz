import type { OutputFormat, VisualMode, VisualProjectKey } from "../types";
import type { UploadedAsset } from "./types";
import { hasAny } from "./detectProject";

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
  if (hasAny(text, ["сторис", "story", "1080x1920"])) return "story";
  if (hasStandaloneToken(text, "vk") || hasStandaloneToken(text, "вк") || hasAny(text, ["1080x1350"])) return "vk_post";

  if (visualMode === "hockey_print_layout") return "print_a4";
  if (projectKey === "gorilla_hockey") return "vk_post";
  return "square";
}

function hasStandaloneToken(text: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9а-я])${escapeRegExp(token)}($|[^a-z0-9а-я])`, "iu").test(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
