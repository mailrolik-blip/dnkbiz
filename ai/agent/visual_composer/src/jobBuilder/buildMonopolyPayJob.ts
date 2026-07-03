import type { OutputFormat, VisualJob } from "../types";
import { resolveVisualAsset } from "../assets/assetResolver";
import type { BuildVisualJobInput, TextLayerParts } from "./types";

export function buildMonopolyPayJob(input: BuildVisualJobInput, text: TextLayerParts, warnings: string[]): VisualJob {
  const format = input.output_format || "square";
  const bg = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "background", tags: tagsFor(format, "fintech"), manifest: input.asset_manifest });
  const illustration = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "illustration", tags: ["payment"], manifest: input.asset_manifest });
  const icon = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "icon", tags: ["payment"], manifest: input.asset_manifest });
  const logo = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "logo", tags: ["main"], manifest: input.asset_manifest });
  const payCharacter = resolveVisualAsset({ project_key: "monopoly_pay", visual_mode: "composer", asset_type: "character", role: "main_character", lock_policy: "locked", tags: ["ded", "main", "pay"], manifest: input.asset_manifest });
  const wantsDed = /дед|нашим\s+дедом|наш\s+дед/i.test(input.command_text);
  const monopolyCharacter = wantsDed && !payCharacter.asset_path
    ? resolveVisualAsset({ project_key: "monopoly", visual_mode: "composer", asset_type: "character", role: "main_character", lock_policy: "locked", tags: ["ded", "main"], manifest: input.asset_manifest })
    : undefined;
  const characterPath = payCharacter.asset_path || monopolyCharacter?.asset_path || "";
  warnings.push(...(bg.selection_log || []), ...(illustration.selection_log || []), ...(icon.selection_log || []), ...(logo.selection_log || []), ...(payCharacter.selection_log || []), ...(monopolyCharacter?.selection_log || []), ...bg.warnings, ...illustration.warnings);
  if (wantsDed && !characterPath) warnings.push("Pay requested 'наш дед', but no locked Pay or Monopoly main character was found.");
  if (wantsDed && !payCharacter.asset_path && monopolyCharacter?.asset_path) warnings.push("Pay character missing; using locked Monopoly main_character as cross-project fallback.");
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
      asset_path: characterPath || illustration.asset_path || icon.asset_path,
      position: "center",
      locked: Boolean(characterPath),
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
    style_assets: {
      main_character: characterPath,
      logo: logo.asset_path,
      background: bg.asset_path,
      icon: icon.asset_path,
      icons: compactStrings([icon.asset_path]),
      locked_assets: compactStrings([characterPath, logo.asset_path]),
      warnings: compactStrings([
        payCharacter.asset_path ? "pay locked main_character used" : "",
        !payCharacter.asset_path && monopolyCharacter?.asset_path ? "pay uses locked monopoly main_character fallback" : "",
        !characterPath ? "pay main_character missing" : "",
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
