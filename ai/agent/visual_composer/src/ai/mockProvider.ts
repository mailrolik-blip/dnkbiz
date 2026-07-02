import type { VisualAiProvider } from "./types";

export const mockAiProvider: VisualAiProvider = {
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
};
