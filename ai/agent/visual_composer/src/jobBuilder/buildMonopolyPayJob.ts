import type { OutputFormat, VisualJob } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import type { BuildVisualJobInput, TextLayerParts } from "./types";

export function buildMonopolyPayJob(input: BuildVisualJobInput, text: TextLayerParts, warnings: string[]): VisualJob {
  const format = input.output_format || "square";
  const bg = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "background", tags: tagsFor(format, "fintech"), manifest: input.asset_manifest });
  const illustration = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "illustration", tags: ["payment"], manifest: input.asset_manifest });
  const icon = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "icon", tags: ["payment"], manifest: input.asset_manifest });
  const logo = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "logo", tags: ["main"], manifest: input.asset_manifest });
  warnings.push(...(bg.selection_log || []), ...(illustration.selection_log || []), ...(icon.selection_log || []), ...(logo.selection_log || []), ...bg.warnings, ...illustration.warnings);
  const layout = chooseLayout(input, text);
  const size = sizeFor(format);

  return {
    job_type: "visual_production",
    project_key: "monopoly_pay",
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
      variant: "pay_title",
      position: "top",
      locked: false,
    },
    illustration_layer: {
      enabled: true,
      asset_path: illustration.asset_path || icon.asset_path,
      position: "center",
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
        primary: "#19D47B",
        accent: "#006DFF",
        dark: "#101820",
        light: "#F4FBFF",
      },
    },
    profile: input.profile,
    post_caption: text.post_caption,
  };
}

function chooseLayout(input: BuildVisualJobInput, text: TextLayerParts): string {
  if (input.options?.layout_variant && input.options.layout_variant !== "auto") return input.options.layout_variant;
  if (input.output_format === "story") return "pay_story_vertical";
  const lower = `${input.command_text} ${text.title}`.toLowerCase();
  if (lower.includes("банк")) return "pay_square_bank_alert";
  if (lower.includes("метод") || lower.includes("яндекс")) return "pay_square_method_card";
  return "pay_square_v1";
}

function tagsFor(format: OutputFormat, extra: string): string[] {
  return [format === "story" ? "story" : "square", extra];
}

function sizeFor(format: OutputFormat) {
  if (format === "story") return { width: 1080, height: 1920 };
  if (format === "vk_post") return { width: 1080, height: 1350 };
  return { width: 1080, height: 1080 };
}
