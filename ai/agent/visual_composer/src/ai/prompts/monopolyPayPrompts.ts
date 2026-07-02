import type { AiLayerInput } from "../types";
import { assetPromptNote, commonNegativeRules } from "./commonNegativeRules";

export function buildMonopolyPayPrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): string {
  const title = input.visual_job?.text_layer?.text || input.command_text;
  return [
    `Project: ${input.profile?.project_name || "Monopoly Pay"}. Layer: ${layer}.`,
    input.profile?.image_style_rules,
    `Generate clean fintech ${layer}: payment method, bank/card/link/balance visual cues for "${title}".`,
    "Use modern promo lighting, card/payment objects, high contrast, no fake UI details.",
    assetPromptNote((input.selected_assets || []).map((asset) => asset.path)),
    commonNegativeRules,
  ].filter(Boolean).join("\n");
}
