import type { OutputFormat, VisualJob } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import type { BuildVisualJobInput, TextLayerParts } from "./types";

export function buildCasperJob(input: BuildVisualJobInput, text: TextLayerParts, warnings: string[]): VisualJob {
  const format = input.output_format || "square";
  const illustration = resolveVisualAsset({ project_key: "casper", visual_mode: "style_generation", asset_type: "illustration", tags: ["generated"], manifest: input.asset_manifest });
  const background = resolveVisualAsset({ project_key: "casper", visual_mode: "style_generation", asset_type: "background", tags: ["base"], manifest: input.asset_manifest });
  warnings.push(...illustration.warnings, ...background.warnings);
  const layout = chooseLayout(input, text);
  const size = sizeFor(format);

  return {
    job_type: "visual_production",
    project_key: "casper",
    visual_mode: "style_generation",
    source_text: input.command_text,
    output_format: format,
    text_layer: {
      enabled: true,
      text: text.title,
      subtitle: text.subtitle,
      sticker: text.sticker,
      post_caption: text.post_caption,
      position: "bottom",
      locked: false,
    },
    illustration_layer: {
      enabled: true,
      asset_path: illustration.asset_path || background.asset_path,
      position: "cover",
      locked: false,
    },
    background_layer: {
      enabled: true,
      asset_path: background.asset_path,
      locked: false,
    },
    layout: {
      variant: layout,
      width: size.width,
      height: size.height,
      safe_area: 64,
    },
    brand: {
      colors: {
        primary: "#38BDF8",
        accent: "#A7F3D0",
        dark: "#0F172A",
        light: "#F8FAFC",
      },
    },
    profile: input.profile,
    post_caption: text.post_caption,
  };
}

function chooseLayout(input: BuildVisualJobInput, text: TextLayerParts): string {
  if (input.options?.layout_variant && input.options.layout_variant !== "auto") return input.options.layout_variant;
  const lower = `${input.command_text} ${text.title}`.toLowerCase();
  if (lower.includes("фишинг") || lower.includes("осторожно") || lower.includes("предупреж")) return "casper_warning";
  if (lower.includes("подпис") || lower.includes("связи")) return "casper_subscribe";
  if (lower.includes("конкурс")) return "casper_contest";
  return "casper_square_news";
}

function sizeFor(format: OutputFormat) {
  if (format === "story") return { width: 1080, height: 1920 };
  if (format === "vk_post") return { width: 1080, height: 1350 };
  return { width: 1080, height: 1080 };
}
