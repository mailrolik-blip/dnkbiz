import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export interface TitleStyleConfig {
  font_family: string;
  font_asset_ref?: string;
  font_path_env?: string;
  font_size_range: [number, number];
  line_height: number;
  tracking: number;
  fill_gradient: string[];
  face_gradient?: string[];
  face_highlight?: { color: string; opacity: number };
  primary_stroke?: { color: string; width: number };
  secondary_stroke?: { color: string; width: number };
  stroke_width: number;
  stroke_color: string;
  highlight: { color: string; opacity: number };
  extrusion: { steps: number; x_step: number; y_step: number; colors: string[] };
  extrusion_steps?: number;
  extrusion_x_step?: number;
  extrusion_y_step?: number;
  extrusion_color_start?: string;
  extrusion_color_end?: string;
  shadow_offset?: [number, number];
  shadow_blur?: number;
  shadow_opacity?: number;
  shadow: { offset: [number, number]; blur: number; opacity: number };
  padding: number;
}

export interface LocalTitleRenderResult {
  output_path: string;
  width: number;
  height: number;
  metadata: {
    renderer_key: string;
    font_family: string;
    font_source: string;
    font_fallback_used: boolean;
    lines: string[];
    font_size: number;
    exact_text: string;
  };
}

export async function renderConfiguredTitle(input: {
  renderer_key: string;
  text: string;
  width: number;
  height: number;
  output_path: string;
  config: TitleStyleConfig;
  max_lines: number;
}): Promise<LocalTitleRenderResult> {
  const exact = input.text.trim();
  const config = normalizeTitleConfig(input.config);
  const font = await resolveFont(config);
  const lines = wrapText(exact, input.max_lines, input.width, config);
  const fontSize = fitFont(lines, input.width, input.height, config);
  const lineHeight = Math.round(fontSize * config.line_height);
  const blockHeight = lineHeight * lines.length;
  const startY = Math.round((input.height - blockHeight) / 2 + lineHeight * 0.72);
  const textNodes = lines.map((line, index) => titleLineSvg(line, input.width / 2, startY + index * lineHeight, fontSize, config, font.family)).join("\n");
  const svg = `<svg width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}" xmlns="http://www.w3.org/2000/svg"><defs>${defs(config, font)}</defs><rect width="100%" height="100%" fill="none"/>${textNodes}</svg>`;
  await fs.mkdir(path.dirname(input.output_path), { recursive: true });
  const rendered = await sharp(Buffer.from(svg)).trim({ threshold: 1 }).extend({ top: config.padding, bottom: config.padding, left: config.padding, right: config.padding, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(rendered).resize(input.width, input.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(input.output_path);
  return { output_path: input.output_path, width: input.width, height: input.height, metadata: { renderer_key: input.renderer_key, font_family: font.family, font_source: font.source, font_fallback_used: font.fallback, lines, font_size: fontSize, exact_text: exact } };
}

export async function readTitleStyleConfig(fileName: string): Promise<TitleStyleConfig> {
  const filePath = path.join(process.cwd(), "ai", "agent", "visual_composer", "src", "renderers", "title", fileName);
  return JSON.parse(await fs.readFile(filePath, "utf8")) as TitleStyleConfig;
}

function wrapText(text: string, maxLines: number, width: number, config: TitleStyleConfig): string[] {
  const words = text.replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (words.length <= 1) return [text];
  const target = Math.max(8, Math.round((width - config.padding * 2) / 72));
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (visualLength(next) > target && current && lines.length < maxLines - 1) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function fitFont(lines: string[], width: number, height: number, config: TitleStyleConfig): number {
  const [min, max] = config.font_size_range;
  const longest = Math.max(...lines.map(visualLength), 1);
  const byWidth = (width - config.padding * 2) / longest * 1.42;
  const byHeight = (height - config.padding * 2) / Math.max(lines.length, 1) * 0.72;
  return Math.max(min, Math.min(max, Math.floor(Math.min(byWidth, byHeight))));
}

function titleLineSvg(text: string, x: number, y: number, fontSize: number, config: TitleStyleConfig, fontFamily: string): string {
  const safe = escapeXml(text);
  const extrusion = Array.from({ length: config.extrusion.steps }, (_, index) => {
    const color = config.extrusion.colors[index % config.extrusion.colors.length];
    const dx = (config.extrusion.steps - index) * config.extrusion.x_step;
    const dy = (config.extrusion.steps - index) * config.extrusion.y_step;
    return textSvg(safe, x + dx, y + dy, fontSize, fontFamily, config.tracking, color, config.secondary_stroke?.color || config.stroke_color, config.secondary_stroke?.width || config.stroke_width, "");
  }).join("\n");
  const shadow = textSvg(safe, x + config.shadow.offset[0], y + config.shadow.offset[1], fontSize, fontFamily, config.tracking, "#000000", "none", 0, `opacity="${config.shadow.opacity}" filter="url(#shadow)"`);
  const secondary = config.secondary_stroke ? textSvg(safe, x, y, fontSize, fontFamily, config.tracking, "url(#fill)", config.secondary_stroke.color, config.secondary_stroke.width, "") : "";
  const base = textSvg(safe, x, y, fontSize, fontFamily, config.tracking, "url(#fill)", config.primary_stroke?.color || config.stroke_color, config.primary_stroke?.width || config.stroke_width, "");
  const highlight = textSvg(safe, x, y - fontSize * 0.18, Math.round(fontSize * 0.9), fontFamily, config.tracking, config.highlight.color, "none", 0, `opacity="${config.highlight.opacity}"`);
  return `${shadow}\n${extrusion}\n${secondary}\n${base}\n${highlight}`;
}

function textSvg(text: string, x: number, y: number, fontSize: number, fontFamily: string, tracking: number, fill: string, stroke: string, strokeWidth: number, extra: string): string {
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="900" letter-spacing="${tracking}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke" ${extra}>${text}</text>`;
}

function defs(config: TitleStyleConfig, font: { family: string; filePath?: string }): string {
  const stops = config.fill_gradient.map((color, index) => `<stop offset="${index / Math.max(config.fill_gradient.length - 1, 1)}" stop-color="${color}"/>`).join("");
  const fontFace = font.filePath ? `<style>@font-face{font-family:'${escapeXml(font.family)}';src:url('${fileUrl(font.filePath)}');font-weight:900;}</style>` : "";
  return `${fontFace}<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient><filter id="shadow"><feDropShadow dx="0" dy="0" stdDeviation="${config.shadow.blur}" flood-color="#000000" flood-opacity="1"/></filter>`;
}

function visualLength(value: string): number {
  return [...value].reduce((sum, char) => sum + (/[-–—]/.test(char) ? 0.45 : /[A-ZА-Я0-9]/u.test(char) ? 1 : 0.75), 0);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}

function normalizeTitleConfig(config: TitleStyleConfig): TitleStyleConfig {
  const extrusionColors = config.extrusion_color_start && config.extrusion_color_end
    ? [config.extrusion_color_start, midpointColor(config.extrusion_color_start, config.extrusion_color_end), config.extrusion_color_end]
    : config.extrusion.colors;
  return {
    ...config,
    fill_gradient: config.face_gradient || config.fill_gradient,
    highlight: config.face_highlight || config.highlight,
    stroke_color: config.primary_stroke?.color || config.stroke_color,
    stroke_width: config.primary_stroke?.width || config.stroke_width,
    extrusion: {
      steps: config.extrusion_steps || config.extrusion.steps,
      x_step: config.extrusion_x_step || config.extrusion.x_step,
      y_step: config.extrusion_y_step || config.extrusion.y_step,
      colors: extrusionColors,
    },
    shadow: {
      offset: config.shadow_offset || config.shadow.offset,
      blur: config.shadow_blur || config.shadow.blur,
      opacity: config.shadow_opacity ?? config.shadow.opacity,
    },
  };
}

async function resolveFont(config: TitleStyleConfig): Promise<{ family: string; source: string; fallback: boolean; filePath?: string }> {
  const envName = config.font_path_env || "VISUAL_PAY_TITLE_FONT_PATH";
  const configured = process.env[envName] || config.font_asset_ref;
  if (configured) {
    const filePath = path.resolve(configured);
    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) return { family: "DNKPayTitleLocal", source: filePath, fallback: false, filePath };
    } catch {
      // fall through to the safe system fallback below
    }
  }
  return { family: config.font_family, source: config.font_family, fallback: Boolean(configured) };
}

function fileUrl(filePath: string): string {
  return `file:///${filePath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1:")}`;
}

function midpointColor(start: string, end: string): string {
  const a = hexToRgb(start);
  const b = hexToRgb(end);
  return rgbToHex(Math.round((a.r + b.r) / 2), Math.round((a.g + b.g) / 2), Math.round((a.b + b.b) / 2));
}

function hexToRgb(value: string): { r: number; g: number; b: number } {
  const hex = value.replace("#", "");
  return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((item) => item.toString(16).padStart(2, "0")).join("")}`;
}
