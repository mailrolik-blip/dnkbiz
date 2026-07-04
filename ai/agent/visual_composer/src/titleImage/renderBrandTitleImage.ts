import sharp from "sharp";

export interface BrandTitleRenderInput {
  text: string;
  project_key: "monopoly" | "monopoly_pay" | string;
  width: number;
  height: number;
  tags?: string[];
  maxLines?: number;
}

export interface BrandTitleRenderMetadata {
  title_image_width: number;
  title_image_height: number;
  final_font_size: number;
  lines: string[];
  was_shrunk: boolean;
  was_wrapped: boolean;
  safe_padding_used: number;
  warnings: string[];
}

export interface BrandTitleRenderResult {
  buffer: Buffer;
  metadata: BrandTitleRenderMetadata;
}

export interface TitlePreprocessResult {
  buffer: Buffer;
  warnings: string[];
  metadata: {
    was_trimmed: boolean;
    was_scaled_up: boolean;
    was_scaled_down: boolean;
    transparent: boolean;
  };
}

export async function renderBrandTitleImage(input: BrandTitleRenderInput): Promise<Buffer> {
  return (await renderBrandTitleImageLayer(input)).buffer;
}

export async function renderBrandTitleImageLayer(input: BrandTitleRenderInput): Promise<BrandTitleRenderResult> {
  const isPay = input.project_key === "monopoly_pay";
  const maxLines = input.maxLines || (input.width > input.height ? 2 : 3);
  const padding = Math.max(32, Math.round(Math.min(input.width, input.height) * 0.10));
  const text = input.text.toUpperCase().replace(/\s+/g, " ").trim();
  const lines = wrapTitle(text, maxLines, isPay ? 18 : 16);
  const availableWidth = input.width - padding * 2;
  const availableHeight = input.height - padding * 2;
  let fontSize = Math.floor(Math.min(availableHeight / Math.max(1, lines.length) * 0.72, availableWidth / Math.max(...lines.map((line) => visualLength(line)), 8) * 1.56));
  const maxFont = Math.floor(input.height * (lines.length === 1 ? 0.48 : 0.34));
  const initialFont = Math.min(maxFont, Math.max(36, fontSize));
  fontSize = initialFont;
  const lineHeight = Math.round(fontSize * 1.02);
  const blockHeight = lineHeight * lines.length;
  const startY = Math.round(input.height / 2 - blockHeight / 2 + lineHeight * 0.55);
  const fill1 = isPay ? "#FFFFFF" : "#FFE66D";
  const fill2 = isPay ? "#9BE7FF" : "#FF9B21";
  const stroke = isPay ? "#071827" : "#23130A";
  const shadow = isPay ? "#0071FF" : "#D93913";
  const textSvg = lines.map((line, index) => {
    const y = startY + index * lineHeight;
    const safe = escapeXml(line);
    return `<text x="50%" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="url(#titleFill)" stroke="#ffffff" stroke-width="${Math.max(5, Math.round(fontSize * 0.08))}" paint-order="stroke" filter="url(#soft)">${safe}</text><text x="50%" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="url(#titleFill)" stroke="${stroke}" stroke-width="${Math.max(2, Math.round(fontSize * 0.035))}" paint-order="stroke">${safe}</text>`;
  }).join("\n");
  const svg = `<svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="titleFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${fill1}"/><stop offset="1" stop-color="${fill2}"/></linearGradient><filter id="soft" x="-8%" y="-8%" width="116%" height="124%"><feDropShadow dx="${Math.round(fontSize * 0.09)}" dy="${Math.round(fontSize * 0.13)}" stdDeviation="2" flood-color="${shadow}" flood-opacity="0.95"/><feDropShadow dx="0" dy="${Math.round(fontSize * 0.07)}" stdDeviation="${Math.max(4, Math.round(fontSize * 0.06))}" flood-color="#000000" flood-opacity="0.35"/></filter></defs><rect width="100%" height="100%" fill="none"/>${textSvg}</svg>`;
  const warnings: string[] = [];
  if (lines.length > 1) warnings.push("title_was_reflowed");
  if (fontSize < initialFont) warnings.push("title_was_scaled_down");
  if (text.length > (isPay ? 34 : 28)) warnings.push("title_was_too_large");
  return {
    buffer: await sharp(Buffer.from(svg)).png().toBuffer(),
    metadata: {
      title_image_width: input.width,
      title_image_height: input.height,
      final_font_size: fontSize,
      lines,
      was_shrunk: fontSize < initialFont,
      was_wrapped: lines.length > 1,
      safe_padding_used: padding,
      warnings,
    },
  };
}

export async function preprocessTitleImage(input: Buffer, target: { width: number; height: number }, transparent: boolean | undefined): Promise<TitlePreprocessResult> {
  const warnings: string[] = [];
  let image = sharp(input, { failOn: "none" }).ensureAlpha();
  const before = await image.metadata();
  try {
    image = image.trim({ threshold: 12 });
  } catch {
    warnings.push("title_image_trim_failed");
  }
  const trimmed = await image.png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const wasTrimmed = Boolean(before.width && before.height && meta.width && meta.height && (meta.width < before.width || meta.height < before.height));
  if (wasTrimmed) warnings.push("title_image_trimmed");
  const wasScaledUp = Boolean(meta.width && meta.height && (meta.width < target.width * 0.65 || meta.height < target.height * 0.45));
  const wasScaledDown = Boolean(meta.width && meta.height && (meta.width > target.width || meta.height > target.height));
  if (wasScaledUp) warnings.push("title_image_scaled_up");
  if (wasScaledDown) warnings.push("title_was_scaled_down");
  if (!transparent) {
    warnings.push("title_image_not_transparent");
    warnings.push("title_image_may_need_manual_review");
  }
  const buffer = await sharp(trimmed)
    .resize(target.width, target.height, { fit: "contain", withoutEnlargement: false, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 0, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return { buffer, warnings, metadata: { was_trimmed: wasTrimmed, was_scaled_up: wasScaledUp, was_scaled_down: wasScaledDown, transparent: Boolean(transparent) } };
}

function wrapTitle(text: string, maxLines: number, targetChars: number): string[] {
  const words = text.split(" ").filter(Boolean);
  if (words.length <= 1) return [text];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (visualLength(next) > targetChars && current && lines.length < maxLines - 1) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function visualLength(value: string): number {
  return [...value].reduce((sum, char) => sum + (/[-–—]/.test(char) ? 0.4 : /[A-ZА-Я0-9]/u.test(char) ? 1 : 0.8), 0);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}
