import type { OutputFormat, VisualJob, VisualMode, VisualProjectKey } from "../types";

export interface VisualJobOutputRecord {
  version: number;
  output_path: string;
  output_url: string;
  width: number;
  height: number;
  created_at: string;
}

export interface VisualJobLayerState {
  locked: boolean;
  last_updated_at: string;
}

export interface VisualJobHistoryRecord {
  type: "created" | "revised" | "composed";
  message: string;
  created_at: string;
}

export interface VisualJobRecord {
  job_id: string;
  created_at: string;
  updated_at: string;
  source: {
    command_text: string;
    chat_id?: string;
    user_id?: string;
  };
  detected: {
    project_key: VisualProjectKey;
    visual_mode: VisualMode;
    output_format: OutputFormat;
  };
  visual_job: VisualJob;
  image_text?: {
    title?: string;
    subtitle?: string;
    sticker?: string;
  };
  post_caption?: string;
  internal_prompt?: string;
  quality_warnings?: string[];
  asset_selection_log?: string[];
  ai_generation_log?: string[];
  compose_log?: string[];
  outputs: VisualJobOutputRecord[];
  layers: {
    text: VisualJobLayerState;
    illustration: VisualJobLayerState;
    background: VisualJobLayerState;
    layout: VisualJobLayerState;
  };
  history: VisualJobHistoryRecord[];
}

export interface SaveVisualJobRecordInput {
  record: VisualJobRecord;
}

export interface VisualJobStore {
  get(jobId: string): Promise<VisualJobRecord | null>;
  save(input: SaveVisualJobRecordInput): Promise<VisualJobRecord>;
  update(record: VisualJobRecord): Promise<VisualJobRecord>;
}
