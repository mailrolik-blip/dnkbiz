import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { ImageGenerationProvider, ImageProviderRequest, ImageProviderResult } from "./types";

export class MockImageProvider implements ImageGenerationProvider {
  key = "mock";

  supportsReferenceImages(): boolean {
    return true;
  }

  getCostEstimate(): number {
    return 0;
  }

  async generateImage(request: ImageProviderRequest): Promise<ImageProviderResult> {
    return this.render(request, "generate");
  }

  async editImage(request: ImageProviderRequest): Promise<ImageProviderResult> {
    return this.render(request, "edit");
  }

  private async render(request: ImageProviderRequest, mode: "generate" | "edit"): Promise<ImageProviderResult> {
    const [width, height] = parseSize(request.size || "1024x1024");
    const outputDir = request.output_dir || path.join(process.cwd(), ".storage", "visual_generated_assets", request.brand_key);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${request.job_id}-${mode}-mock.png`);
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#243447"/><circle cx="${width * 0.68}" cy="${height * 0.38}" r="${Math.min(width, height) * 0.22}" fill="#FFD54A"/><text x="50%" y="82%" text-anchor="middle" font-family="Arial" font-size="${Math.round(width * 0.045)}" font-weight="900" fill="#fff">AI ${mode.toUpperCase()} MOCK</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    return { provider: this.key, model: "mock-image-local", output_path: outputPath, request_count: 0, estimated_cost: 0, billable: false, real_provider_call: false, diagnostics: { offline: true, mode } };
  }
}

function parseSize(size: string): [number, number] {
  const match = size.match(/^(\d+)x(\d+)$/);
  return match ? [Number(match[1]), Number(match[2])] : [1024, 1024];
}
