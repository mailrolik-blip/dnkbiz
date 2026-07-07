import type { ImageGenerationProvider, ImageProviderRequest, ImageProviderResult } from "./types";

export class YandexArtImageProvider implements ImageGenerationProvider {
  key = "yandexart";

  supportsReferenceImages(): boolean {
    return false;
  }

  getCostEstimate(): number {
    return Number(process.env.YANDEXART_IMAGE_ESTIMATED_COST || 0.04);
  }

  async generateImage(_request: ImageProviderRequest): Promise<ImageProviderResult> {
    if (process.env.VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS !== "true" || !process.env.YANDEXART_API_KEY) {
      throw new Error("YandexART provider is configured but disabled. Set VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS=true and YANDEXART_API_KEY for live use.");
    }
    throw new Error("YandexART live HTTP integration is intentionally gated for operator wiring; no Codex live calls.");
  }

  async editImage(): Promise<ImageProviderResult> {
    throw new Error("YandexART adapter is generation-only; edit/reference support is not exposed.");
  }
}
