import type { OutputFormat, VisualJob } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import { resolveApprovedPoseAsset, resolveApprovedTitleAsset } from "../assets/approvedAssetResolver";
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
  const approvedTitle = resolveApprovedTitleAsset({ project_key: "monopoly", title: text.title, manifest: input.asset_manifest });
  const approvedPose = resolveApprovedPoseAsset({ project_key: "monopoly", instruction: input.command_text, manifest: input.asset_manifest });
  warnings.push(...(character.selection_log || []), ...(bg.selection_log || []), ...(illustration.selection_log || []), ...(logo.selection_log || []), ...(reference.selection_log || []), ...(titleReference.selection_log || []), ...bg.warnings, ...illustration.warnings);
  warnings.push(`production_asset_first=${process.env.VISUAL_PRODUCTION_ASSET_FIRST !== "false"}`, approvedTitle.log, approvedPose.log);
  if (!character.asset_path) warnings.push("No locked Monopoly main character found; AI generated/free fallback used.");
  const layout = chooseLayout(input, text);
  const size = sizeFor(format);
  const characterPath = approvedPose.asset_path || character.asset_path || illustration.asset_path;

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
      locked: Boolean(approvedPose.asset_path || character.asset_path),
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
      lock_policy: approvedPose.asset?.lock_policy || character.asset?.lock_policy,
      fit: "contain",
      source: characterPath ? "asset" : "fallback",
      locked: Boolean(approvedPose.asset_path || character.asset_path),
      warnings: compactStrings([approvedPose.asset_path ? "pose_asset_match source=approved_pose" : ""]),
    },
    title_image_layer: {
      enabled: true,
      text: text.title,
      asset_path: approvedTitle.asset_path || undefined,
      transparent_background: true,
      style_ref_asset_path: titleReference.asset_path || reference.asset_path,
      source: approvedTitle.asset_path ? "asset" : "composer_fallback",
      position: "top",
      fit: "contain",
      warnings: compactStrings([approvedTitle.asset_path ? "title_asset_match source=approved_asset" : "title_image_layer uses composer_fallback; AI title PNG generation is not enabled in smoke/fallback mode."]),
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
      main_character: characterPath,
      logo: logo.asset_path,
      background: bg.asset_path,
      reference: reference.asset_path,
      title_style_reference: titleReference.asset_path,
      references: [reference.asset_path, titleReference.asset_path].filter(Boolean),
      locked_assets: [characterPath, logo.asset_path].filter(Boolean),
      warnings: compactStrings([
        approvedTitle.asset_path ? "approved title_image asset used" : "",
        approvedPose.asset_path ? "approved character_pose asset used" : "",
        character.asset_path ? "main_character locked asset used" : "",
        !characterPath ? "main_character missing" : "",
      ]),
    },
    post_caption: text.post_caption,
  };
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function chooseLayout(input: BuildVisualJobInput, text: TextLayerParts): string {
  if (input.options?.layout_variant && input.options.layout_variant !== "auto") return input.options.layout_variant;
  if (input.output_format === "story" || input.output_format === "story_1080x1920") return "monopoly_title_top_character_bottom_right";
  if (text.sticker) return "monopoly_banner_like_reference";
  if (text.title.length > 34) return "monopoly_big_title_center_character_right";
  return "monopoly_hero_title_left_character_right";
}

function tagsFor(format: OutputFormat, extra: string): string[] {
  const formatTag = format.includes("story") ? "story" : format.includes("square") || format === "square" ? "square" : "wide";
  return [formatTag, extra];
}

function sizeFor(format: OutputFormat) {
  return sizeForOutputFormat(format);
}

