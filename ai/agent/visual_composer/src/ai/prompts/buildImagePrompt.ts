import type { AiLayerInput } from "../types";
import { buildImagePrompt as buildProjectImagePrompt } from "./index";

export interface BuiltImagePrompt {
  system: string;
  user: string;
  negative_rules: string;
  output_expectations: string;
}

export function buildStructuredImagePrompt(input: AiLayerInput, layer: "illustration" | "background" | "style_base"): BuiltImagePrompt {
  const styleAssets = input.visual_job?.style_assets;
  const referencePaths = [
    ...(input.reference_images || []).map((ref) => `${ref.path} role=${ref.role || "-"} lock=${ref.lock_policy || "-"}`),
    styleAssets?.reference ? `${styleAssets.reference} role=style_reference lock=reference_only` : "",
    styleAssets?.main_character ? `${styleAssets.main_character} role=main_character lock=locked` : "",
    styleAssets?.logo ? `${styleAssets.logo} role=brand_logo lock=locked` : "",
  ].filter(Boolean);
  return {
    system: "Generate a production visual layer for a composer pipeline. The output must not include letters, words, logos, watermarks, captions or final banner text.",
    user: [
      buildProjectImagePrompt(input, layer),
      referencePaths.length ? `Selected style/reference assets: ${referencePaths.join(" | ")}` : "No style/reference image assets selected.",
      referencePaths.length ? "Image reference input is not implemented in this provider path yet; use references as prompt metadata only and do not claim exact identity transfer." : "",
      styleAssets?.main_character ? "Locked main character exists; do not invent or replace this character. Composer will place the locked character asset as a layer." : "",
    ].filter(Boolean).join("\n"),
    negative_rules: "No text. No letters. No watermark. No random logo text. No distorted Cyrillic. No final poster composition with embedded headline.",
    output_expectations: "Single clean image layer usable under composer-rendered Russian text.",
  };
}
