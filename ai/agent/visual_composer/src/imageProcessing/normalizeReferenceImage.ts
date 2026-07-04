import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { detectImageMimeType, type ImageMimeDetection } from "./detectImageMimeType";

export interface ReferenceNormalizationResult {
  source_path: string;
  normalized_path: string;
  detected: ImageMimeDetection;
  diagnostics: {
    source_basename: string;
    source_format: string;
    normalized_format: "png";
    width: number;
    height: number;
    alpha: boolean;
    mime_type: "image/png";
    size_bytes: number;
  };
}

export async function normalizeReferenceImage(input: {
  source_path: string;
  job_id: string;
  index: number;
}): Promise<ReferenceNormalizationResult> {
  const detected = await detectImageMimeType(input.source_path);
  const dir = path.join(process.cwd(), ".storage", "visual_reference_inputs", sanitizePathSegment(input.job_id));
  await fs.mkdir(dir, { recursive: true });
  const normalizedPath = path.join(dir, `reference-${String(input.index + 1).padStart(2, "0")}.png`);
  const image = sharp(input.source_path, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  await image
    .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(normalizedPath);
  const normalizedMetadata = await sharp(normalizedPath).metadata();
  const stat = await fs.stat(normalizedPath);
  return {
    source_path: input.source_path,
    normalized_path: normalizedPath,
    detected,
    diagnostics: {
      source_basename: path.basename(input.source_path),
      source_format: detected.format,
      normalized_format: "png",
      width: normalizedMetadata.width || metadata.width || 0,
      height: normalizedMetadata.height || metadata.height || 0,
      alpha: hasAlpha || Boolean(normalizedMetadata.hasAlpha),
      mime_type: "image/png",
      size_bytes: stat.size,
    },
  };
}

export async function normalizeReferenceImages(paths: string[], jobId: string): Promise<ReferenceNormalizationResult[]> {
  const results: ReferenceNormalizationResult[] = [];
  for (let index = 0; index < paths.length; index += 1) {
    results.push(await normalizeReferenceImage({ source_path: paths[index], job_id: jobId, index }));
  }
  return results;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "job";
}
