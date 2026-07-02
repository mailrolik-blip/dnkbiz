import type { ComposeResult, VisualJob, VisualProjectKey, VisualMode } from "../types";

export interface QualityCheckInput {
  visual_job: VisualJob;
  compose_result?: ComposeResult;
  expected?: {
    project_key?: VisualProjectKey;
    visual_mode?: VisualMode;
    uploaded_photo_required?: boolean;
  };
  previous_job?: VisualJob;
  revision_target?: "text" | "illustration" | "background" | "layout" | "format";
}

export interface QualityCheckResult {
  ok: boolean;
  warnings: string[];
  critical: string[];
}
