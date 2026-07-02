import type { AiLayerInput } from "../types";
import { assetPromptNote, commonNegativeRules } from "./commonNegativeRules";

export function buildMonopolyPrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): string {
  const title = input.visual_job?.text_layer?.text || input.command_text;
  return [
    `Project: ${input.profile?.project_name || "Monopoly"}. Layer: ${layer}.`,
    input.profile?.image_style_rules,
    input.profile?.composition_rules,
    `Create a separate ${layer} for a bright board-game promotional visual about: ${title}.`,
    "Use expressive commercial illustration, gold/red accents, playful energy, clean foreground silhouettes.",
    assetPromptNote((input.selected_assets || []).map((asset) => asset.path)),
    commonNegativeRules,
  ].filter(Boolean).join("\n");
}
