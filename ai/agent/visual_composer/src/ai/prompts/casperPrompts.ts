import type { AiLayerInput } from "../types";
import { assetPromptNote, commonNegativeRules } from "./commonNegativeRules";

export function buildCasperPrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): string {
  const title = input.visual_job?.text_layer?.text || input.command_text;
  return [
    `Project: ${input.profile?.project_name || "Casper"}. Layer: ${layer}.`,
    input.profile?.image_style_rules,
    `Create a friendly but alert ghost/exchange/news Telegram promo base for: ${title}.`,
    "Use modern digital finance atmosphere, clear subject, soft ghost motif, enough contrast for overlay.",
    assetPromptNote((input.selected_assets || []).map((asset) => asset.path)),
    commonNegativeRules,
  ].filter(Boolean).join("\n");
}
