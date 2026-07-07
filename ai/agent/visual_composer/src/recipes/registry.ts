import type { VisualProjectKey } from "../types";
import type { VisualRecipe } from "./types";

export const visualRecipes: VisualRecipe[] = [
  {
    key: "monopoly_social_wide_v1",
    brand_key: "monopoly",
    version: "1.0.0",
    output_preset: "wide_1920x1080",
    overall_strategy: "template_character",
    title: { strategy: "local_renderer", renderer_key: "monopoly_psd_style_v1", style_config: "monopoly-title-style-v1.json" },
    character: { strategy: "locked_asset", identity_asset_role: "main_character", provider_route: "monopoly_character", max_ai_calls: 1 },
    background: { strategy: "fixed_asset", asset_role: "background", palette: [] },
    logo: { strategy: "approved_asset", asset_role: "brand_logo" },
    decor: { strategy: "approved_assets", allowed_roles: ["decor", "icon"] },
    composition: { template_key: "monopoly_hero_title_left_character_right", placement_rules: ["large title left/center", "character right", "project safe areas"] },
    cost_policy: { max_ai_image_calls_per_job: 1, allow_automatic_retry: false, require_explicit_paid_retry: true },
  },
  {
    key: "monopoly_pay_social_wide_v1",
    brand_key: "monopoly_pay",
    version: "1.0.0",
    output_preset: "wide_1920x1080",
    overall_strategy: "template_character",
    title: { strategy: "local_renderer", renderer_key: "pay_display_title_v1", style_config: "pay-title-style-v1.json" },
    character: { strategy: "locked_asset", identity_asset_role: "main_character", provider_route: "pay_character", max_ai_calls: 1 },
    background: { strategy: "palette_asset", asset_role: "background", palette: ["green", "orange", "blue", "red"] },
    logo: { strategy: "locked_asset", asset_role: "brand_logo" },
    decor: { strategy: "approved_assets", allowed_roles: ["decor", "icon", "cta"] },
    composition: { template_key: "pay_title_left_character_right", placement_rules: ["display title left", "character right", "local chips/CTA only"] },
    cost_policy: { max_ai_image_calls_per_job: 1, allow_automatic_retry: false, require_explicit_paid_retry: true },
  },
  {
    key: "casper_one_shot_v1",
    brand_key: "casper",
    version: "1.0.0",
    output_preset: "wide_1920x1080",
    overall_strategy: "one_shot",
    title: { strategy: "local_renderer", renderer_key: "pay_display_title_v1", style_config: "pay-title-style-v1.json" },
    character: { strategy: "ai_generate", provider_route: "casper_one_shot", max_ai_calls: 1 },
    background: { strategy: "ai_generate", asset_role: "scene", palette: [] },
    logo: { strategy: "approved_asset", asset_role: "brand_logo" },
    decor: { strategy: "none", allowed_roles: [] },
    composition: { template_key: "simple_overlay_wide", placement_rules: ["one AI scene", "optional local exact title overlay", "local logo"] },
    cost_policy: { max_ai_image_calls_per_job: 1, allow_automatic_retry: false, require_explicit_paid_retry: true },
  },
  {
    key: "gorilla_hockey_photo_template_v1",
    brand_key: "gorilla_hockey",
    version: "1.0.0",
    output_preset: "square_1024x1024",
    overall_strategy: "photo_template",
    title: { strategy: "local_renderer", renderer_key: "pay_display_title_v1", style_config: "pay-title-style-v1.json" },
    character: { strategy: "locked_asset", provider_route: "hockey_edit", max_ai_calls: 1 },
    background: { strategy: "fixed_asset", asset_role: "photo", palette: [] },
    logo: { strategy: "approved_asset", asset_role: "brand_logo" },
    decor: { strategy: "approved_assets", allowed_roles: ["frame", "texture"] },
    composition: { template_key: "hockey_poster_photo_v1", placement_rules: ["crop photo", "brand overlays", "frame", "title", "logo"] },
    cost_policy: { max_ai_image_calls_per_job: 1, allow_automatic_retry: false, require_explicit_paid_retry: true },
  },
];

export class VisualRecipeRegistry {
  constructor(private readonly recipes: VisualRecipe[] = visualRecipes) {}

  getByKey(key: string): VisualRecipe {
    const recipe = this.recipes.find((item) => item.key === key);
    if (!recipe) throw new Error(`Visual recipe not found: ${key}`);
    return recipe;
  }

  resolve(input: { brand_key: VisualProjectKey; requested_recipe_key?: string }): VisualRecipe {
    if (input.requested_recipe_key) return this.getByKey(input.requested_recipe_key);
    const recipe = this.recipes.find((item) => item.brand_key === input.brand_key);
    if (!recipe) throw new Error(`No visual recipe configured for brand: ${input.brand_key}`);
    return recipe;
  }

  list(): VisualRecipe[] {
    return [...this.recipes];
  }
}
