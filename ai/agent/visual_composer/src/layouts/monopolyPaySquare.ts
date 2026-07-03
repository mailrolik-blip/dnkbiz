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

export async function renderMonopolyPaySquare(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1080;
  const height = job.layout.height || 1080;
  const safe = Math.max(48, job.layout.safe_area || 64);
  const variant = normalizePayVariant(job.layout.variant || "pay_character_right");
  const colors = { primary: job.brand?.colors?.primary || "#19D47B", accent: job.brand?.colors?.accent || "#006DFF", dark: job.brand?.colors?.dark || "#101820", light: job.brand?.colors?.light || "#F4FBFF" };
  const headline = cleanPayHeadline(job.text_layer?.text || "НОВЫЙ МЕТОД");
  const sticker = job.text_layer?.sticker || job.text_layer?.subtitle || "MONOPOLY PAY";
  const isStory = height > width * 1.3;

  const background = await loadImageOrPlaceholder({ assetPath: job.background_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Pay background", kind: "background", colors, warnings: context.warnings });
  const character = await loadImageOrPlaceholder({ assetPath: job.character_layer?.asset_path || job.illustration_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 620, height: 560, label: "Pay character", kind: "illustration", colors, warnings: context.warnings });
  const titleImage = job.title_image_layer?.asset_path || job.title_image_layer?.generated_asset_path
    ? await loadImageOrPlaceholder({ assetPath: job.title_image_layer.asset_path || job.title_image_layer.generated_asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 700, height: 260, label: "Pay title", kind: "illustration", colors, warnings: context.warnings })
    : null;
  const logo = job.brand?.logo_path
    ? await loadImageOrPlaceholder({ assetPath: job.brand.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 240, height: 96, label: "Pay logo", kind: "logo", colors, warnings: context.warnings })
    : null;
  const icon = job.style_assets?.icon
    ? await loadImageOrPlaceholder({ assetPath: job.style_assets.icon, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 120, height: 120, label: "Pay icon", kind: "logo", colors, warnings: context.warnings })
    : null;
  context.warnings.push(`composer_usage background=${background.existed ? "asset" : "fallback"} character=${character.existed && (job.character_layer?.locked || job.illustration_layer?.locked) ? "asset" : character.existed ? "illustration_asset" : "fallback"} title=${titleImage?.existed ? "asset" : "composer_fallback"} logo=${logo?.existed ? "asset" : "none"} icon=${icon?.existed ? "asset" : "fallback"}`);
  if (!background.existed) context.warnings.push("quality_warning pay background missing; fallback background used.");
  if (!character.existed) context.warnings.push("quality_warning pay character missing; fallback illustration used.");

  const layout = payLayout(variant, width, height, safe, isStory, Boolean(character.existed && job.illustration_layer?.locked));
  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: payOverlay(width, height, colors, variant), left: 0, top: 0 },
  ];

  if (logo?.existed) {
    composites.push({ input: await sharp(logo.input).resize(190, 76, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: width - safe - 190, top: safe - 4 });
  }

  composites.push({ input: renderPillSvg(330, 66, sticker, variant === "pay_alert_bank" ? colors.accent : colors.dark), left: layout.sticker.x, top: layout.sticker.y });
  composites.push({ input: await sharp(character.input).resize(layout.character.width, layout.character.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: layout.character.x, top: layout.character.y });

  if (icon?.existed) {
    composites.push({ input: await sharp(icon.input).resize(104, 104, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: layout.chips.x, top: layout.chips.y });
  } else {
    composites.push({ input: paymentChips(colors.primary, colors.accent, colors.dark), left: layout.chips.x, top: layout.chips.y });
  }

  if (titleImage?.existed) {
    composites.push({ input: await sharp(titleImage.input).resize(layout.title.width, layout.title.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: layout.title.x, top: layout.title.y });
  } else {
  const title = renderFittedTextSvg({ width: layout.title.width, height: layout.title.height, text: headline, fontSize: layout.titleFontSize, minFontSize: 42, fill: "#ffffff", stroke: colors.dark, strokeWidth: 9, shadow: true, uppercase: true, maxLines: 2, align: layout.titleAlign, lineHeight: Math.round(layout.titleFontSize * 1.02) });
  if (title.wasShrunk) context.warnings.push(`quality_warning pay title resized to ${title.finalFontSize}.`);
  if (title.wasTruncated) context.warnings.push("quality_warning pay title too long; truncated.");
  const overlap = overlapRatio(layout.title, layout.character);
  if (overlap > 0.08) context.warnings.push(`quality_warning pay title/character overlap ratio=${overlap.toFixed(2)}.`);
  composites.push({ input: title.buffer, left: layout.title.x, top: layout.title.y });
  }

  if (job.text_layer?.cta) {
    const cta = renderFittedTextSvg({ width: layout.cta.width, height: layout.cta.height, text: job.text_layer.cta, fontSize: 30, minFontSize: 22, fill: colors.dark, uppercase: true, maxLines: 1 });
    composites.push({ input: renderPillSvg(layout.cta.width, layout.cta.height, job.text_layer.cta, colors.primary, colors.dark), left: layout.cta.x, top: layout.cta.y });
    if (cta.wasShrunk || cta.wasTruncated) context.warnings.push("quality_warning pay CTA fitted.");
  }

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}

function normalizePayVariant(value: string): string {
  const aliases: Record<string, string> = {
    pay_square_v1: "pay_character_right",
    pay_square_method_card: "pay_method_card",
    pay_square_bank_alert: "pay_alert_bank",
    pay_character_right_title_left: "pay_character_right",
    pay_character_center_method: "pay_character_center",
    pay_method_card_wide: "pay_method_card",
    pay_alert_bank_wide: "pay_alert_bank",
  };
  return aliases[value] || value;
}

function payLayout(variant: string, width: number, height: number, safe: number, isStory: boolean, hasLockedCharacter: boolean) {
  if (variant === "pay_character_center") {
    return { title: { x: safe, y: isStory ? 235 : 150, width: width - safe * 2, height: 210 }, titleFontSize: isStory ? 92 : 78, titleAlign: "center" as const, character: { x: Math.round(width * 0.22), y: Math.round(height * 0.35), width: Math.round(width * 0.56), height: Math.round(height * 0.42) }, sticker: { x: safe, y: safe }, chips: { x: safe, y: Math.round(height * 0.78) }, cta: { x: safe, y: height - safe - 76, width: 460, height: 66 } };
  }
  if (variant === "pay_method_card") {
    return { title: { x: safe, y: Math.round(height * 0.16), width: Math.round(width * 0.62), height: 260 }, titleFontSize: 74, titleAlign: "left" as const, character: { x: Math.round(width * 0.48), y: Math.round(height * 0.34), width: Math.round(width * 0.44), height: Math.round(height * 0.42) }, sticker: { x: safe, y: safe }, chips: { x: safe, y: Math.round(height * 0.68) }, cta: { x: safe, y: height - safe - 76, width: 480, height: 66 } };
  }
  if (variant === "pay_alert_bank") {
    return { title: { x: safe, y: Math.round(height * 0.18), width: Math.round(width * 0.68), height: 250 }, titleFontSize: 70, titleAlign: "left" as const, character: { x: Math.round(width * 0.55), y: Math.round(height * 0.34), width: Math.round(width * 0.38), height: Math.round(height * 0.40) }, sticker: { x: safe, y: safe }, chips: { x: safe, y: Math.round(height * 0.72) }, cta: { x: safe, y: height - safe - 76, width: 500, height: 66 } };
  }
  if (variant === "pay_story_vertical") {
    return { title: { x: safe, y: Math.round(height * 0.14), width: width - safe * 2, height: 310 }, titleFontSize: 94, titleAlign: "center" as const, character: { x: Math.round(width * 0.20), y: Math.round(height * 0.43), width: Math.round(width * 0.60), height: Math.round(height * 0.36) }, sticker: { x: safe, y: safe }, chips: { x: safe, y: Math.round(height * 0.80) }, cta: { x: safe, y: height - safe - 82, width: 540, height: 72 } };
  }
  return { title: { x: safe, y: Math.round(height * 0.17), width: Math.round(width * 0.50), height: 260 }, titleFontSize: 76, titleAlign: "left" as const, character: { x: hasLockedCharacter ? Math.round(width * 0.54) : Math.round(width * 0.55), y: Math.round(height * 0.34), width: Math.round(width * (hasLockedCharacter ? 0.38 : 0.36)), height: Math.round(height * 0.42) }, sticker: { x: safe, y: safe }, chips: { x: safe, y: Math.round(height * 0.72) }, cta: { x: safe, y: height - safe - 76, width: 500, height: 66 } };
}

function cleanPayHeadline(value: string): string {
  return value.replace(/^MONOPOLY\s*PAY\s*[:\-]\s*/i, "").replace(/^МОНОПОЛ(ИЯ|ИИ)\s*ПЭЙ\s*[:\-]\s*/i, "").trim().toUpperCase();
}

function payOverlay(width: number, height: number, colors: { primary: string; accent: string; dark: string; light: string }, variant: string): Buffer {
  const leftShade = variant === "pay_character_right" || variant === "pay_method_card" || variant === "pay_alert_bank"
    ? `<linearGradient id="side" x1="0" x2="1"><stop stop-color="${colors.dark}" stop-opacity="0.70"/><stop offset="0.58" stop-color="${colors.dark}" stop-opacity="0.08"/><stop offset="1" stop-color="${colors.dark}" stop-opacity="0"/></linearGradient><rect width="${width}" height="${height}" fill="url(#side)"/>`
    : "";
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs>${leftShade}</defs><rect width="${width}" height="${height}" fill="${colors.dark}" opacity="0.20"/><circle cx="${width * 0.84}" cy="${height * 0.16}" r="120" fill="${colors.primary}" opacity="0.22"/><circle cx="${width * 0.75}" cy="${height * 0.78}" r="170" fill="${colors.accent}" opacity="0.16"/></svg>`);
}

function paymentChips(primary: string, accent: string, dark: string): Buffer {
  return Buffer.from(`<svg width="590" height="126" viewBox="0 0 590 126" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="170" height="76" rx="24" fill="#ffffff" opacity="0.94"/><rect x="196" y="28" width="170" height="76" rx="24" fill="${primary}" opacity="0.96"/><rect x="392" y="0" width="170" height="76" rx="24" fill="${accent}" opacity="0.96"/><text x="85" y="39" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" fill="${dark}">BANK</text><text x="281" y="67" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" fill="${dark}">PAY</text><text x="477" y="39" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" fill="#ffffff">CARD</text></svg>`);
}

function overlapRatio(a: Box, b: Box): number {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (x * y) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}
