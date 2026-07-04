import type { BackgroundLayer, CharacterLayer, IllustrationLayer, ProjectProfileSnapshot, TextLayer, TitleImageLayer, VisualJob, VisualProjectKey, VisualMode } from "../types";
import type { VisualAsset } from "../assets/types";

export type AiImageMode = "generate_image" | "generate_with_references" | "edit_image";
export type AiImageLayerType = "character" | "title_image" | "background" | "decor" | "illustration" | "style_base";

export interface VisualAiCapabilities {
  image_generation: boolean;
  image_references: boolean;
  image_edit: boolean;
  transparent_background: boolean;
}

export interface AiLayerInput {
  mode?: AiImageMode;
  layer_type?: AiImageLayerType;
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
  output?: {
    transparent_background?: boolean;
    size?: string;
  };
  allow_locked_character_replacement?: boolean;
  enable_ai?: boolean;
}

export interface VisualAiProvider {
  getCapabilities?(): VisualAiCapabilities;
  generateTextLayer(input: AiLayerInput): Promise<Partial<TextLayer>>;
  generateIllustrationLayer(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
  generateBackgroundLayer(input: AiLayerInput): Promise<Partial<BackgroundLayer>>;
  generateStyleBaseImage?(input: AiLayerInput): Promise<Partial<IllustrationLayer>>;
  generateCharacterLayer?(input: AiLayerInput): Promise<Partial<CharacterLayer>>;
  generateTitleImageLayer?(input: AiLayerInput): Promise<Partial<TitleImageLayer>>;
}
