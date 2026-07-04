import type { VisualAiProvider } from "./types";

const capabilities = {
  image_generation: false,
  image_references: false,
  image_edit: false,
  transparent_background: false,
};

export const mockAiProvider: VisualAiProvider = {
  getCapabilities() {
    return capabilities;
  },
  async generateTextLayer(input) {
    return {
      locked: false,
      internal_prompt: [input.profile?.text_style_rules, input.command_text].filter(Boolean).join("\n"),
      post_caption: `${input.profile?.project_name || input.project_key}: ${input.command_text}`,
    };
  },
  async generateIllustrationLayer() {
    return {
      enabled: true,
      asset_path: "",
      locked: false,
    };
  },
  async generateBackgroundLayer() {
    return {
      enabled: true,
      asset_path: "",
      locked: false,
    };
  },
  async generateStyleBaseImage() {
    return {
      enabled: true,
      asset_path: "",
      locked: false,
    };
  },
  async generateCharacterLayer(input) {
    return {
      enabled: true,
      asset_path: input.visual_job?.character_layer?.asset_path,
      generated_asset_path: input.visual_job?.character_layer?.generated_asset_path,
      source: input.visual_job?.character_layer?.source || "asset",
      locked: input.visual_job?.character_layer?.locked,
      warnings: ["image reference/edit not available in current provider; locked character preserved"],
    };
  },
  async generateTitleImageLayer(input) {
    return {
      enabled: true,
      text: input.visual_job?.title_image_layer?.text || input.visual_job?.text_layer?.text || input.command_text,
      source: "composer_fallback",
      transparent_background: true,
      warnings: ["AI title image generation unavailable in mock provider; using composer_fallback"],
    };
  },
};
