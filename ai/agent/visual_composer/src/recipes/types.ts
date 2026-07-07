import type { OutputPreset, VisualProjectKey } from "../types";

export type TitleStrategy = "local_renderer" | "asset" | "ai";
export type CharacterStrategy = "locked_asset" | "reference_edit" | "ai_generate";
export type BackgroundStrategy = "fixed_asset" | "palette_asset" | "ai_generate";
export type OverallRecipeStrategy = "template_character" | "one_shot" | "photo_template";

export interface VisualRecipe {
  key: string;
  brand_key: VisualProjectKey;
  version: string;
  output_preset: OutputPreset;
  overall_strategy: OverallRecipeStrategy;
  title: {
    strategy: TitleStrategy;
    renderer_key?: string;
    style_config?: string;
  };
  character: {
    strategy: CharacterStrategy;
    identity_asset_role?: string;
    provider_route?: string;
    max_ai_calls: number;
  };
  background: {
    strategy: BackgroundStrategy;
    asset_role?: string;
    palette?: string[];
  };
  logo: {
    strategy: "locked_asset" | "approved_asset" | "none";
    asset_role?: string;
  };
  decor: {
    strategy: "approved_assets" | "none";
    allowed_roles: string[];
  };
  composition: {
    template_key: string;
    placement_rules: string[];
  };
  cost_policy: {
    max_ai_image_calls_per_job: number;
    allow_automatic_retry: boolean;
    require_explicit_paid_retry: boolean;
  };
}

export interface PaidActionMetadata {
  requires_ai_call: boolean;
  estimated_calls: number;
  explicit_paid_action?: boolean;
  action_key?: string;
}
