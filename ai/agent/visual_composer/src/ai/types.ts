import type { BackgroundLayer, IllustrationLayer, ProjectProfileSnapshot, TextLayer, VisualJob, VisualProjectKey, VisualMode } from "../types";
import type { VisualAsset } from "../assets/types";

export interface AiLayerInput {
  command_text: string;
  project_key: VisualProjectKey;
  visual_mode: VisualMode;
  profile?: ProjectProfileSnapshot;
  visual_job?: VisualJob;
  selected_assets?: VisualAsset[];
  reference_images?: Array<{
    path: string;
    role?: VisualAsset["role"];
    lock_policy?: VisualAsset["lock_policy"];
    description?: string;
  }>;
  locked_assets?: string[];
  revision_target?: "text" | "title_image" | "character" | "illustration" | "background" | "layout" | "format";
  enable_ai?: boolean;
}

export interface VisualAiProvider {
  generateTextLayer(input: AiLayerInput): Promise<Partial<TextLayer>>;
  generateIllustrationLayer(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
  generateBackgroundLayer(input: AiLayerInput): Promise<Partial<BackgroundLayer>>;
  generateStyleBaseImage?(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
}
