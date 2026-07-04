export type VisualProjectKey = "monopoly" | "monopoly_pay" | "casper" | "gorilla_hockey" | "dnk";

export type VisualMode =
  | "composer"
  | "style_generation"
  | "hockey_generated_poster"
  | "hockey_photo_template"
  | "hockey_print_layout"
  | "post_generation";

export type OutputFormat =
  | "square"
  | "story"
  | "vk_post"
  | "print_a4"
  | "print_a5"
  | "wide_1920x1080"
  | "square_1024x1024"
  | "square_1080x1080"
  | "vertical_1080x1350"
  | "story_1080x1920";
export type OutputPreset =
  | "wide_1920x1080"
  | "square_1024x1024"
  | "square_1080x1080"
  | "vertical_1080x1350"
  | "story_1080x1920"
  | "print_a4"
  | "print_a5";

export type VisualLayerSource = "asset" | "ai" | "fallback" | "composer_fallback";

export interface TextLayer {
  enabled: boolean;
  text?: string;
  subtitle?: string;
  sticker?: string;
  body?: string;
  cta?: string;
  contacts?: string;
  post_caption?: string;
  internal_prompt?: string;
  warnings?: string[];
  variant?: string;
  position?: "top" | "bottom" | "center" | "overlay";
  locked?: boolean;
}

export interface IllustrationLayer {
  enabled: boolean;
  asset_path?: string;
  position?: "center" | "bottom" | "top" | "cover";
  locked?: boolean;
  generated_by_ai?: boolean;
  prompt_used?: string;
  model?: string;
  warnings?: string[];
}

export interface BackgroundLayer {
  enabled: boolean;
  asset_path?: string;
  generated_asset_path?: string;
  lock_policy?: "locked" | "reference_only" | "replaceable" | "optional";
  position?: "center" | "cover" | "contain" | "top" | "bottom";
  fit?: "cover" | "contain";
  opacity?: number;
  source?: VisualLayerSource;
  locked?: boolean;
  generated_by_ai?: boolean;
  prompt_used?: string;
  model?: string;
  warnings?: string[];
}

export interface CharacterLayer {
  enabled: boolean;
  asset_path?: string;
  generated_asset_path?: string;
  role?: "main_character" | "secondary_character";
  lock_policy?: "locked" | "reference_only" | "replaceable" | "optional";
  position?: "center" | "left" | "right" | "bottom";
  scale?: number;
  fit?: "contain" | "cover";
  source?: VisualLayerSource;
  locked?: boolean;
  warnings?: string[];
}

export interface TitleImageLayer {
  enabled: boolean;
  text: string;
  asset_path?: string;
  generated_asset_path?: string;
  transparent_background?: boolean;
  style_ref_asset_path?: string;
  source?: "asset" | "ai" | "composer_fallback";
  position?: "top" | "bottom" | "left" | "right" | "center";
  scale?: number;
  fit?: "contain" | "cover";
  revision_state?: string;
  warnings?: string[];
}

export interface LogoLayer {
  enabled: boolean;
  asset_path?: string;
  position?: "top_left" | "top_right" | "bottom_left" | "bottom_right";
  scale?: number;
  fit?: "contain";
  lock_policy?: "locked" | "reference_only" | "replaceable" | "optional";
  source?: VisualLayerSource;
}

export interface DecorLayer {
  enabled: boolean;
  icons?: string[];
  pills?: string[];
  assets?: string[];
  source?: VisualLayerSource;
}

export interface FinalComposite {
  output_path?: string;
  output_url?: string;
  width?: number;
  height?: number;
  delivery_mode?: "preview" | "document" | "preview_and_document";
}

export interface LayoutConfig {
  variant: string;
  width?: number;
  height?: number;
  safe_area?: number;
}

export interface BrandElement {
  logo_path?: string;
  qr_path?: string;
  colors?: {
    primary?: string;
    accent?: string;
    dark?: string;
    light?: string;
  };
  website?: string;
  contacts?: string;
}

export interface VisualJob {
  job_type: "visual_production";
  project_key: VisualProjectKey;
  visual_mode: VisualMode;
  source_text?: string;
  output_format: OutputFormat;
  text_layer?: TextLayer;
  illustration_layer?: IllustrationLayer;
  background_layer?: BackgroundLayer;
  character_layer?: CharacterLayer;
  title_image_layer?: TitleImageLayer;
  logo_layer?: LogoLayer;
  decor_layer?: DecorLayer;
  final_composite?: FinalComposite;
  layout: LayoutConfig;
  brand?: BrandElement;
  style_assets?: {
    main_character?: string;
    logo?: string;
    background?: string;
    reference?: string;
    title_style_reference?: string;
    template?: string;
    icon?: string;
    icons?: string[];
    references?: string[];
    locked_assets?: string[];
    warnings?: string[];
  };
  profile?: ProjectProfileSnapshot;
  post_caption?: string;
  internal_prompt?: string;
  output_path?: string;
}

export interface ComposeResult {
  ok: boolean;
  output_path: string;
  width: number;
  height: number;
  project_key: VisualProjectKey;
  visual_mode: VisualMode;
  layout_variant: string;
  warnings: string[];
}

export interface RenderContext {
  repoRoot: string;
  composerRoot: string;
  outputPath: string;
  warnings: string[];
}

export interface ProjectProfileSnapshot {
  project_key: VisualProjectKey;
  project_name: string;
  default_mode: string;
  allowed_modes: string[];
  text_style_rules: string;
  image_style_rules: string;
  composition_rules: string;
  negative_rules: string;
  asset_rules: string;
  layout_presets: string[];
  output_formats: string[];
  revision_commands: string[];
  telegram_examples: string[];
  quality_check_rules: string[];
  contacts?: {
    site?: string;
    phone?: string;
    city?: string;
  };
}
