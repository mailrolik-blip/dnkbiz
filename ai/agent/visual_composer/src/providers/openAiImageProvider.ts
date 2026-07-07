import { editFromReference, generateFromReferences } from "../ai/openaiImageEditProvider";
import type { ImageGenerationProvider, ImageProviderRequest, ImageProviderResult } from "./types";

export class OpenAiImageProvider implements ImageGenerationProvider {
  key = "openai";

  supportsReferenceImages(): boolean {
    return true;
  }

  getCostEstimate(): number {
    return Number(process.env.OPENAI_IMAGE_ESTIMATED_COST || 0.08);
  }

  async generateImage(request: ImageProviderRequest): Promise<ImageProviderResult> {
    if (process.env.VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS !== "true") throw new Error("OpenAI provider is behind VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS=true");
    const result = await generateFromReferences({
      project_key: request.brand_key as never,
      job_id: request.job_id,
      layer_type: "background",
      input_images: (request.reference_images || []).map((item, index) => ({ path: item.path, role: item.role || "reference", priority: 100 - index })),
      prompt: request.prompt,
      size: request.size || "1024x1024",
      quality: "medium",
    });
    return { provider: this.key, model: result.model, output_path: result.output_path, request_count: 1, estimated_cost: this.getCostEstimate(), billable: true, real_provider_call: true, diagnostics: { input_count: result.input_count } };
  }

  async editImage(request: ImageProviderRequest): Promise<ImageProviderResult> {
    if (process.env.VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS !== "true") throw new Error("OpenAI provider is behind VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS=true");
    const result = await editFromReference({
      project_key: request.brand_key as never,
      job_id: request.job_id,
      layer_type: "character",
      input_images: (request.reference_images || []).map((item, index) => ({ path: item.path, role: item.role || "reference", priority: 100 - index })),
      prompt: request.prompt,
      size: request.size || "1024x1024",
      quality: "medium",
    });
    return { provider: this.key, model: result.model, output_path: result.output_path, request_count: 1, estimated_cost: this.getCostEstimate(), billable: true, real_provider_call: true, diagnostics: { input_count: result.input_count } };
  }
}
