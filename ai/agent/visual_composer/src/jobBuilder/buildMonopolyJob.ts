import type { OutputFormat, VisualJob } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import type { BuildVisualJobInput, TextLayerParts } from "./types";
import { sizeForOutputFormat } from "./outputPresets";

export function buildMonopolyJob(input: BuildVisualJobInput, text: TextLayerParts, warnings: string[]): VisualJob {
  const format = input.output_format || "wide_1920x1080";
  const tags = tagsFor(format, "promo");
  const character = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "character", role: "main_character", lock_policy: "locked", tags: ["ded", "main"], manifest: input.asset_manifest });
  const bg = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "background", tags, manifest: input.asset_manifest });
  const illustration = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "illustration", tags: ["character"], manifest: input.asset_manifest });
  const logo = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "logo", tags: ["main"], manifest: input.asset_manifest });
  const reference = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "reference", role: "style_reference", lock_policy: "reference_only", tags: ["promo", "style"], manifest: input.asset_manifest });
  const titleReference = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "reference", role: "title_style_reference", lock_policy: "reference_only", tags: ["title", "text", "3d"], manifest: input.asset_manifest });
  warnings.push(...(character.selection_log || []), ...(bg.selection_log || []), ...(illustration.selection_log || []), ...(logo.selection_log || []), ...(reference.selection_log || []), ...(titleReference.selection_log || []), ...bg.warnings, ...illustration.warnings);
  if (!character.asset_path) warnings.push("No locked Monopoly main character found; AI generated/free fallback used.");
  const layout = chooseLayout(input, text);
  const size = sizeFor(format);
  const characterPath = character.asset_path || illustration.asset_path;

  return {
    job_type: "visual_production",
    project_key: "monopoly",
    visual_mode: "composer",
    source_text: input.command_text,
    output_format: format,
    text_layer: {
      enabled: true,
      text: text.title,
      subtitle: text.subtitle,
      sticker: text.sticker,
      cta: text.cta,
      post_caption: text.post_caption,
      internal_prompt: text.internal_prompt,
      variant: "gold_3d_title",
      position: layout.includes("bottom") ? "bottom" : "top",
      locked: false,
    },
    illustration_layer: {
      enabled: true,
      asset_path: characterPath,
      position: layout.includes("character_center") ? "center" : "bottom",
      locked: Boolean(character.asset_path),
    },
    background_layer: {
      enabled: true,
      asset_path: bg.asset_path,
      lock_policy: bg.asset?.lock_policy,
      fit: "cover",
      source: bg.asset_path ? "asset" : "fallback",
      locked: false,
    },
    character_layer: {
      enabled: true,
      asset_path: characterPath,
      role: "main_character",
      lock_policy: character.asset?.lock_policy,
      fit: "contain",
      source: characterPath ? "asset" : "fallback",
      locked: Boolean(character.asset_path),
    },
    title_image_layer: {
      enabled: true,
      text: text.title,
      transparent_background: true,
      style_ref_asset_path: titleReference.asset_path || reference.asset_path,
      source: "composer_fallback",
      position: "top",
      fit: "contain",
      warnings: ["title_image_layer uses composer_fallback; AI title PNG generation is not enabled in smoke/fallback mode."],
    },
    layout: { variant: layout, width: size.width, height: size.height, safe_area: 64 },
    brand: {
      logo_path: logo.asset_path,
      colors: { primary: "#FFD000", accent: "#FF4A00", dark: "#121A20", light: "#FFF3C4" },
    },
    logo_layer: {
      enabled: Boolean(logo.asset_path),
      asset_path: logo.asset_path,
      position: "top_left",
      fit: "contain",
      lock_policy: logo.asset?.lock_policy,
      source: logo.asset_path ? "asset" : "fallback",
    },
    decor_layer: { enabled: Boolean(text.sticker), pills: compactStrings([text.sticker]), source: "composer_fallback" },
    final_composite: { width: size.width, height: size.height, delivery_mode: "preview" },
    profile: input.profile,
    style_assets: {
      main_character: character.asset_path,
      logo: logo.asset_path,
      background: bg.asset_path,
      reference: reference.asset_path,
      title_style_reference: titleReference.asset_path,
      references: [reference.asset_path, titleReference.asset_path].filter(Boolean),
      locked_assets: [character.asset_path, logo.asset_path].filter(Boolean),
      warnings: character.asset_path ? ["main_character locked asset used"] : ["main_character missing"],
    },
    post_caption: text.post_caption,
  };
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function chooseLayout(input: BuildVisualJobInput, text: TextLayerParts): string {
  if (input.options?.layout_variant && input.options.layout_variant !== "auto") return input.options.layout_variant;
  if (input.output_format === "story" || input.output_format === "story_1080x1920") return "character_center_title_top";
  if (text.sticker) return "poster_sticker_style";
  if (text.title.length > 34) return "character_center_bottom";
  return "character_right_title_left";
}

function tagsFor(format: OutputFormat, extra: string): string[] {
  const formatTag = format.includes("story") ? "story" : format.includes("square") || format === "square" ? "square" : "wide";
  return [formatTag, extra];
}

function sizeFor(format: OutputFormat) {
  return sizeForOutputFormat(format);
}
