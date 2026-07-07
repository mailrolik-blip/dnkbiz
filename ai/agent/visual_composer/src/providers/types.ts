export interface ImageProviderRequest {
  job_id: string;
  brand_key: string;
  prompt: string;
  output_dir?: string;
  size?: string;
  reference_images?: Array<{ path: string; role?: string }>;
}

export interface ImageProviderResult {
  provider: string;
  model: string;
  output_path: string;
  request_count: number;
  estimated_cost: number;
  billable?: boolean;
  real_provider_call?: boolean;
  diagnostics: Record<string, unknown>;
}

export interface ImageGenerationProvider {
  key: string;
  generateImage(request: ImageProviderRequest): Promise<ImageProviderResult>;
  editImage(request: ImageProviderRequest): Promise<ImageProviderResult>;
  supportsReferenceImages(): boolean;
  getCostEstimate(request: Pick<ImageProviderRequest, "size" | "reference_images">): number;
}
