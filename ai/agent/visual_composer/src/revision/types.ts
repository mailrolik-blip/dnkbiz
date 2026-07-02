import type { OutputFormat, VisualJob } from "../types";
import type { UploadedAsset } from "../jobBuilder";

export type RevisionTarget = "text" | "illustration" | "background" | "layout" | "format";

export interface ReviseVisualJobInput {
  visual_job: VisualJob;
  target: RevisionTarget;
  instruction: string;
  uploaded_assets?: UploadedAsset[];
  options?: {
    enable_ai?: boolean;
    output_format?: OutputFormat;
  };
}

export interface ReviseVisualJobResult {
  ok: boolean;
  visual_job: VisualJob;
  target: RevisionTarget;
  warnings: string[];
  changed_layers: RevisionTarget[];
}

export interface ParsedRevisionInstruction {
  replacement_text?: string;
  remove_layer?: boolean;
  requested_variant?: string;
  requested_format?: OutputFormat;
}
