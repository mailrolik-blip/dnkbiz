import type { VisualMode, VisualProjectKey } from "../types";

export type VisualAssetType =
  | "background"
  | "illustration"
  | "logo"
  | "reference"
  | "template"
  | "photo"
  | "qr"
  | "icon";

export interface VisualAsset {
  id: string;
  project_key: VisualProjectKey;
  type: VisualAssetType;
  path: string;
  tags: string[];
  usage: string;
  description: string;
  safe_for_auto_use: boolean;
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
  tags?: string[];
  manifest?: ProjectAssetManifest;
}

export interface AssetSelectionResult {
  ok: boolean;
  asset: VisualAsset | null;
  asset_path: string;
  is_placeholder: boolean;
  warnings: string[];
}
