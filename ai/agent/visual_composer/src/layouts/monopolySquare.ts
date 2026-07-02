import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg, renderTextSvg } from "../utils/renderText";

export async function renderMonopolySquare(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1080;
  const height = job.layout.height || 1080;
  const safe = job.layout.safe_area || 64;
  const colors = {
    primary: job.brand?.colors?.primary || "#FFD000",
    accent: job.brand?.colors?.accent || "#FF4A00",
    dark: job.brand?.colors?.dark || "#121A20",
    light: job.brand?.colors?.light || "#FFF3C4",
  };
  const variant = job.layout.variant || "monopoly_square_title_top";
  const headline = job.text_layer?.text || job.source_text || "MONOPOLY VISUAL";
  const subtitle = job.text_layer?.subtitle || job.text_layer?.sticker || "";
  const isStory = height > width * 1.3;

  const background = await loadImageOrPlaceholder({ assetPath: job.background_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Monopoly background", kind: "background", colors, warnings: context.warnings });
  const illustration = await loadImageOrPlaceholder({ assetPath: job.illustration_layer?.asset_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: Math.round(width * 0.72), height: Math.round(height * 0.52), label: "Monopoly illustration", kind: "illustration", colors, warnings: context.warnings });
  const logo = await loadImageOrPlaceholder({ assetPath: job.brand?.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 220, height: 96, label: "DNK", kind: "logo", colors, warnings: context.warnings });

  const composites: sharp.OverlayOptions[] = [];
  composites.push({ input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 });
  composites.push({ input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="#000000" opacity="0.10"/><circle cx="${width * 0.14}" cy="${height * 0.12}" r="${width * 0.15}" fill="#ffffff" opacity="0.12"/><circle cx="${width * 0.88}" cy="${height * 0.75}" r="${width * 0.2}" fill="#ffffff" opacity="0.1"/></svg>`), left: 0, top: 0 });
  composites.push({ input: await sharp(logo.input).resize(190, 84, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: safe, top: safe });

  const titleAtBottom = variant === "monopoly_square_title_bottom" || variant === "monopoly_square_character_center";
  const stickerStyle = variant === "monopoly_sticker_style";
  const titleTop = isStory ? 220 : titleAtBottom ? Math.round(height * 0.74) : stickerStyle ? 142 : 205;
  const titleHeight = isStory ? 260 : 190;
  const illustrationWidth = Math.round(width * (variant === "monopoly_square_character_center" ? 0.78 : 0.72));
  const illustrationHeight = Math.round(height * (isStory ? 0.48 : 0.54));
  const illustrationTop = titleAtBottom ? Math.round(height * 0.18) : isStory ? Math.round(height * 0.42) : Math.round(height * 0.38);

  composites.push({ input: await sharp(illustration.input).resize(illustrationWidth, illustrationHeight, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: Math.round((width - illustrationWidth) / 2), top: illustrationTop });

  if (stickerStyle || job.text_layer?.sticker) {
    composites.push({ input: renderPillSvg(430, 76, job.text_layer?.sticker || "НОВОСТЬ", colors.accent), left: width - safe - 430, top: safe + 12 });
  }

  composites.push({ input: pseudo3dTitle(width - safe * 2, titleHeight, headline, colors.primary, colors.accent, colors.dark), left: safe, top: titleTop });

  if (subtitle && !job.text_layer?.sticker) {
    composites.push({ input: renderPillSvg(500, 74, subtitle, colors.dark), left: Math.round((width - 500) / 2), top: Math.min(height - 120, titleTop + titleHeight + 16) });
  }

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}

function pseudo3dTitle(width: number, height: number, text: string, primary: string, accent: string, dark: string): Buffer {
  const fontSize = height > 220 ? 92 : 72;
  const shadow = renderTextSvg({ width, height, text, fontSize, fill: accent, stroke: dark, strokeWidth: 14, shadow: true, uppercase: true, maxLines: 2 });
  const front = renderTextSvg({ width, height, text, fontSize, fill: primary, stroke: "#ffffff", strokeWidth: 5, uppercase: true, maxLines: 2 });
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,${shadow.toString("base64")}" x="10" y="12" width="${width}" height="${height}"/><image href="data:image/svg+xml;base64,${front.toString("base64")}" x="0" y="0" width="${width}" height="${height}"/></svg>`);
}
