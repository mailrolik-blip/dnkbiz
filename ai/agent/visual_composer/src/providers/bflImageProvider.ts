import type { ImageGenerationProvider, ImageProviderRequest, ImageProviderResult } from "./types";

export class BflImageProvider implements ImageGenerationProvider {
  key = "bfl";

  supportsReferenceImages(): boolean {
    return process.env.BFL_IMAGE_EDIT_ENABLED === "true";
  }

  getCostEstimate(): number {
    return Number(process.env.BFL_IMAGE_ESTIMATED_COST || 0.06);
  }

  async generateImage(_request: ImageProviderRequest): Promise<ImageProviderResult> {
    if (process.env.VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS !== "true" || !process.env.BFL_API_KEY) {
      throw new Error("BFL provider is configured but disabled. Set VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS=true and BFL_API_KEY for live use.");
    }
    throw new Error("BFL live HTTP integration is intentionally gated for operator wiring; no Codex live calls.");
  }

  async editImage(request: ImageProviderRequest): Promise<ImageProviderResult> {
    if (!this.supportsReferenceImages()) throw new Error("Configured BFL model does not expose edit/reference support.");
    return this.generateImage(request);
  }
}
