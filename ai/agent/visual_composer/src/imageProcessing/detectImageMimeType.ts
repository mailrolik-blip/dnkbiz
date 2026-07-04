import fs from "node:fs/promises";
import path from "node:path";

export type SupportedImageFormat = "png" | "jpeg" | "webp";

export interface ImageMimeDetection {
  mime_type: "image/png" | "image/jpeg" | "image/webp";
  format: SupportedImageFormat;
  extension: string;
  detected_by: "magic_bytes" | "extension";
  size_bytes: number;
}

export class UnsupportedImageFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedImageFormatError";
  }
}

export async function detectImageMimeType(filePath: string): Promise<ImageMimeDetection> {
  const stat = await fs.stat(filePath).catch((error: unknown) => {
    throw new UnsupportedImageFormatError(`Reference image not found: ${filePath}. ${error instanceof Error ? error.message : ""}`.trim());
  });
  const handle = await fs.open(filePath, "r");
  try {
    const header = Buffer.alloc(16);
    await handle.read(header, 0, header.length, 0);
    const magic = detectByMagicBytes(header);
    if (magic) {
      return { ...magic, extension: path.extname(filePath).toLowerCase(), detected_by: "magic_bytes", size_bytes: stat.size };
    }
  } finally {
    await handle.close();
  }

  const extension = path.extname(filePath).toLowerCase();
  const byExtension = detectByExtension(extension);
  if (!byExtension) {
    throw new UnsupportedImageFormatError(`Unsupported reference image format for ${path.basename(filePath)}. Supported formats: PNG, JPEG, WEBP.`);
  }
  return { ...byExtension, extension, detected_by: "extension", size_bytes: stat.size };
}

export function isNonRetryableImageInputError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unsupported mimetype|unsupported reference image format|invalid file|file not found|enoent|missing input file|invalid image|invalid parameter|unsupported image|unsupported parameter|unknown parameter|does not support (the )?.*parameter|not found/i.test(message);
}

function detectByMagicBytes(header: Buffer): Pick<ImageMimeDetection, "mime_type" | "format"> | undefined {
  if (header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime_type: "image/png", format: "png" };
  }
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return { mime_type: "image/jpeg", format: "jpeg" };
  }
  if (header.length >= 12 && header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP") {
    return { mime_type: "image/webp", format: "webp" };
  }
  return undefined;
}

function detectByExtension(extension: string): Pick<ImageMimeDetection, "mime_type" | "format"> | undefined {
  if (extension === ".png") return { mime_type: "image/png", format: "png" };
  if (extension === ".jpg" || extension === ".jpeg") return { mime_type: "image/jpeg", format: "jpeg" };
  if (extension === ".webp") return { mime_type: "image/webp", format: "webp" };
  return undefined;
}
