import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg } from "../utils/renderText";
import { resolvePlacementPreset, type LayerBox } from "./layerPlacement";
import { preprocessTitleImage, renderBrandTitleImageLayer } from "../titleImage/renderBrandTitleImage";

export async function renderMonopolySquare(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1920;
  const height = job.layout.height || 1080;
  const colors = {
    primary: job.brand?.colors?.primary || "#FFD000",
    accent: job.brand?.colors?.accent || "#FF4A00",
    dark: job.brand?.colors?.dark || "#121A20",
    light: job.brand?.colors?.light || "#FFF3C4",
  };
  const variant = normalizeMonopolyVariant(job.layout.variant || "monopoly_hero_title_left_character_right");
  const placement = resolvePlacementPreset(job, variant, { width, height });
  job.layout.preset_name = placement.name;
  job.layout.boxes = {
    title_image_box: placement.title_image_box,
    character_box: placement.character_box,
    logo_box: placement.logo_box,
    cta_box: placement.sticker_box,
  };

  const headline = cleanMonopolyHeadline(job.title_image_layer?.text || job.text_layer?.text || job.source_text || "MONOPOLY VISUAL");
  const sticker = job.text_layer?.sticker || "";
  const background = await loadImageOrPlaceholder({ assetPath: job.background_layer?.generated_asset_path || job.background_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Monopoly background", kind: "background", colors, warnings: context.warnings });
  const character = await loadImageOrPlaceholder({ assetPath: job.character_layer?.generated_asset_path || job.character_layer?.asset_path || job.illustration_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: placement.character_box.width, height: placement.character_box.height, label: "Monopoly character", kind: "illustration", colors, warnings: context.warnings });
  const titleAssetPath = job.title_image_layer?.generated_asset_path || job.title_image_layer?.asset_path;
  const titleSource = titleAssetPath
    ? await loadImageOrPlaceholder({ assetPath: titleAssetPath, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: placement.title_image_box.width, height: placement.title_image_box.height, label: "Monopoly title", kind: "illustration", colors, warnings: context.warnings })
    : null;
  const logo = job.logo_layer?.asset_path || job.brand?.logo_path
    ? await loadImageOrPlaceholder({ assetPath: job.logo_layer?.asset_path || job.brand?.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: placement.logo_box?.width || 220, height: placement.logo_box?.height || 96, label: "Logo", kind: "logo", colors, warnings: context.warnings })
    : null;

  context.warnings.push(`placement_preset=${placement.name}`);
  context.warnings.push(`title_image_box=${formatBox(placement.title_image_box)}`);
  context.warnings.push(`character_box=${formatBox(placement.character_box)}`);
  context.warnings.push(`composer_usage background=${background.existed ? "asset" : "fallback"} character=${character.existed && (job.character_layer?.locked || job.illustration_layer?.locked) ? "asset" : character.existed ? "illustration_asset" : "fallback"} title=${titleSource?.existed ? "asset" : "composer_fallback"} logo=${logo?.existed ? "asset" : "none"}`);
  if (!background.existed) context.warnings.push("quality_warning background missing; fallback background used.");
  if (!character.existed) context.warnings.push("character_missing");
  if (placement.character_box.height < height * 0.45) context.warnings.push("character_too_small");
  if (placement.title_image_box.width < width * 0.55) context.warnings.push("title_image_too_small");
  const overlap = overlapRatio(placement.title_image_box, faceZone(placement.character_box));
  if (overlap > 0.05) context.warnings.push(`character_overlaps_title_face_zone ratio=${overlap.toFixed(2)}`);

  const titlePolicy = process.env.VISUAL_TITLE_IMAGE_PROVIDER || "composer";
  context.warnings.push(`title_image_policy provider=${titlePolicy} title_style_reference_used=${job.style_assets?.title_style_reference ? "yes" : "no"}`);
  const titleResult = titleSource?.existed && titlePolicy !== "composer"
    ? await preprocessTitleImage(await sharp(titleSource.input).png().toBuffer(), placement.title_image_box, job.title_image_layer?.transparent_background)
    : await renderBrandTitleImageLayer({ text: headline, project_key: "monopoly", width: placement.title_image_box.width, height: placement.title_image_box.height, tags: styleTags(job), maxLines: 2 });
  const titleBuffer = titleResult.buffer;
  if ("metadata" in titleResult) {
    const preprocessWarnings = (titleResult as { warnings?: string[] }).warnings || [];
    job.title_image_layer = {
      ...(job.title_image_layer || { enabled: true, text: headline }),
      fit_metadata: "final_font_size" in titleResult.metadata ? titleResult.metadata : { warnings: preprocessWarnings },
    };
  }
  const titleWarnings = (titleResult as { warnings?: string[] }).warnings || (titleResult.metadata as { warnings?: string[] }).warnings || [];
  context.warnings.push(...titleWarnings);

  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: readableOverlay(width, height, colors.dark, placement.name), left: 0, top: 0 },
    { input: await sharp(character.input).resize(placement.character_box.width, placement.character_box.height, { fit: "contain", background: transparent() }).png().toBuffer(), left: placement.character_box.x, top: placement.character_box.y },
    { input: titleBuffer, left: placement.title_image_box.x, top: placement.title_image_box.y },
  ];

  if (logo?.existed && placement.logo_box) {
    composites.push({ input: await sharp(logo.input).resize(placement.logo_box.width, placement.logo_box.height, { fit: "contain", background: transparent() }).png().toBuffer(), left: placement.logo_box.x, top: placement.logo_box.y });
  }
  if ((sticker || placement.name.includes("banner")) && placement.sticker_box) {
    composites.push({ input: renderPillSvg(placement.sticker_box.width, placement.sticker_box.height, sticker || "НОВЫЙ ПОСТ", colors.accent), left: placement.sticker_box.x, top: placement.sticker_box.y });
  }

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: placement.name, warnings: context.warnings };
}

function normalizeMonopolyVariant(value: string): string {
  const aliases: Record<string, string> = {
    monopoly_square_title_top: "monopoly_title_top_character_bottom_right",
    monopoly_square_title_bottom: "monopoly_title_top_character_bottom_right",
    monopoly_square_character_center: "monopoly_title_top_character_bottom_right",
    monopoly_sticker_style: "monopoly_banner_like_reference",
    monopoly_story_vertical: "monopoly_title_top_character_bottom_right",
    character_right_title_left: "monopoly_hero_title_left_character_right",
    character_left_title_right: "monopoly_hero_title_left_character_right",
    character_center_title_top: "monopoly_title_top_character_bottom_right",
    character_center_bottom: "monopoly_title_top_character_bottom_right",
    poster_sticker_style: "monopoly_banner_like_reference",
  };
  return aliases[value] || value;
}

function cleanMonopolyHeadline(value: string): string {
  return value.replace(/^МОНОПОЛ(ИЯ|ИИ)\s*[:\-]\s*/i, "").replace(/^MONOPOLY\s*[:\-]\s*/i, "").trim().toUpperCase();
}

function readableOverlay(width: number, height: number, dark: string, variant: string): Buffer {
  const sideGradient = `<linearGradient id="side" x1="0" x2="1"><stop stop-color="${dark}" stop-opacity="0.52"/><stop offset="0.58" stop-color="${dark}" stop-opacity="0.09"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></linearGradient><rect width="${width}" height="${height}" fill="url(#side)"/>`;
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs>${sideGradient}<linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${dark}" stop-opacity="0.34"/><stop offset="0.46" stop-color="${dark}" stop-opacity="0.03"/><stop offset="1" stop-color="${dark}" stop-opacity="0.38"/></linearGradient></defs><rect width="${width}" height="${height}" fill="${dark}" opacity="${variant.includes("reference") ? "0.10" : "0.15"}"/><rect width="${width}" height="${height}" fill="url(#v)"/></svg>`);
}

function overlapRatio(a: LayerBox, b: LayerBox): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (x * y) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}

function faceZone(box: LayerBox): LayerBox {
  return { x: box.x + Math.round(box.width * 0.18), y: box.y, width: Math.round(box.width * 0.64), height: Math.round(box.height * 0.36) };
}

function formatBox(box: LayerBox): string {
  return `${box.x},${box.y},${box.width}x${box.height}`;
}

function styleTags(job: VisualJob): string[] {
  return [job.style_assets?.title_style_reference ? "title_style_reference" : "", ...(job.title_image_layer?.warnings || [])].filter(Boolean);
}

function transparent() {
  return { r: 0, g: 0, b: 0, alpha: 0 };
}
