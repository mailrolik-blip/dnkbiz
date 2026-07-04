import type { VisualMode, VisualProjectKey } from "../types";

export type VisualAssetType =
  | "background"
  | "character"
  | "illustration"
  | "logo"
  | "reference"
  | "template"
  | "photo"
  | "qr"
  | "icon"
  | "print";

export interface VisualAsset {
  id: string;
  project_key: VisualProjectKey;
  type: VisualAssetType;
  role?:
    | "main_character"
    | "secondary_character"
    | "brand_logo"
    | "style_reference"
    | "background"
    | "composition_reference"
    | "title_style_reference";
  path: string;
  tags: string[];
  usage: string;
  description: string;
  safe_for_auto_use: boolean;
  priority?: number;
  lock_policy?: "locked" | "reference_only" | "replaceable" | "optional";
  recommended_modes?: VisualMode[];
  negative_notes?: string;
  notes?: string;
  created_at?: string;
}

export interface ProjectAssetManifest {
  version: string;
  assets: VisualAsset[];
}

export interface AssetSelectionRequest {
  project_key: VisualProjectKey;
  visual_mode?: VisualMode;
  asset_type: VisualAssetType;
  role?: VisualAsset["role"];
  lock_policy?: VisualAsset["lock_policy"];
  tags?: string[];
  manifest?: ProjectAssetManifest;
}

export interface AssetSelectionResult {
  ok: boolean;
  asset: VisualAsset | null;
  asset_path: string;
  is_placeholder: boolean;
  warnings: string[];
  selection_log?: string[];
}
