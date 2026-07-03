import type { OutputFormat, VisualJob } from "../types";
import { parseRevisionInstruction } from "./parseRevisionInstruction";

const variantsByProject: Record<string, string[]> = {
  monopoly: ["character_center_title_top", "character_center_bottom", "character_right_title_left", "character_left_title_right", "poster_sticker_style"],
  monopoly_pay: ["pay_character_right_title_left", "pay_character_center_method", "pay_method_card_wide", "pay_alert_bank_wide", "pay_story_vertical"],
  gorilla_hockey: ["hockey_poster_v1", "hockey_poster_photo_v1", "hockey_training_recruitment", "hockey_print_a4_v1", "hockey_print_a5_v1"],
  casper: ["casper_news_square", "casper_warning_square", "casper_subscribe_square", "casper_contest_square"],
  dnk: ["simple_overlay"],
};

export function reviseLayout(job: VisualJob, instruction: string): { job: VisualJob; warnings: string[] } {
  const parsed = parseRevisionInstruction(instruction);
  const next: VisualJob = structuredClone(job);
  const variants = variantsByProject[job.project_key] || [job.layout.variant];
  let variant = normalizeRequestedVariant(job.project_key, parsed.requested_variant);

  if (!variant || variant === "next" || !variants.includes(variant)) {
    const currentIndex = variants.indexOf(job.layout.variant);
    variant = variants[(currentIndex + 1) % variants.length] || job.layout.variant;
  }

  next.layout = { ...next.layout, variant };
  const warnings = variants.includes(parsed.requested_variant || "") || !parsed.requested_variant ? [] : [`Requested layout is not implemented; used ${variant}.`];
  warnings.push(`regenerate changed layout from ${job.layout.variant} to ${variant}.`);
  return { job: next, warnings };
}

function normalizeRequestedVariant(projectKey: string, variant?: string): string | undefined {
  if (!variant) return variant;
  const aliases: Record<string, Record<string, string>> = {
    monopoly: {
      monopoly_square_title_top: "character_center_title_top",
      monopoly_square_title_bottom: "character_center_bottom",
      monopoly_square_character_center: "character_center_bottom",
      monopoly_sticker_style: "poster_sticker_style",
    },
    monopoly_pay: {
      pay_square_v1: "pay_character_right",
      pay_square_method_card: "pay_method_card",
      pay_square_bank_alert: "pay_alert_bank",
      pay_character_right: "pay_character_right_title_left",
      pay_character_center: "pay_character_center_method",
      pay_method_card: "pay_method_card_wide",
      pay_alert_bank: "pay_alert_bank_wide",
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

  if (format === "story") {
    next.layout = { ...next.layout, variant: storyVariant(job), width: 1080, height: 1920 };
  } else if (format === "vk_post") {
    next.layout = { ...next.layout, width: 1080, height: job.project_key === "gorilla_hockey" ? 1350 : 1080 };
  } else if (format === "print_a4") {
    next.visual_mode = "hockey_print_layout";
    next.layout = { ...next.layout, variant: "hockey_print_a4_v1", width: 2480, height: 3508, safe_area: 180 };
  } else if (format === "print_a5") {
    next.visual_mode = "hockey_print_layout";
    next.layout = { ...next.layout, variant: "hockey_print_a5_v1", width: 1748, height: 2480, safe_area: 140 };
  } else {
    next.layout = { ...next.layout, width: 1080, height: 1080 };
  }

  return { job: next, warnings };
}

function storyVariant(job: VisualJob): string {
  if (job.project_key === "monopoly") return "character_center_title_top";
  if (job.project_key === "monopoly_pay") return "pay_story_vertical";
  return job.layout.variant;
}
