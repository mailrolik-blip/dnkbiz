import type { OutputFormat, VisualProjectKey } from "../types";

export const outputPresetSizes: Record<OutputFormat, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  vk_post: { width: 1080, height: 1350 },
  wide_1920x1080: { width: 1920, height: 1080 },
  square_1024x1024: { width: 1024, height: 1024 },
  square_1080x1080: { width: 1080, height: 1080 },
  vertical_1080x1350: { width: 1080, height: 1350 },
  story_1080x1920: { width: 1080, height: 1920 },
  print_a4: { width: 2480, height: 3508 },
  print_a5: { width: 1748, height: 2480 },
};

export const defaultOutputFormatByProject: Record<VisualProjectKey, OutputFormat> = {
  monopoly: "wide_1920x1080",
  monopoly_pay: "wide_1920x1080",
  casper: "wide_1920x1080",
  gorilla_hockey: "square_1024x1024",
  dnk: "wide_1920x1080",
};

export function sizeForOutputFormat(format: OutputFormat): { width: number; height: number } {
  return outputPresetSizes[format] || outputPresetSizes.square_1080x1080;
}
