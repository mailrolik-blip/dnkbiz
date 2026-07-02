import path from "node:path";
import sharp from "sharp";
import { VisualJob, ComposeResult, RenderContext } from "../types";
import { loadImageOrPlaceholder } from "../utils/loadImage";
import { renderPillSvg, renderTextSvg } from "../utils/renderText";

export async function renderGorillaPrintLayout(job: VisualJob, context: RenderContext): Promise<ComposeResult> {
  const width = job.layout.width || 2480;
  const height = job.layout.height || 3508;
  const safe = job.layout.safe_area || 180;
  const variant = job.layout.variant || "Gorilla_print_a4_v1";
  const colors = {
    primary: job.brand?.colors?.primary || "#E3202A",
    accent: job.brand?.colors?.accent || "#F6C500",
    dark: job.brand?.colors?.dark || "#111820",
    light: job.brand?.colors?.light || "#F7F7F2",
  };
  const title = job.text_layer?.text || "АФИША";
  const subtitle = job.text_layer?.subtitle || "";
  const body = job.text_layer?.body || "";
  const contacts = job.text_layer?.contacts || job.brand?.contacts || "";

  const background = await loadImageOrPlaceholder({
    assetPath: job.background_layer?.asset_path,
    repoRoot: context.repoRoot,
    composerRoot: context.composerRoot,
    width,
    height,
    label: "Print background",
    kind: "background",
    colors,
    warnings: context.warnings,
  });
  const logo = await loadImageOrPlaceholder({
    assetPath: job.brand?.logo_path,
    repoRoot: context.repoRoot,
    composerRoot: context.composerRoot,
    width: 320,
    height: 320,
    label: "Gorilla",
    kind: "logo",
    colors,
    warnings: context.warnings,
  });
  const qr = await loadImageOrPlaceholder({
    assetPath: job.brand?.qr_path,
    repoRoot: context.repoRoot,
    composerRoot: context.composerRoot,
    width: 360,
    height: 360,
    label: "QR",
    kind: "qr",
    colors,
    warnings: context.warnings,
  });

  const composites: sharp.OverlayOptions[] = [
    { input: await sharp(background.input).resize(width, height, { fit: "cover" }).png().toBuffer(), left: 0, top: 0 },
    { input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="${safe / 2}" y="${safe / 2}" width="${width - safe}" height="${height - safe}" fill="${colors.light}" opacity="0.94"/><rect x="${safe / 2}" y="${safe / 2}" width="${width - safe}" height="34" fill="${colors.primary}"/><rect x="${safe / 2}" y="${height - safe / 2 - 34}" width="${width - safe}" height="34" fill="${colors.primary}"/></svg>`), left: 0, top: 0 },
    { input: await sharp(logo.input).resize(250, 250, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: safe, top: safe },
    { input: renderTextSvg({ width: width - safe * 2, height: 620, text: title, fontSize: 210, fill: colors.dark, stroke: colors.primary, strokeWidth: 6, uppercase: true, maxLines: 3 }), left: safe, top: 560 },
  ];

  if (subtitle) composites.push({ input: renderPillSvg(1180, 132, subtitle, colors.primary), left: safe, top: 1250 });
  if (body) composites.push({ input: renderTextSvg({ width: width - safe * 2, height: 760, text: body, fontSize: 86, fill: colors.dark, align: "left", x: 0, maxLines: 7 }), left: safe, top: 1530 });
  if (contacts) composites.push({ input: renderTextSvg({ width: width - safe * 2 - 470, height: 240, text: contacts, fontSize: 72, fill: colors.dark, align: "left", x: 0, maxLines: 3 }), left: safe, top: height - safe - 330 });

  composites.push({ input: await sharp(qr.input).resize(360, 360).png().toBuffer(), left: width - safe - 360, top: height - safe - 390 });

  await sharp({ create: { width, height, channels: 4, background: "#00000000" } }).composite(composites).png().toFile(context.outputPath);

  return { ok: true, output_path: path.resolve(context.outputPath), width, height, project_key: job.project_key, visual_mode: job.visual_mode, layout_variant: variant, warnings: context.warnings };
}
