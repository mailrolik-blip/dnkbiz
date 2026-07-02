import type { AiLayerInput } from "../types";
import { buildCasperPrompt } from "./casperPrompts";
import { buildGorillaHockeyPrompt } from "./gorillaHockeyPrompts";
import { buildMonopolyPayPrompt } from "./monopolyPayPrompts";
import { buildMonopolyPrompt } from "./monopolyPrompts";

export function buildImagePrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): string {
  if (input.project_key === "monopoly") return buildMonopolyPrompt(input, layer);
  if (input.project_key === "monopoly_pay") return buildMonopolyPayPrompt(input, layer);
  if (input.project_key === "casper") return buildCasperPrompt(input, layer);
  if (input.project_key === "gorilla_hockey") return buildGorillaHockeyPrompt(input, layer);
  return [`Project: ${input.profile?.project_name || input.project_key}. Layer: ${layer}.`, input.profile?.image_style_rules, input.command_text]
    .filter(Boolean)
    .join("\n");
}
