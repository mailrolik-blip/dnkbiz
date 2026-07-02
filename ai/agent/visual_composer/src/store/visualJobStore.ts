import type { VisualJobOutputRecord, VisualJobRecord } from "./types";
import type { OutputFormat, VisualJob, VisualMode, VisualProjectKey } from "../types";

export function createVisualJobRecord(input: {
  job_id: string;
  command_text: string;
  chat_id?: string;
  user_id?: string;
  detected: {
    project_key: VisualProjectKey;
    visual_mode: VisualMode;
    output_format: OutputFormat;
  };
  visual_job: VisualJob;
  output: VisualJobOutputRecord;
  message?: string;
}): VisualJobRecord {
  const now = new Date().toISOString();
  return {
    job_id: input.job_id,
    created_at: now,
    updated_at: now,
    source: {
      command_text: input.command_text,
      chat_id: input.chat_id,
      user_id: input.user_id,
    },
    detected: input.detected,
    visual_job: input.visual_job,
    image_text: {
      title: input.visual_job.text_layer?.text,
      subtitle: input.visual_job.text_layer?.subtitle,
      sticker: input.visual_job.text_layer?.sticker,
    },
    post_caption: input.visual_job.post_caption || input.visual_job.text_layer?.post_caption,
    internal_prompt: input.visual_job.internal_prompt || input.visual_job.text_layer?.internal_prompt,
    outputs: [input.output],
    layers: {
      text: { locked: Boolean(input.visual_job.text_layer?.locked), last_updated_at: now },
      illustration: { locked: Boolean(input.visual_job.illustration_layer?.locked), last_updated_at: now },
      background: { locked: Boolean(input.visual_job.background_layer?.locked), last_updated_at: now },
      layout: { locked: false, last_updated_at: now },
    },
    history: [
      {
        type: "created",
        message: input.message || "Visual job created.",
        created_at: now,
      },
    ],
  };
}

export function nextOutputVersion(record: VisualJobRecord): number {
  return record.outputs.reduce((max, output) => Math.max(max, output.version), 0) + 1;
}
