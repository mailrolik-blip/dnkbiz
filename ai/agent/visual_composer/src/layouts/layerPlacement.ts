import type { VisualJob, VisualProjectKey } from "../types";

export type LayerAnchor = "top_left" | "top_center" | "top_right" | "center" | "bottom_left" | "bottom_center" | "bottom_right";
export type LayerFit = "contain" | "cover";

export interface LayerPlacement {
  x: number;
  y: number;
  width?: number;
  height?: number;
  anchor?: LayerAnchor;
  fit?: LayerFit;
  z_index?: number;
  opacity?: number;
}

export interface LayerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacementPreset {
  name: string;
  project_key: VisualProjectKey;
  title_image: LayerPlacement;
  character: LayerPlacement;
  logo?: LayerPlacement;
  sticker?: LayerPlacement;
  cta?: LayerPlacement;
  chips?: LayerPlacement;
  notes?: string;
}

export interface ResolvedPlacementPreset {
  name: string;
  title_image_box: LayerBox;
  character_box: LayerBox;
  logo_box?: LayerBox;
  sticker_box?: LayerBox;
  cta_box?: LayerBox;
  chips_box?: LayerBox;
}

const monopolyWidePresets: PlacementPreset[] = [
  {
    name: "monopoly_hero_title_left_character_right",
    project_key: "monopoly",
    title_image: { x: 0.055, y: 0.15, width: 0.64, height: 0.36, anchor: "top_left", fit: "contain", z_index: 50 },
    character: { x: 0.70, y: 0.92, width: 0.31, height: 0.66, anchor: "bottom_center", fit: "contain", z_index: 40 },
    logo: { x: 0.045, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.60, y: 0.09, width: 0.20, height: 0.075, anchor: "top_left", fit: "contain", z_index: 70 },
    notes: "Big title left, strong ded on right.",
  },
  {
    name: "monopoly_big_title_center_character_right",
    project_key: "monopoly",
    title_image: { x: 0.07, y: 0.13, width: 0.70, height: 0.40, anchor: "top_left", fit: "contain", z_index: 50 },
    character: { x: 0.76, y: 0.94, width: 0.30, height: 0.62, anchor: "bottom_center", fit: "contain", z_index: 42 },
    logo: { x: 0.045, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.72, y: 0.14, width: 0.18, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
  },
  {
    name: "monopoly_title_top_character_bottom_right",
    project_key: "monopoly",
    title_image: { x: 0.50, y: 0.10, width: 0.75, height: 0.30, anchor: "top_center", fit: "contain", z_index: 50 },
    character: { x: 0.76, y: 0.94, width: 0.34, height: 0.58, anchor: "bottom_center", fit: "contain", z_index: 42 },
    logo: { x: 0.045, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.06, y: 0.43, width: 0.23, height: 0.075, anchor: "top_left", fit: "contain", z_index: 70 },
  },
  {
    name: "monopoly_banner_like_reference",
    project_key: "monopoly",
    title_image: { x: 0.06, y: 0.18, width: 0.67, height: 0.42, anchor: "top_left", fit: "contain", z_index: 55 },
    character: { x: 0.77, y: 0.96, width: 0.34, height: 0.70, anchor: "bottom_center", fit: "contain", z_index: 44 },
    logo: { x: 0.045, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.58, y: 0.12, width: 0.21, height: 0.08, anchor: "top_left", fit: "contain", z_index: 70 },
    notes: "Reference-like Photoshop banner: title dominates, ded right, clean center.",
  },
];

const payWidePresets: PlacementPreset[] = [
  {
    name: "pay_title_left_character_right",
    project_key: "monopoly_pay",
    title_image: { x: 0.055, y: 0.16, width: 0.60, height: 0.34, anchor: "top_left", fit: "contain", z_index: 50 },
    character: { x: 0.73, y: 0.92, width: 0.32, height: 0.60, anchor: "bottom_center", fit: "contain", z_index: 40 },
    logo: { x: 0.84, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.055, y: 0.055, width: 0.20, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
    chips: { x: 0.06, y: 0.72, width: 0.32, height: 0.13, anchor: "top_left", fit: "contain", z_index: 60 },
    cta: { x: 0.055, y: 0.86, width: 0.28, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
  },
  {
    name: "pay_method_title_center_character_right",
    project_key: "monopoly_pay",
    title_image: { x: 0.43, y: 0.14, width: 0.66, height: 0.34, anchor: "top_center", fit: "contain", z_index: 50 },
    character: { x: 0.76, y: 0.93, width: 0.30, height: 0.58, anchor: "bottom_center", fit: "contain", z_index: 40 },
    logo: { x: 0.84, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.055, y: 0.055, width: 0.20, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
    chips: { x: 0.07, y: 0.67, width: 0.34, height: 0.13, anchor: "top_left", fit: "contain", z_index: 60 },
    cta: { x: 0.055, y: 0.84, width: 0.30, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
  },
  {
    name: "pay_alert_title_big_icons_bottom",
    project_key: "monopoly_pay",
    title_image: { x: 0.06, y: 0.16, width: 0.68, height: 0.38, anchor: "top_left", fit: "contain", z_index: 50 },
    character: { x: 0.78, y: 0.93, width: 0.28, height: 0.56, anchor: "bottom_center", fit: "contain", z_index: 40 },
    logo: { x: 0.84, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.055, y: 0.055, width: 0.22, height: 0.075, anchor: "top_left", fit: "contain", z_index: 70 },
    chips: { x: 0.06, y: 0.72, width: 0.36, height: 0.14, anchor: "top_left", fit: "contain", z_index: 60 },
    cta: { x: 0.055, y: 0.87, width: 0.30, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
  },
  {
    name: "pay_reference_style_wide",
    project_key: "monopoly_pay",
    title_image: { x: 0.055, y: 0.18, width: 0.62, height: 0.38, anchor: "top_left", fit: "contain", z_index: 52 },
    character: { x: 0.74, y: 0.95, width: 0.34, height: 0.66, anchor: "bottom_center", fit: "contain", z_index: 42 },
    logo: { x: 0.84, y: 0.055, width: 0.12, height: 0.075, anchor: "top_left", fit: "contain", z_index: 80 },
    sticker: { x: 0.055, y: 0.055, width: 0.21, height: 0.075, anchor: "top_left", fit: "contain", z_index: 70 },
    chips: { x: 0.055, y: 0.72, width: 0.36, height: 0.14, anchor: "top_left", fit: "contain", z_index: 60 },
    cta: { x: 0.055, y: 0.87, width: 0.30, height: 0.07, anchor: "top_left", fit: "contain", z_index: 70 },
  },
];

const legacyAliases: Record<string, string> = {
  character_right_title_left: "monopoly_hero_title_left_character_right",
  character_left_title_right: "monopoly_hero_title_left_character_right",
  character_center_title_top: "monopoly_title_top_character_bottom_right",
  character_center_bottom: "monopoly_title_top_character_bottom_right",
  poster_sticker_style: "monopoly_banner_like_reference",
  pay_character_right: "pay_title_left_character_right",
  pay_character_right_title_left: "pay_title_left_character_right",
  pay_character_center: "pay_method_title_center_character_right",
  pay_character_center_method: "pay_method_title_center_character_right",
  pay_method_card: "pay_method_title_center_character_right",
  pay_method_card_wide: "pay_method_title_center_character_right",
  pay_alert_bank: "pay_alert_title_big_icons_bottom",
  pay_alert_bank_wide: "pay_alert_title_big_icons_bottom",
  pay_story_vertical: "pay_reference_style_wide",
};

export function getPlacementPreset(projectKey: VisualProjectKey, variant: string): PlacementPreset {
  const presets = projectKey === "monopoly_pay" ? payWidePresets : monopolyWidePresets;
  const name = legacyAliases[variant] || variant;
  return presets.find((preset) => preset.name === name) || presets[0];
}

export function listPlacementPresetNames(projectKey: VisualProjectKey): string[] {
  return (projectKey === "monopoly_pay" ? payWidePresets : monopolyWidePresets).map((preset) => preset.name);
}

export function nextPlacementPresetName(projectKey: VisualProjectKey, current: string): string {
  const names = listPlacementPresetNames(projectKey);
  const normalized = getPlacementPreset(projectKey, current).name;
  const index = names.indexOf(normalized);
  return names[(index + 1) % names.length] || names[0];
}

export function resolvePlacementPreset(job: VisualJob, variant: string, canvas: { width: number; height: number }): ResolvedPlacementPreset {
  const preset = getPlacementPreset(job.project_key, variant);
  const titleSafe = titleSafePadding(job.project_key, canvas);
  const title = clampBoxToCanvas(resolveLayerBox(job.title_image_layer?.placement || preset.title_image, canvas), canvas, titleSafe);
  const character = clampBoxToCanvas(resolveLayerBox(job.character_layer?.placement || preset.character, canvas), canvas, 0);
  return {
    name: preset.name,
    title_image_box: title,
    character_box: character,
    logo_box: preset.logo ? resolveLayerBox(job.logo_layer?.placement || preset.logo, canvas) : undefined,
    sticker_box: preset.sticker ? resolveLayerBox(preset.sticker, canvas) : undefined,
    cta_box: preset.cta ? resolveLayerBox(preset.cta, canvas) : undefined,
    chips_box: preset.chips ? resolveLayerBox(preset.chips, canvas) : undefined,
  };
}

export function resolveLayerBox(placement: LayerPlacement, canvas: { width: number; height: number }): LayerBox {
  const width = toPixels(placement.width ?? 0.2, canvas.width);
  const height = toPixels(placement.height ?? 0.2, canvas.height);
  const anchor = placement.anchor || "top_left";
  const originX = toPixels(placement.x, canvas.width);
  const originY = toPixels(placement.y, canvas.height);
  let x = originX;
  let y = originY;
  if (anchor.includes("center")) x -= width / 2;
  if (anchor.includes("right")) x -= width;
  if (anchor.startsWith("bottom")) y -= height;
  if (anchor === "center") y -= height / 2;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function clampBoxToCanvas(box: LayerBox, canvas: { width: number; height: number }, safePadding: number): LayerBox {
  const maxWidth = Math.max(24, canvas.width - safePadding * 2);
  const maxHeight = Math.max(24, canvas.height - safePadding * 2);
  const scale = Math.min(1, maxWidth / Math.max(1, box.width), maxHeight / Math.max(1, box.height));
  const width = Math.max(24, Math.round(box.width * scale));
  const height = Math.max(24, Math.round(box.height * scale));
  return {
    x: clamp(box.x, safePadding, canvas.width - safePadding - width),
    y: clamp(box.y, safePadding, canvas.height - safePadding - height),
    width,
    height,
  };
}

export function boxToTopLeftPlacement(box: LayerBox, canvas: { width: number; height: number }): LayerPlacement {
  return {
    x: box.x / canvas.width,
    y: box.y / canvas.height,
    width: box.width / canvas.width,
    height: box.height / canvas.height,
    anchor: "top_left",
    fit: "contain",
  };
}

export function nudgePlacement(base: LayerPlacement | undefined, preset: LayerPlacement, command: string, layer: "title" | "character"): LayerPlacement | null {
  const lower = command.toLowerCase();
  const next = { ...(base || preset) };
  let changed = false;
  const scaleStep = layer === "title" ? 0.08 : 0.07;
  const moveStep = 0.045;
  if (/увелич|крупн|растяни|больше/.test(lower)) {
    next.width = Math.min((next.width ?? preset.width ?? 0.3) + scaleStep, layer === "title" ? 0.82 : 0.45);
    next.height = Math.min((next.height ?? preset.height ?? 0.3) + scaleStep, layer === "title" ? 0.50 : 0.78);
    changed = true;
  }
  if (/меньш|уменьш|обрез/.test(lower)) {
    next.width = Math.max((next.width ?? preset.width ?? 0.3) - scaleStep, layer === "title" ? 0.38 : 0.18);
    next.height = Math.max((next.height ?? preset.height ?? 0.3) - scaleStep, layer === "title" ? 0.18 : 0.34);
    if (layer === "title") {
      next.x = Math.max(0.04, Math.min(next.x, 0.10));
      next.y = Math.max(0.06, Math.min(next.y, 0.18));
    }
    changed = true;
  }
  if (/левее|влево|слева/.test(lower)) {
    next.x = Math.max(0.03, next.x - moveStep);
    changed = true;
  }
  if (/правее|вправо|справа/.test(lower)) {
    next.x = Math.min(0.94, next.x + moveStep);
    changed = true;
  }
  if (/выше|наверх|вверх/.test(lower)) {
    next.y = Math.max(0.03, next.y - moveStep);
    changed = true;
  }
  if (/ниже|вниз/.test(lower)) {
    next.y = Math.min(0.96, next.y + moveStep);
    changed = true;
  }
  if (!changed) return null;
  return next;
}

function toPixels(value: number, size: number): number {
  return Math.abs(value) <= 1 ? value * size : value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function titleSafePadding(projectKey: VisualProjectKey, canvas: { width: number; height: number }): number {
  if (projectKey === "monopoly_pay" && canvas.width >= 1600) return 80;
  if (projectKey === "monopoly" && canvas.width >= 1600) return 72;
  return 48;
}
