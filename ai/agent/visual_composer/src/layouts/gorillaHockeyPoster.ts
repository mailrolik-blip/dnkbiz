import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg, renderTextSvg } from "../utils/renderText";

export async function renderGorillaHockeyPoster(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1080;
  const height = job.layout.height || 1350;
  const safe = job.layout.safe_area || 64;
  const variant = job.layout.variant || "hockey_poster_v1";
  const colors = { primary: job.brand?.colors?.primary || "#E3202A", accent: job.brand?.colors?.accent || "#F6C500", dark: job.brand?.colors?.dark || "#090D12", light: job.brand?.colors?.light || "#F5F7FA" };
  const title = job.text_layer?.text || "ХОККЕЙНЫЙ ПОСТЕР";
  const subtitle = job.text_layer?.subtitle || "";
  const sticker = job.text_layer?.sticker || (variant === "hockey_training_recruitment" ? "НАБОР" : "GORILLA HOCKEY");
  const cta = job.text_layer?.cta || "ЗАПИСЬ ОТКРЫТА";
  const contacts = job.text_layer?.contacts || job.brand?.contacts || job.brand?.website || "";
  const backgroundAsset = job.background_layer?.asset_path || job.illustration_layer?.asset_path;

  const background = await loadImageOrPlaceholder({ assetPath: backgroundAsset, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: variant === "hockey_poster_photo_v1" ? "Uploaded hockey photo" : "Hockey poster base", kind: "background", colors, warnings: context.warnings });
  const logo = await loadImageOrPlaceholder({ assetPath: job.brand?.logo_path, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width: 180, height: 180, label: "Gorilla", kind: "logo", colors, warnings: context.warnings });

  const titleTop = Math.round(height * 0.6);
  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000000" stop-opacity="0.50"/><stop offset="42%" stop-color="#000000" stop-opacity="0.10"/><stop offset="100%" stop-color="#000000" stop-opacity="0.78"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#shade)"/><path d="M0 ${height * 0.66} L${width} ${height * 0.54} L${width} ${height} L0 ${height}Z" fill="${colors.dark}" opacity="0.88"/><rect x="0" y="0" width="${width}" height="128" fill="${colors.dark}" opacity="0.92"/><rect x="0" y="118" width="${width}" height="10" fill="${colors.primary}"/></svg>`), left: 0, top: 0 },
    { input: await sharp(logo.input).resize(110, 110, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: safe, top: 16 },
    { input: renderTextSvg({ width: 640, height: 80, text: "GORILLA HOCKEY", fontSize: 42, align: "left", x: 0, fill: "#ffffff", maxLines: 1 }), left: safe + 140, top: 26 },
    { input: renderPillSvg(330, 72, sticker, colors.primary), left: width - safe - 330, top: 28 },
    { input: renderTextSvg({ width: width - safe * 2, height: 260, text: title, fontSize: 112, fill: "#ffffff", stroke: "#000000", strokeWidth: 8, shadow: true, uppercase: true, maxLines: 2 }), left: safe, top: titleTop },
    { input: renderPillSvg(600, 86, cta, colors.primary), left: safe, top: height - safe - 190 },
  ];

  if (subtitle) composites.push({ input: renderTextSvg({ width: width - safe * 2, height: 100, text: subtitle, fontSize: 44, fill: colors.light, shadow: true, maxLines: 2 }), left: safe, top: titleTop + 210 });
  if (contacts) composites.push({ input: renderTextSvg({ width: width - safe * 2, height: 70, text: contacts, fontSize: 34, fill: "#ffffff", maxLines: 1 }), left: safe, top: height - safe - 80 });

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);
  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}
