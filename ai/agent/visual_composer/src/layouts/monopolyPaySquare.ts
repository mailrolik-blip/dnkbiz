import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg } from "../utils/renderText";
import { resolvePlacementPreset, type LayerBox } from "./layerPlacement";
import { preprocessTitleImage, renderBrandTitleImage } from "../titleImage/renderBrandTitleImage";

export async function renderMonopolyPaySquare(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1920;
  const height = job.layout.height || 1080;
  const variant = normalizePayVariant(job.layout.variant || "pay_title_left_character_right");
  const placement = resolvePlacementPreset(job, variant, { width, height });
  job.layout.preset_name = placement.name;
  job.layout.boxes = { title_image_box: placement.title_image_box, character_box: placement.character_box, logo_box: placement.logo_box, cta_box: placement.cta_box };
  const colors = { primary: job.brand?.colors?.primary || "#19D47B", accent: job.brand?.colors?.accent || "#006DFF", dark: job.brand?.colors?.dark || "#101820", light: job.brand?.colors?.light || "#F4FBFF" };
  const headline = cleanPayHeadline(job.title_image_layer?.text || job.text_layer?.text || "НОВЫЙ МЕТОД");
  const sticker = job.text_layer?.sticker || job.text_layer?.subtitle || "MONOPOLY PAY";

  const background = await loadImageOrPlaceholder({ assetPath: job.background_layer?.generated_asset_path || job.background_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Pay background", kind: "background", colors, warnings: context.warnings });
  const character = await loadImageOrPlaceholder({ assetPath: job.character_layer?.generated_asset_path || job.character_layer?.asset_path || job.illustration_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: placement.character_box.width, height: placement.character_box.height, label: "Pay character", kind: "illustration", colors, warnings: context.warnings });
  const titleAssetPath = job.title_image_layer?.generated_asset_path || job.title_image_layer?.asset_path;
  const titleSource = titleAssetPath
    ? await loadImageOrPlaceholder({ assetPath: titleAssetPath, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: placement.title_image_box.width, height: placement.title_image_box.height, label: "Pay title", kind: "illustration", colors, warnings: context.warnings })
    : null;
  const logo = job.logo_layer?.asset_path || job.brand?.logo_path
    ? await loadImageOrPlaceholder({ assetPath: job.logo_layer?.asset_path || job.brand?.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: placement.logo_box?.width || 240, height: placement.logo_box?.height || 96, label: "Pay logo", kind: "logo", colors, warnings: context.warnings })
    : null;
  const icon = job.style_assets?.icon
    ? await loadImageOrPlaceholder({ assetPath: job.style_assets.icon, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 120, height: 120, label: "Pay icon", kind: "logo", colors, warnings: context.warnings })
    : null;

  context.warnings.push(`placement_preset=${placement.name}`);
  context.warnings.push(`title_image_box=${formatBox(placement.title_image_box)}`);
  context.warnings.push(`character_box=${formatBox(placement.character_box)}`);
  context.warnings.push(`composer_usage background=${background.existed ? "asset" : "fallback"} character=${character.existed && (job.character_layer?.locked || job.illustration_layer?.locked) ? "asset" : character.existed ? "illustration_asset" : "fallback"} title=${titleSource?.existed ? "asset" : "composer_fallback"} logo=${logo?.existed ? "asset" : "none"} icon=${icon?.existed ? "asset" : "fallback"}`);
  if (!background.existed) context.warnings.push("quality_warning pay background missing; fallback background used.");
  if (!character.existed) context.warnings.push("character_missing");
  if (placement.character_box.height < height * 0.45) context.warnings.push("character_too_small");
  if (placement.title_image_box.width < width * 0.55) context.warnings.push("title_image_too_small");
  const overlap = overlapRatio(placement.title_image_box, faceZone(placement.character_box));
  if (overlap > 0.05) context.warnings.push(`character_overlaps_title_face_zone ratio=${overlap.toFixed(2)}`);

  const titleBuffer = titleSource?.existed
    ? (await preprocessTitleImage(await sharp(titleSource.input).png().toBuffer(), placement.title_image_box, job.title_image_layer?.transparent_background)).buffer
    : await renderBrandTitleImage({ text: headline, project_key: "monopoly_pay", width: placement.title_image_box.width, height: placement.title_image_box.height, tags: styleTags(job) });

  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: payOverlay(width, height, colors, placement.name), left: 0, top: 0 },
    { input: await sharp(character.input).resize(placement.character_box.width, placement.character_box.height, { fit: "contain", background: transparent() }).png().toBuffer(), left: placement.character_box.x, top: placement.character_box.y },
    { input: titleBuffer, left: placement.title_image_box.x, top: placement.title_image_box.y },
  ];

  if (placement.sticker_box) composites.push({ input: renderPillSvg(placement.sticker_box.width, placement.sticker_box.height, sticker, colors.dark), left: placement.sticker_box.x, top: placement.sticker_box.y });
  if (placement.chips_box) {
    if (icon?.existed) composites.push({ input: await sharp(icon.input).resize(placement.chips_box.height, placement.chips_box.height, { fit: "contain", background: transparent() }).png().toBuffer(), left: placement.chips_box.x, top: placement.chips_box.y });
    else composites.push({ input: paymentChips(placement.chips_box.width, placement.chips_box.height, colors.primary, colors.accent, colors.dark), left: placement.chips_box.x, top: placement.chips_box.y });
  }
  if (logo?.existed && placement.logo_box) composites.push({ input: await sharp(logo.input).resize(placement.logo_box.width, placement.logo_box.height, { fit: "contain", background: transparent() }).png().toBuffer(), left: placement.logo_box.x, top: placement.logo_box.y });
  if (job.text_layer?.cta && placement.cta_box) composites.push({ input: renderPillSvg(placement.cta_box.width, placement.cta_box.height, job.text_layer.cta, colors.primary, colors.dark), left: placement.cta_box.x, top: placement.cta_box.y });

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: placement.name, warnings: context.warnings };
}

function normalizePayVariant(value: string): string {
  const aliases: Record<string, string> = {
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
  };
  return aliases[value] || value;
}

function cleanPayHeadline(value: string): string {
  return value.replace(/^MONOPOLY\s*PAY\s*[:\-]\s*/i, "").replace(/^МОНОПОЛ(ИЯ|ИИ)\s*ПЭЙ\s*[:\-]\s*/i, "").trim().toUpperCase();
}

function payOverlay(width: number, height: number, colors: { primary: string; accent: string; dark: string; light: string }, variant: string): Buffer {
  const shade = `<linearGradient id="side" x1="0" x2="1"><stop stop-color="${colors.dark}" stop-opacity="0.62"/><stop offset="0.58" stop-color="${colors.dark}" stop-opacity="0.08"/><stop offset="1" stop-color="${colors.dark}" stop-opacity="0"/></linearGradient><rect width="${width}" height="${height}" fill="url(#side)"/>`;
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs>${shade}</defs><rect width="${width}" height="${height}" fill="${colors.dark}" opacity="0.16"/><circle cx="${width * 0.86}" cy="${height * 0.17}" r="150" fill="${colors.primary}" opacity="0.19"/><circle cx="${width * 0.73}" cy="${height * 0.80}" r="210" fill="${colors.accent}" opacity="${variant.includes("alert") ? "0.20" : "0.14"}"/></svg>`);
}

function paymentChips(width: number, height: number, primary: string, accent: string, dark: string): Buffer {
  const chipW = Math.round(width * 0.29);
  const gap = Math.round(width * 0.06);
  const y = Math.round(height * 0.12);
  const h = Math.round(height * 0.62);
  const font = Math.max(24, Math.round(h * 0.42));
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="${y}" width="${chipW}" height="${h}" rx="24" fill="#ffffff" opacity="0.94"/><rect x="${chipW + gap}" y="${Math.round(y + height * 0.16)}" width="${chipW}" height="${h}" rx="24" fill="${primary}" opacity="0.96"/><rect x="${(chipW + gap) * 2}" y="${y}" width="${chipW}" height="${h}" rx="24" fill="${accent}" opacity="0.96"/><text x="${chipW / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="900" fill="${dark}">BANK</text><text x="${chipW + gap + chipW / 2}" y="${Math.round(y + height * 0.16) + h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="900" fill="${dark}">PAY</text><text x="${(chipW + gap) * 2 + chipW / 2}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="900" fill="#ffffff">CARD</text></svg>`);
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
