import type { OutputFormat, VisualJob } from "../types";
import { getPlacementPreset, listPlacementPresetNames, nextPlacementPresetName } from "../layouts/layerPlacement";
import { parseRevisionInstruction } from "./parseRevisionInstruction";

const variantsByProject: Record<string, string[]> = {
  monopoly: ["monopoly_hero_title_left_character_right", "monopoly_big_title_center_character_right", "monopoly_title_top_character_bottom_right", "monopoly_banner_like_reference"],
  monopoly_pay: ["pay_title_left_character_right", "pay_method_title_center_character_right", "pay_alert_title_big_icons_bottom", "pay_reference_style_wide"],
  gorilla_hockey: ["hockey_poster_v1", "hockey_poster_photo_v1", "hockey_training_recruitment", "hockey_print_a4_v1", "hockey_print_a5_v1"],
  casper: ["casper_news_square", "casper_warning_square", "casper_subscribe_square", "casper_contest_square"],
  dnk: ["simple_overlay"],
};

export function reviseLayout(job: VisualJob, instruction: string): { job: VisualJob; warnings: string[] } {
  const parsed = parseRevisionInstruction(instruction);
  const next: VisualJob = structuredClone(job);
  const variants = variantsByProject[job.project_key] || [job.layout.variant];
  let variant = normalizeRequestedVariant(job.project_key, parsed.requested_variant || detectPresetInstruction(job.project_key, instruction));

  if (!variant || variant === "next" || !variants.includes(variant)) {
    variant = nextPlacementPresetName(job.project_key, job.layout.variant);
    if (!variants.includes(variant)) {
      const currentIndex = variants.indexOf(job.layout.variant);
      variant = variants[(currentIndex + 1) % variants.length] || job.layout.variant;
    }
  }

  next.layout = { ...next.layout, variant, preset_name: variant };
  const warnings = variants.includes(parsed.requested_variant || "") || !parsed.requested_variant ? [] : [`Requested layout is not implemented; used ${variant}.`];
  warnings.push(`regenerate changed layout from ${job.layout.variant} to ${variant}.`);
  return { job: next, warnings };
}

function detectPresetInstruction(projectKey: string, instruction: string): string | undefined {
  const lower = instruction.toLowerCase();
  if (projectKey === "monopoly") {
    if (/пример|референс|обложк|баннер/.test(lower)) return "monopoly_banner_like_reference";
    if (/дед справа|персонаж справа|текст слева/.test(lower)) return "monopoly_hero_title_left_character_right";
    if (/заголовок крупно|крупно по центру/.test(lower)) return "monopoly_big_title_center_character_right";
    if (/заголовок сверху|текст сверху/.test(lower)) return "monopoly_title_top_character_bottom_right";
  }
  if (projectKey === "monopoly_pay") {
    if (/пример|референс|обложк|баннер/.test(lower)) return "pay_reference_style_wide";
    if (/банк|триггер|alert|алерт/.test(lower)) return "pay_alert_title_big_icons_bottom";
    if (/метод|яндекс|центр/.test(lower)) return "pay_method_title_center_character_right";
    if (/дед справа|персонаж справа|текст слева/.test(lower)) return "pay_title_left_character_right";
  }
  return undefined;
}

function normalizeRequestedVariant(projectKey: string, variant?: string): string | undefined {
  if (!variant) return variant;
  const aliases: Record<string, Record<string, string>> = {
    monopoly: {
      monopoly_square_title_top: "monopoly_title_top_character_bottom_right",
      monopoly_square_title_bottom: "monopoly_title_top_character_bottom_right",
      monopoly_square_character_center: "monopoly_title_top_character_bottom_right",
      monopoly_sticker_style: "monopoly_banner_like_reference",
      character_right_title_left: "monopoly_hero_title_left_character_right",
      character_left_title_right: "monopoly_hero_title_left_character_right",
      character_center_title_top: "monopoly_title_top_character_bottom_right",
      character_center_bottom: "monopoly_title_top_character_bottom_right",
      poster_sticker_style: "monopoly_banner_like_reference",
    },
    monopoly_pay: {
      pay_square_v1: "pay_title_left_character_right",
      pay_square_method_card: "pay_method_title_center_character_right",
      pay_square_bank_alert: "pay_alert_title_big_icons_bottom",
      pay_character_right: "pay_title_left_character_right",
      pay_character_right_title_left: "pay_title_left_character_right",
      pay_character_center: "pay_method_title_center_character_right",
      pay_character_center_method: "pay_method_title_center_character_right",
      pay_method_card: "pay_method_title_center_character_right",
      pay_method_card_wide: "pay_method_title_center_character_right",
      pay_alert_bank: "pay_alert_title_big_icons_bottom",
      pay_alert_bank_wide: "pay_alert_title_big_icons_bottom",
      pay_story_vertical: "pay_reference_style_wide",
    },
  };
  return aliases[projectKey]?.[variant] || variant;
}

export function reviseFormat(job: VisualJob, instruction: string, explicit?: OutputFormat): { job: VisualJob; warnings: string[] } {
  const parsed = parseRevisionInstruction(instruction);
  const format = explicit || parsed.requested_format || job.output_format;
  const next: VisualJob = structuredClone(job);
  next.output_format = format;
  const warnings: string[] = [];

  if (format === "story" || format === "story_1080x1920") {
    next.layout = { ...next.layout, variant: storyVariant(job), width: 1080, height: 1920 };
  } else if (format === "vk_post" || format === "vertical_1080x1350") {
    next.layout = { ...next.layout, width: 1080, height: job.project_key === "gorilla_hockey" ? 1350 : 1080 };
  } else if (format === "wide_1920x1080") {
    next.layout = { ...next.layout, variant: getPlacementPreset(job.project_key, job.layout.variant).name, width: 1920, height: 1080 };
  } else if (format === "print_a4") {
    next.visual_mode = "hockey_print_layout";
    next.layout = { ...next.layout, variant: "hockey_print_a4_v1", width: 2480, height: 3508, safe_area: 180 };
  } else if (format === "print_a5") {
    next.visual_mode = "hockey_print_layout";
    next.layout = { ...next.layout, variant: "hockey_print_a5_v1", width: 1748, height: 2480, safe_area: 140 };
  } else {
    next.layout = { ...next.layout, width: format === "square_1024x1024" ? 1024 : 1080, height: format === "square_1024x1024" ? 1024 : 1080 };
  }

  return { job: next, warnings };
}

function storyVariant(job: VisualJob): string {
  if (job.project_key === "monopoly") return "monopoly_title_top_character_bottom_right";
  if (job.project_key === "monopoly_pay") return "pay_reference_style_wide";
  return job.layout.variant;
}

export function availableProductionPresets(projectKey: string): string[] {
  return listPlacementPresetNames(projectKey as never);
}
