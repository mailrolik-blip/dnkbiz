import type { BackgroundLayer, IllustrationLayer, ProjectProfileSnapshot, TextLayer, VisualProjectKey, VisualMode } from "../types";

export interface AiLayerInput {
  command_text: string;
  project_key: VisualProjectKey;
  visual_mode: VisualMode;
  profile?: ProjectProfileSnapshot;
  enable_ai?: boolean;
}

export interface VisualAiProvider {
  generateTextLayer(input: AiLayerInput): Promise<Partial<TextLayer>>;
  generateIllustrationLayer(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
  generateBackgroundLayer(input: AiLayerInput): Promise<Partial<BackgroundLayer>>;
  generateStyleBaseImage?(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
}
