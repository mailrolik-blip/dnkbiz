import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderFittedTextSvg, renderPillSvg } from "../utils/renderText";

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function renderMonopolySquare(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1080;
  const height = job.layout.height || 1080;
  const safe = Math.max(48, job.layout.safe_area || 64);
  const colors = {
    primary: job.brand?.colors?.primary || "#FFD000",
    accent: job.brand?.colors?.accent || "#FF4A00",
    dark: job.brand?.colors?.dark || "#121A20",
    light: job.brand?.colors?.light || "#FFF3C4",
  };
  const variant = normalizeMonopolyVariant(job.layout.variant || "character_center_title_top");
  const headline = cleanMonopolyHeadline(job.text_layer?.text || job.source_text || "MONOPOLY VISUAL");
  const sticker = job.text_layer?.sticker || "";
  const isStory = height > width * 1.3;

  const background = await loadImageOrPlaceholder({ assetPath: job.background_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Monopoly background", kind: "background", colors, warnings: context.warnings });
  const character = await loadImageOrPlaceholder({ assetPath: job.character_layer?.asset_path || job.illustration_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: Math.round(width * 0.55), height: Math.round(height * 0.55), label: "Monopoly character", kind: "illustration", colors, warnings: context.warnings });
  const titleImage = job.title_image_layer?.asset_path || job.title_image_layer?.generated_asset_path
    ? await loadImageOrPlaceholder({ assetPath: job.title_image_layer.asset_path || job.title_image_layer.generated_asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: Math.round(width * 0.58), height: Math.round(height * 0.25), label: "Monopoly title", kind: "illustration", colors, warnings: context.warnings })
    : null;
  const logo = job.brand?.logo_path
    ? await loadImageOrPlaceholder({ assetPath: job.brand.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 220, height: 96, label: "Logo", kind: "logo", colors, warnings: context.warnings })
    : null;
  context.warnings.push(`composer_usage background=${background.existed ? "asset" : "fallback"} character=${character.existed && (job.character_layer?.locked || job.illustration_layer?.locked) ? "asset" : character.existed ? "illustration_asset" : "fallback"} title=${titleImage?.existed ? "asset" : "composer_fallback"} logo=${logo?.existed ? "asset" : "none"}`);
  if (!background.existed) context.warnings.push("quality_warning background missing; fallback background used.");
  if (!character.existed) context.warnings.push("quality_warning character missing; fallback illustration used.");

  const layout = monopolyLayout(variant, width, height, safe, isStory);
  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: readableOverlay(width, height, colors.dark, variant), left: 0, top: 0 },
  ];

  if (logo?.existed) {
    composites.push({ input: await sharp(logo.input).resize(180, 80, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: safe, top: safe });
  }

  composites.push({
    input: await sharp(character.input).resize(layout.character.width, layout.character.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
    left: layout.character.x,
    top: layout.character.y,
  });

  if (sticker || variant === "poster_sticker_style") {
    const stickerText = sticker || "НОВЫЙ ПОСТ";
    composites.push({ input: renderPillSvg(360, 72, stickerText, colors.accent), left: layout.sticker.x, top: layout.sticker.y });
  }

  if (titleImage?.existed) {
    composites.push({ input: await sharp(titleImage.input).resize(layout.title.width, layout.title.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: layout.title.x, top: layout.title.y });
  } else {
  const title = renderFittedTextSvg({
    width: layout.title.width,
    height: layout.title.height,
    text: headline,
    fontSize: layout.titleFontSize,
    minFontSize: 46,
    fill: colors.primary,
    stroke: colors.dark,
    strokeWidth: 12,
    shadow: true,
    uppercase: true,
    maxLines: 2,
    lineHeight: Math.round(layout.titleFontSize * 1.02),
    align: layout.titleAlign,
  });
  if (title.wasShrunk) context.warnings.push(`quality_warning title resized to ${title.finalFontSize}.`);
  if (title.wasTruncated) context.warnings.push("quality_warning title too long; truncated.");
  const overlap = overlapRatio(layout.title, layout.character);
  if (overlap > 0.08) context.warnings.push(`quality_warning title/character overlap ratio=${overlap.toFixed(2)}.`);
  composites.push({ input: title.buffer, left: layout.title.x, top: layout.title.y });
  }

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}

function normalizeMonopolyVariant(value: string): string {
  const aliases: Record<string, string> = {
    monopoly_square_title_top: "character_center_title_top",
    monopoly_square_title_bottom: "character_center_bottom",
    monopoly_square_character_center: "character_center_bottom",
    monopoly_sticker_style: "poster_sticker_style",
    monopoly_story_vertical: "character_center_title_top",
  };
  return aliases[value] || value;
}

function monopolyLayout(variant: string, width: number, height: number, safe: number, isStory: boolean) {
  const titleTop = isStory ? Math.round(height * 0.12) : safe + 128;
  const characterHeight = Math.round(height * (isStory ? 0.46 : 0.48));
  const characterWidth = Math.round(width * 0.55);
  const titleFull: Box = { x: safe, y: titleTop, width: width - safe * 2, height: isStory ? 280 : 220 };
  const sticker = { x: width - safe - 360, y: safe + 10 };

  if (variant === "character_right_title_left") {
    return { title: { x: safe, y: Math.round(height * 0.18), width: Math.round(width * 0.55), height: 310 }, titleFontSize: 84, titleAlign: "left" as const, character: { x: Math.round(width * 0.48), y: Math.round(height * 0.28), width: Math.round(width * 0.46), height: characterHeight }, sticker };
  }
  if (variant === "character_left_title_right") {
    return { title: { x: Math.round(width * 0.42), y: Math.round(height * 0.18), width: Math.round(width * 0.52), height: 310 }, titleFontSize: 80, titleAlign: "right" as const, character: { x: safe, y: Math.round(height * 0.28), width: Math.round(width * 0.46), height: characterHeight }, sticker: { x: safe, y: safe + 10 } };
  }
  if (variant === "character_center_bottom") {
    return { title: { x: safe, y: Math.round(height * 0.70), width: width - safe * 2, height: 230 }, titleFontSize: 78, titleAlign: "center" as const, character: { x: Math.round((width - characterWidth) / 2), y: Math.round(height * 0.19), width: characterWidth, height: Math.round(height * 0.50) }, sticker };
  }
  if (variant === "poster_sticker_style") {
    return { title: { x: safe, y: Math.round(height * 0.15), width: Math.round(width * 0.72), height: 240 }, titleFontSize: 78, titleAlign: "left" as const, character: { x: Math.round(width * 0.30), y: Math.round(height * 0.33), width: Math.round(width * 0.58), height: Math.round(height * 0.48) }, sticker };
  }
  return { title: titleFull, titleFontSize: 86, titleAlign: "center" as const, character: { x: Math.round((width - characterWidth) / 2), y: isStory ? Math.round(height * 0.42) : Math.round(height * 0.38), width: characterWidth, height: characterHeight }, sticker };
}

function cleanMonopolyHeadline(value: string): string {
  return value.replace(/^МОНОПОЛ(ИЯ|ИИ)\s*[:\-]\s*/i, "").replace(/^MONOPOLY\s*[:\-]\s*/i, "").trim().toUpperCase();
}

function readableOverlay(width: number, height: number, dark: string, variant: string): Buffer {
  const sideGradient = variant === "character_right_title_left"
    ? `<linearGradient id="side" x1="0" x2="1"><stop stop-color="${dark}" stop-opacity="0.62"/><stop offset="0.62" stop-color="${dark}" stop-opacity="0.10"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></linearGradient><rect width="${width}" height="${height}" fill="url(#side)"/>`
    : variant === "character_left_title_right"
      ? `<linearGradient id="side" x1="1" x2="0"><stop stop-color="${dark}" stop-opacity="0.62"/><stop offset="0.62" stop-color="${dark}" stop-opacity="0.10"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></linearGradient><rect width="${width}" height="${height}" fill="url(#side)"/>`
      : "";
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs>${sideGradient}<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark}" stop-opacity="0.48"/><stop offset="0.38" stop-color="${dark}" stop-opacity="0.05"/><stop offset="1" stop-color="${dark}" stop-opacity="0.46"/></linearGradient></defs><rect width="${width}" height="${height}" fill="${dark}" opacity="0.18"/><rect width="${width}" height="${height}" fill="url(#v)"/></svg>`);
}

function overlapRatio(a: Box, b: Box): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (x * y) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}
