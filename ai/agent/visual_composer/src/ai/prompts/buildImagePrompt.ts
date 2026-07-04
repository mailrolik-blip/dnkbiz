import type { AiLayerInput, AiImageLayerType } from "../types";
import { buildImagePrompt as buildProjectImagePrompt } from "./index";

export interface BuiltImagePrompt {
  system: string;
  user: string;
  negative_rules: string;
  output_expectations: string;
}

export function buildStructuredImagePrompt(input: AiLayerInput, layer: AiImageLayerType): BuiltImagePrompt {
  const styleAssets = input.visual_job?.style_assets;
  const referencePaths = [
    ...(input.reference_images || []).map((ref) => `${ref.path} role=${ref.role || "-"} lock=${ref.lock_policy || "-"}`),
    styleAssets?.reference ? `${styleAssets.reference} role=style_reference lock=reference_only` : "",
    styleAssets?.main_character ? `${styleAssets.main_character} role=main_character lock=locked` : "",
    styleAssets?.logo ? `${styleAssets.logo} role=brand_logo lock=locked` : "",
    input.visual_job?.title_image_layer?.style_ref_asset_path ? `${input.visual_job.title_image_layer.style_ref_asset_path} role=title_style_reference lock=reference_only` : "",
  ].filter(Boolean);

  if (layer === "title_image") return buildTitleImagePrompt(input, referencePaths);
  if (layer === "character") return buildCharacterPrompt(input, referencePaths);
  if (layer === "background") return buildBackgroundPrompt(input, referencePaths);

  return {
    system: "Generate a production visual layer for a composer pipeline. The output must not include letters, words, logos, watermarks, captions or final banner text.",
    user: [
      buildProjectImagePrompt(input, layer),
      referencePaths.length ? `Selected style/reference assets: ${referencePaths.join(" | ")}` : "No style/reference image assets selected.",
      referencePaths.length ? "If image reference input is unavailable, use references as prompt metadata only and do not claim exact identity transfer." : "",
      styleAssets?.main_character ? "Locked main character exists; do not invent or replace this character. Composer will place the locked character asset as a layer." : "",
    ].filter(Boolean).join("\n"),
    negative_rules: "No text. No letters. No watermark. No random logo text. No distorted Cyrillic. No final poster composition with embedded headline.",
    output_expectations: "Single clean image layer usable under composer-rendered Russian text.",
  };
}

function buildCharacterPrompt(input: AiLayerInput, referencePaths: string[]): BuiltImagePrompt {
  const title = input.visual_job?.text_layer?.text || input.visual_job?.title_image_layer?.text || "";
  return {
    system: "Generate only a character layer for a Photoshop-like composer pipeline.",
    user: [
      `Project: ${input.profile?.project_name || input.project_key}.`,
      `Requested pose/action: ${input.command_text}.`,
      title ? `Current poster title for context only: ${title}. Do not draw text.` : "",
      "Preserve the character identity from the main_character reference when image reference/edit is available.",
      "Generate the pose/action only; no headline, no logo, no final banner composition.",
      "Prefer full body or waist-up sticker composition with clean transparent or simple background.",
      referencePaths.length ? `Reference assets: ${referencePaths.join(" | ")}` : "No reference image assets selected.",
    ].filter(Boolean).join("\n"),
    negative_rules: "No text. No random logo. Do not create a different character when a locked reference is supplied. No background scene unless unavoidable.",
    output_expectations: "Character PNG layer, centered, clean edges, suitable for compositing over a poster background.",
  };
}

function buildTitleImagePrompt(input: AiLayerInput, referencePaths: string[]): BuiltImagePrompt {
  const exactText = input.visual_job?.title_image_layer?.text || input.visual_job?.text_layer?.text || input.command_text;
  return {
    system: "Generate only a stylized headline image layer for a Photoshop-like composer pipeline.",
    user: [
      `Exact headline text: ${exactText}`,
      "Draw only this exact text as bold 3D promo lettering.",
      "Transparent background is preferred. No background scene, no characters, no logos, no extra words.",
      "Keep all letters inside the image bounds with generous padding.",
      input.project_key === "monopoly_pay" ? "Use fintech promo energy, clean blue/white accents if style references allow it." : "Use warm Monopoly promo energy, dimensional lettering if style references allow it.",
      referencePaths.length ? `Title/style references: ${referencePaths.join(" | ")}` : "No title style reference selected.",
    ].filter(Boolean).join("\n"),
    negative_rules: "No extra words. No misspelled Cyrillic. No background scene. No people. No logo. Do not crop letters.",
    output_expectations: "Transparent PNG headline layer with exact text, ready to place above character/background layers.",
  };
}

function buildBackgroundPrompt(input: AiLayerInput, referencePaths: string[]): BuiltImagePrompt {
  return {
    system: "Generate only a background layer for a Photoshop-like composer pipeline.",
    user: [
      buildProjectImagePrompt(input, "background"),
      "Background only: no characters, no title text, no logo, no payment labels.",
      referencePaths.length ? `Reference assets: ${referencePaths.join(" | ")}` : "No style/reference image assets selected.",
    ].filter(Boolean).join("\n"),
    negative_rules: "No text. No letters. No watermark. No logo. No people or main character.",
    output_expectations: "Clean cover-fit background layer with safe areas for title, character and logo.",
  };
}
