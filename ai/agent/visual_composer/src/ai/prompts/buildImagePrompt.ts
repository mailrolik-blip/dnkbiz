import type { AiLayerInput } from "../types";
import { buildImagePrompt as buildProjectImagePrompt } from "./index";

export interface BuiltImagePrompt {
  system: string;
  user: string;
  negative_rules: string;
  output_expectations: string;
}

export function buildStructuredImagePrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): BuiltImagePrompt {
  return {
    system: "Generate a production visual layer for a composer pipeline. The output must not include letters, words, logos, watermarks, captions or final banner text.",
    user: buildProjectImagePrompt(input, layer),
    negative_rules: "No text. No letters. No watermark. No random logo text. No distorted Cyrillic. No final poster composition with embedded headline.",
    output_expectations: "Single clean image layer usable under composer-rendered Russian text.",
  };
}
