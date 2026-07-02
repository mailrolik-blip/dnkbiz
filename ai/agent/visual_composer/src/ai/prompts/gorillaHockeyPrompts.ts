import type { AiLayerInput } from "../types";
import { assetPromptNote, commonNegativeRules } from "./commonNegativeRules";

export function buildGorillaHockeyPrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): string {
  const title = input.visual_job?.text_layer?.text || input.command_text;
  const photoNote = input.visual_mode === "hockey_photo_template"
    ? "Uploaded photo template mode: do not generate a full poster; only generate optional decorative overlay/base assets."
    : "Generated poster mode: create hockey energy, kids training, parents invitation, ice and team atmosphere.";
  return [
    `Project: ${input.profile?.project_name || "Gorilla Hockey"}. Layer: ${layer}.`,
    input.profile?.image_style_rules,
    photoNote,
    `Visual task: ${title}.`,
    assetPromptNote((input.selected_assets || []).map((asset) => asset.path)),
    commonNegativeRules,
  ].filter(Boolean).join("\n");
}
