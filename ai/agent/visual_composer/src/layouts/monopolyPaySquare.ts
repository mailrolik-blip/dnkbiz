import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg, renderTextSvg } from "../utils/renderText";

export async function renderMonopolyPaySquare(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1080;
  const height = job.layout.height || 1080;
  const safe = job.layout.safe_area || 64;
  const variant = job.layout.variant || "pay_square_v1";
  const colors = { primary: job.brand?.colors?.primary || "#18D47B", accent: job.brand?.colors?.accent || "#006DFF", dark: job.brand?.colors?.dark || "#101820", light: job.brand?.colors?.light || "#F4FBFF" };
  const headline = job.text_layer?.text || "НОВЫЙ МЕТОД";
  const sticker = job.text_layer?.sticker || job.text_layer?.subtitle || "MONOPOLY PAY";
  const isStory = height > width * 1.3;

  const background = await loadImageOrPlaceholder({ assetPath: job.background_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Pay background", kind: "background", colors, warnings: context.warnings });
  const illustration = await loadImageOrPlaceholder({ assetPath: job.illustration_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 650, height: 520, label: "Payment visual", kind: "illustration", colors, warnings: context.warnings });
  const logo = await loadImageOrPlaceholder({ assetPath: job.brand?.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 240, height: 96, label: "Pay logo", kind: "logo", colors, warnings: context.warnings });
  const icon = await loadImageOrPlaceholder({ assetPath: job.style_assets?.icon, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 120, height: 120, label: "Pay icon", kind: "logo", colors, warnings: context.warnings });
  context.warnings.push(`composer_usage background=${background.existed ? "asset" : "fallback"} character=${illustration.existed && job.illustration_layer?.locked ? "asset" : illustration.existed ? "illustration_asset" : "fallback"} logo=${logo.existed ? "asset" : "fallback"} icon=${icon.existed ? "asset" : "fallback"}`);

  const titleTop = isStory ? 270 : variant === "pay_square_bank_alert" ? 238 : 188;
  const illustrationTop = isStory ? 760 : variant === "pay_square_method_card" ? 438 : 405;
  const illustrationLeft = job.illustration_layer?.locked ? Math.round(width * 0.43) : Math.round(width * 0.34);
  const titleWidth = job.illustration_layer?.locked ? Math.round(width * 0.58) : width - safe * 2;
  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="${colors.dark}" opacity="0.22"/><rect x="${safe}" y="${safe}" width="${width - safe * 2}" height="${height - safe * 2}" rx="52" fill="#ffffff" opacity="0.13"/><circle cx="${width * 0.84}" cy="${height * 0.16}" r="130" fill="${colors.primary}" opacity="0.30"/><circle cx="${width * 0.78}" cy="${height * 0.78}" r="190" fill="${colors.accent}" opacity="0.2"/></svg>`), left: 0, top: 0 },
    { input: await sharp(logo.input).resize(220, 88, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: width - safe - 220, top: safe - 6 },
    { input: renderPillSvg(360, 70, sticker, variant === "pay_square_bank_alert" ? colors.accent : colors.dark), left: safe, top: safe },
    { input: await sharp(illustration.input).resize(Math.round(width * (job.illustration_layer?.locked ? 0.50 : 0.6)), Math.round(height * 0.43), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: illustrationLeft, top: illustrationTop },
    { input: icon.existed ? await sharp(icon.input).resize(112, 112, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() : paymentChips(colors.primary, colors.accent, colors.dark), left: safe, top: Math.min(height - 270, Math.round(height * 0.74)) },
    { input: renderTextSvg({ width: titleWidth, height: isStory ? 320 : 270, text: headline, fontSize: isStory ? 98 : 82, fill: "#ffffff", stroke: colors.dark, strokeWidth: 9, shadow: true, uppercase: true, maxLines: 2 }), left: safe, top: titleTop },
  ];

  if (job.text_layer?.cta) composites.push({ input: renderPillSvg(500, 72, job.text_layer.cta, colors.primary), left: safe, top: height - safe - 82 });
  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}

function paymentChips(primary: string, accent: string, dark: string): Buffer {
  return Buffer.from(`<svg width="590" height="150" viewBox="0 0 590 150" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="180" height="82" rx="28" fill="#ffffff" opacity="0.94"/><rect x="205" y="34" width="180" height="82" rx="28" fill="${primary}" opacity="0.96"/><rect x="410" y="0" width="180" height="82" rx="28" fill="${accent}" opacity="0.96"/><text x="90" y="47" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="${dark}">BANK</text><text x="295" y="82" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="${dark}">PAY</text><text x="500" y="47" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#ffffff">CARD</text></svg>`);
}
