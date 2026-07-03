export interface TextBoxOptions {
  width: number;
  height: number;
  text: string;
  x?: number;
  y?: number;
  fontSize: number;
  fontFamily?: string;
  weight?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  maxLines?: number;
  shadow?: boolean;
  uppercase?: boolean;
}

export interface FittedTextResult {
  buffer: Buffer;
  finalFontSize: number;
  lineCount: number;
  wasShrunk: boolean;
  wasTruncated: boolean;
}

const xmlEscapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => xmlEscapeMap[char]);
}

export function wrapText(text: string, maxChars: number, maxLines = 4): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  return lines.length ? lines : [text];
}

export function renderTextSvg(options: TextBoxOptions): Buffer {
  const fontFamily = options.fontFamily || "Arial, Helvetica, sans-serif";
  const lineHeight = options.lineHeight || Math.round(options.fontSize * 1.08);
  const text = options.uppercase ? options.text.toUpperCase() : options.text;
  const maxChars = Math.max(6, Math.floor(options.width / (options.fontSize * 0.58)));
  const lines = wrapText(text, maxChars, options.maxLines || 3);
  const align = options.align || "center";
  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const x = options.x ?? (align === "left" ? 0 : align === "right" ? options.width : options.width / 2);
  const startY = options.y ?? Math.max(options.fontSize, (options.height - (lines.length - 1) * lineHeight) / 2);
  const stroke = options.stroke ? `stroke="${options.stroke}" stroke-width="${options.strokeWidth || 0}" paint-order="stroke"` : "";
  const shadow = options.shadow
    ? `<filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000000" flood-opacity="0.38"/></filter>`
    : "";
  const filter = options.shadow ? "filter=\"url(#shadow)\"" : "";

  const textNodes = lines
    .map((line, index) => {
      const y = startY + index * lineHeight;
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${fontFamily}" font-size="${options.fontSize}" font-weight="${options.weight || 800}" fill="${options.fill || "#ffffff"}" ${stroke} ${filter}>${escapeXml(line)}</text>`;
    })
    .join("");

  return Buffer.from(`<svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" xmlns="http://www.w3.org/2000/svg"><defs>${shadow}</defs>${textNodes}</svg>`);
}

export function renderFittedTextSvg(options: TextBoxOptions & {
  minFontSize?: number;
  ellipsis?: boolean;
}): FittedTextResult {
  const initialFontSize = options.fontSize;
  const minFontSize = options.minFontSize || Math.max(28, Math.round(initialFontSize * 0.62));
  const maxLines = options.maxLines || 2;
  const text = options.uppercase ? options.text.toUpperCase() : options.text;
  let fontSize = initialFontSize;
  let lines = wrapForFont(text, options.width, fontSize, maxLines);

  while ((lines.truncated || lines.lines.length > maxLines || linesHeight(lines.lines.length, fontSize, options.lineHeight) > options.height) && fontSize > minFontSize) {
    fontSize -= 2;
    lines = wrapForFont(text, options.width, fontSize, maxLines);
  }

  let finalLines = lines.lines;
  let wasTruncated = lines.truncated || linesHeight(finalLines.length, fontSize, options.lineHeight) > options.height;
  if (wasTruncated && options.ellipsis !== false && finalLines.length) {
    finalLines = finalLines.slice(0, maxLines);
    finalLines[finalLines.length - 1] = ellipsize(finalLines[finalLines.length - 1], Math.max(4, Math.floor(options.width / (fontSize * 0.58))));
  }

  return {
    buffer: renderTextLinesSvg({ ...options, fontSize, text, maxLines }, finalLines),
    finalFontSize: fontSize,
    lineCount: finalLines.length,
    wasShrunk: fontSize < initialFontSize,
    wasTruncated,
  };
}

function renderTextLinesSvg(options: TextBoxOptions, lines: string[]): Buffer {
  const fontFamily = options.fontFamily || "Arial, Helvetica, sans-serif";
  const lineHeight = options.lineHeight || Math.round(options.fontSize * 1.08);
  const align = options.align || "center";
  const anchor = align === "left" ? "start" : align === "right" ? "end" : "middle";
  const x = options.x ?? (align === "left" ? 0 : align === "right" ? options.width : options.width / 2);
  const startY = options.y ?? Math.max(options.fontSize, (options.height - (lines.length - 1) * lineHeight) / 2);
  const stroke = options.stroke ? `stroke="${options.stroke}" stroke-width="${options.strokeWidth || 0}" paint-order="stroke"` : "";
  const shadow = options.shadow
    ? `<filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000000" flood-opacity="0.38"/></filter>`
    : "";
  const filter = options.shadow ? "filter=\"url(#shadow)\"" : "";
  const textNodes = lines
    .map((line, index) => `<text x="${x}" y="${startY + index * lineHeight}" text-anchor="${anchor}" dominant-baseline="middle" font-family="${fontFamily}" font-size="${options.fontSize}" font-weight="${options.weight || 800}" fill="${options.fill || "#ffffff"}" ${stroke} ${filter}>${escapeXml(line)}</text>`)
    .join("");
  return Buffer.from(`<svg width="${options.width}" height="${options.height}" viewBox="0 0 ${options.width} ${options.height}" xmlns="http://www.w3.org/2000/svg"><defs>${shadow}</defs>${textNodes}</svg>`);
}

function wrapForFont(text: string, width: number, fontSize: number, maxLines: number): { lines: string[]; truncated: boolean } {
  const maxChars = Math.max(4, Math.floor(width / (fontSize * 0.58)));
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let truncated = false;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) {
        truncated = true;
        break;
      }
    } else if (word.length > maxChars) {
      lines.push(word.slice(0, maxChars));
      truncated = true;
      current = "";
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  return { lines: lines.length ? lines : [text], truncated };
}

function linesHeight(lineCount: number, fontSize: number, explicitLineHeight?: number): number {
  return lineCount * (explicitLineHeight || Math.round(fontSize * 1.08));
}

function ellipsize(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

export function renderPillSvg(width: number, height: number, text: string, fill: string, color = "#ffffff"): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" rx="${Math.round(height / 2)}" fill="${fill}"/><text x="${width / 2}" y="${height / 2 + 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(height * 0.42)}" font-weight="800" fill="${color}">${escapeXml(text)}</text></svg>`,
  );
}
