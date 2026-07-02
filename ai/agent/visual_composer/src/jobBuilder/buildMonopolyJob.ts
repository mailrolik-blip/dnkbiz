import type { OutputFormat, VisualJob } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import type { BuildVisualJobInput, TextLayerParts } from "./types";

export function buildMonopolyJob(input: BuildVisualJobInput, text: TextLayerParts, warnings: string[]): VisualJob {
  const tags = tagsFor(input.output_format || "square", "promo");
  const bg = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "background", tags, manifest: input.asset_manifest });
  const illustration = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "illustration", tags: ["character"], manifest: input.asset_manifest });
  const logo = resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "logo", tags: ["main"], manifest: input.asset_manifest });
  warnings.push(...(bg.selection_log || []), ...(illustration.selection_log || []), ...(logo.selection_log || []), ...bg.warnings, ...illustration.warnings);
  const layout = chooseLayout(input, text);
  const size = sizeFor(input.output_format || "square");

  return {
    job_type: "visual_production",
    project_key: "monopoly",
    visual_mode: "composer",
    source_text: input.command_text,
    output_format: input.output_format || "square",
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
      asset_path: illustration.asset_path,
      position: layout.includes("character_center") ? "center" : "bottom",
      locked: false,
    },
    background_layer: {
      enabled: true,
      asset_path: bg.asset_path,
      locked: false,
    },
    layout: {
      variant: layout,
      width: size.width,
      height: size.height,
      safe_area: 64,
    },
    brand: {
      logo_path: logo.asset_path,
      colors: {
        primary: "#FFD000",
        accent: "#FF4A00",
        dark: "#121A20",
        light: "#FFF3C4",
      },
    },
    profile: input.profile,
    post_caption: text.post_caption,
  };
}

function chooseLayout(input: BuildVisualJobInput, text: TextLayerParts): string {
  if (input.options?.layout_variant && input.options.layout_variant !== "auto") return input.options.layout_variant;
  if (input.output_format === "story") return "monopoly_story_vertical";
  if (text.sticker) return "monopoly_sticker_style";
  if (text.title.length > 34) return "monopoly_square_title_bottom";
  return "monopoly_square_title_top";
}

function tagsFor(format: OutputFormat, extra: string): string[] {
  return [format === "story" ? "story" : "square", extra];
}

function sizeFor(format: OutputFormat) {
  if (format === "story") return { width: 1080, height: 1920 };
  if (format === "vk_post") return { width: 1080, height: 1350 };
  return { width: 1080, height: 1080 };
}
