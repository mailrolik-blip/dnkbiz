import type { AiImageLayerType, AiLayerInput } from "../types";
import { buildCasperPrompt } from "./casperPrompts";
import { buildGorillaHockeyPrompt } from "./gorillaHockeyPrompts";
import { buildMonopolyPayPrompt } from "./monopolyPayPrompts";
import { buildMonopolyPrompt } from "./monopolyPrompts";

export function buildImagePrompt(input: AiLayerInput, layer: AiImageLayerType): string {
  const projectLayer = layer === "character" ? "illustration" : layer === "title_image" || layer === "decor" ? "style_base" : layer;
  if (input.project_key === "monopoly") return buildMonopolyPrompt(input, projectLayer);
  if (input.project_key === "monopoly_pay") return buildMonopolyPayPrompt(input, projectLayer);
  if (input.project_key === "casper") return buildCasperPrompt(input, projectLayer);
  if (input.project_key === "gorilla_hockey") return buildGorillaHockeyPrompt(input, projectLayer);
  return [`Project: ${input.profile?.project_name || input.project_key}. Layer: ${layer}.`, input.profile?.image_style_rules, input.command_text]
    .filter(Boolean)
    .join("\n");
}
