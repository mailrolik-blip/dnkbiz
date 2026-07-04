import sharp from "sharp";

export interface ExtractForegroundResult {
  buffer: Buffer;
  metadata: {
    background_color: { r: number; g: number; b: number };
    trimmed: boolean;
    feather: number;
  };
}

export async function extractLayerFromUniformBackground(input: Buffer, options: { threshold?: number; feather?: number; padding?: number } = {}): Promise<ExtractForegroundResult> {
  const threshold = options.threshold ?? 34;
  const feather = options.feather ?? 18;
  const padding = options.padding ?? 28;
  const image = sharp(input).ensureAlpha();
  const meta = await image.metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const raw = await image.raw().toBuffer();
  const bg = estimateBorderColor(raw, width, height);
  for (let index = 0; index < raw.length; index += 4) {
    const distance = colorDistance(raw[index], raw[index + 1], raw[index + 2], bg.r, bg.g, bg.b);
    if (distance <= threshold) raw[index + 3] = 0;
    else if (distance <= threshold + feather) raw[index + 3] = Math.round(255 * ((distance - threshold) / feather));
  }
  const transparent = await sharp(raw, { raw: { width, height, channels: 4 } })
    .png()
    .trim({ background: "#00000000", threshold: 1 })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: "#00000000" })
    .png()
    .toBuffer();
  return { buffer: transparent, metadata: { background_color: bg, trimmed: true, feather } };
}

function estimateBorderColor(raw: Buffer, width: number, height: number): { r: number; g: number; b: number } {
  const samples: Array<{ r: number; g: number; b: number }> = [];
  const push = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    samples.push({ r: raw[index], g: raw[index + 1], b: raw[index + 2] });
  };
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 16))) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 16))) {
    push(0, y);
    push(width - 1, y);
  }
  samples.sort((a, b) => luminance(a) - luminance(b));
  const middle = samples[Math.floor(samples.length / 2)] || { r: 255, g: 0, b: 255 };
  return middle;
}

function luminance(color: { r: number; g: number; b: number }): number {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
