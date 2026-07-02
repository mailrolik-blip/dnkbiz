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

export function renderPillSvg(width: number, height: number, text: string, fill: string, color = "#ffffff"): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" rx="${Math.round(height / 2)}" fill="${fill}"/><text x="${width / 2}" y="${height / 2 + 2}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(height * 0.42)}" font-weight="800" fill="${color}">${escapeXml(text)}</text></svg>`,
  );
}
