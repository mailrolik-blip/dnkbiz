import type { OutputFormat, ProjectProfileSnapshot, VisualJob, VisualMode, VisualProjectKey } from "../types";
import type { ProjectAssetManifest } from "../assets/types";

export interface UploadedAsset {
  type: "photo" | "background" | "illustration" | "logo" | "qr";
  asset_path: string;
  id?: string;
  tags?: string[];
}

export interface BuildVisualJobInput {
  command_text: string;
  project_key?: VisualProjectKey | "";
  visual_mode?: VisualMode | "";
  output_format?: OutputFormat | "";
  uploaded_assets?: UploadedAsset[];
  asset_manifest?: ProjectAssetManifest;
  profile?: ProjectProfileSnapshot;
  options?: {
    enable_ai?: boolean;
    layout_variant?: string;
  };
}

export interface VisualJobBuildResult {
  ok: boolean;
  visual_job: VisualJob;
  detected: {
    project_key: VisualProjectKey;
    visual_mode: VisualMode;
    output_format: OutputFormat;
  };
  warnings: string[];
}

export interface TextLayerParts {
  title: string;
  subtitle?: string;
  cta?: string;
  sticker?: string;
  body?: string;
  contacts?: string;
  post_caption?: string;
  internal_prompt?: string;
}
