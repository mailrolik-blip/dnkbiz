import type { BackgroundLayer, IllustrationLayer, ProjectProfileSnapshot, TextLayer, VisualJob, VisualProjectKey, VisualMode } from "../types";
import type { VisualAsset } from "../assets/types";

export interface AiLayerInput {
  command_text: string;
  project_key: VisualProjectKey;
  visual_mode: VisualMode;
  profile?: ProjectProfileSnapshot;
  visual_job?: VisualJob;
  selected_assets?: VisualAsset[];
  revision_target?: "text" | "illustration" | "background" | "layout" | "format";
  enable_ai?: boolean;
}

export interface VisualAiProvider {
  generateTextLayer(input: AiLayerInput): Promise<Partial<TextLayer>>;
  generateIllustrationLayer(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
  generateBackgroundLayer(input: AiLayerInput): Promise<Partial<BackgroundLayer>>;
  generateStyleBaseImage?(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
}
