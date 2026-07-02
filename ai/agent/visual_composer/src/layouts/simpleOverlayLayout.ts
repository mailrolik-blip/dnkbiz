import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg, renderTextSvg } from "../utils/renderText";

export async function renderSimpleOverlayLayout(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 1080;
  const height = job.layout.height || 1080;
  const safe = job.layout.safe_area || 64;
  const variant = job.layout.variant || "casper_square_news";
  const colors = { primary: job.brand?.colors?.primary || "#38BDF8", accent: job.brand?.colors?.accent || "#A7F3D0", dark: job.brand?.colors?.dark || "#0F172A", light: job.brand?.colors?.light || "#F8FAFC" };
  const baseAsset = job.illustration_layer?.asset_path || job.background_layer?.asset_path;
  const base = await loadImageOrPlaceholder({ assetPath: baseAsset, repoRoot: context.repoRoot, composerRoot: context.composerRoot, width, height, label: "Casper style base", kind: "background", colors, warnings: context.warnings });
  if (!baseAsset) context.warnings.push("Casper style_generation has no asset; rendered styled fallback base.");

  const title = job.text_layer?.text || job.source_text || "CASPER";
  const sticker = job.text_layer?.sticker || (variant === "casper_warning" ? "ВАЖНО" : variant === "casper_contest" ? "КОНКУРС" : "CASPER");
  const panelTop = height - (height > width * 1.3 ? 520 : 350);
  const accent = variant === "casper_warning" ? "#F43F5E" : variant === "casper_contest" ? "#F59E0B" : colors.accent;

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } })
    .composite([
      { input: await sharp(base.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
      { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="${width}" height="${height}" fill="${colors.dark}" opacity="0.42"/><circle cx="${width * 0.78}" cy="${height * 0.2}" r="${width * 0.18}" fill="${accent}" opacity="0.22"/><path d="M${safe} ${height * 0.2} C${width * 0.32} ${height * 0.08}, ${width * 0.5} ${height * 0.34}, ${width - safe} ${height * 0.18}" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.16"/><rect x="${safe}" y="${panelTop}" width="${width - safe * 2}" height="${height - panelTop - safe}" rx="34" fill="#ffffff" opacity="0.93"/><rect x="${safe}" y="${panelTop}" width="18" height="${height - panelTop - safe}" rx="9" fill="${accent}"/></svg>`), left: 0, top: 0 },
      { input: renderPillSvg(340, 72, sticker, accent), left: safe + 38, top: panelTop - 92 },
      { input: renderTextSvg({ width: width - safe * 2 - 90, height: 210, text: title, fontSize: 72, fill: colors.dark, maxLines: 2 }), left: safe + 58, top: panelTop + 44 },
    ])
    .png()
    .toFile(context.outputPath);

  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}
