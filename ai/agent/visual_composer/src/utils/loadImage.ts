import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeXml } from "./renderText";

export interface LoadedAsset {
  input: Buffer;
  existed: boolean;
  resolvedPath?: string;
}

export function resolveAssetPath(assetPath: string | undefined, repoRoot: string, composerRoot: string): string | undefined {
  if (!assetPath) return undefined;
  if (path.isAbsolute(assetPath)) return assetPath;

  const repoRelative = path.resolve(repoRoot, assetPath);
  const composerRelative = path.resolve(composerRoot, assetPath);
  return assetPath.startsWith("examples/") ? composerRelative : repoRelative;
}

export async function loadImageOrPlaceholder(options: {
  assetPath?: string;
  repoRoot: string;
  composerRoot: string;
  width: number;
  height: number;
  label: string;
  kind: "background" | "illustration" | "logo" | "qr";
  colors?: {
    primary?: string;
    accent?: string;
    dark?: string;
    light?: string;
  };
  warnings: string[];
}): Promise<LoadedAsset> {
  const resolvedPath = resolveAssetPath(options.assetPath, options.repoRoot, options.composerRoot);
  if (resolvedPath) {
    try {
      await fs.access(resolvedPath);
      return { input: await fs.readFile(resolvedPath), existed: true, resolvedPath };
    } catch {
      options.warnings.push(`Asset not found, using placeholder: ${options.assetPath}`);
    }
  } else {
    options.warnings.push(`No ${options.kind} asset_path supplied, using generated placeholder.`);
  }

  return {
    input: await placeholderPng(options.width, options.height, options.label, options.kind, options.colors),
    existed: false,
  };
}

async function placeholderPng(
  width: number,
  height: number,
  label: string,
  kind: "background" | "illustration" | "logo" | "qr",
  colors?: { primary?: string; accent?: string; dark?: string; light?: string },
): Promise<Buffer> {
  const primary = colors?.primary || "#FFD000";
  const accent = colors?.accent || "#FF4A00";
  const dark = colors?.dark || "#121A20";
  const light = colors?.light || "#F7F1E1";

  if (kind === "background") {
    return sharp(
      Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${dark}"/>
            <stop offset="55%" stop-color="${accent}"/>
            <stop offset="100%" stop-color="${primary}"/>
          </linearGradient>
          <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.12"/>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)"/>
        <rect width="${width}" height="${height}" fill="url(#grid)"/>
      </svg>`),
    ).png().toBuffer();
  }

  if (kind === "qr") {
    return sharp(
      Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#ffffff"/>
        <rect x="${width * 0.12}" y="${height * 0.12}" width="${width * 0.28}" height="${height * 0.28}" fill="${dark}"/>
        <rect x="${width * 0.6}" y="${height * 0.12}" width="${width * 0.28}" height="${height * 0.28}" fill="${dark}"/>
        <rect x="${width * 0.12}" y="${height * 0.6}" width="${width * 0.28}" height="${height * 0.28}" fill="${dark}"/>
        <path d="M ${width * 0.54} ${height * 0.56} h ${width * 0.12} v ${height * 0.1} h ${width * 0.15} v ${height * 0.22} h -${width * 0.33} z" fill="${dark}"/>
      </svg>`),
    ).png().toBuffer();
  }

  const safeLabel = escapeXml(label);
  return sharp(
    Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${Math.min(width, height) * 0.08}" fill="${kind === "logo" ? dark : light}" opacity="${kind === "logo" ? "0.92" : "0.96"}"/>
      <circle cx="${width * 0.5}" cy="${height * 0.42}" r="${Math.min(width, height) * 0.22}" fill="${primary}" opacity="0.92"/>
      <path d="M ${width * 0.22} ${height * 0.78} C ${width * 0.34} ${height * 0.58}, ${width * 0.68} ${height * 0.58}, ${width * 0.8} ${height * 0.78}" fill="none" stroke="${accent}" stroke-width="${Math.max(10, width * 0.035)}" stroke-linecap="round"/>
      <text x="${width / 2}" y="${height * 0.9}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${Math.max(24, Math.round(width * 0.065))}" font-weight="800" fill="${kind === "logo" ? "#ffffff" : dark}">${safeLabel}</text>
    </svg>`),
  ).png().toBuffer();
}
