import path from "node:path";
import { composeVisualJob } from "../compose";
import { reviseVisualJob, type RevisionTarget } from "../revision";
import { FileVisualJobStore, nextOutputVersion } from "../store";
import { safeFilename } from "../utils/safeFilename";
import type { UploadedAsset } from "../jobBuilder";
import { qualityCheckVisual } from "../quality";

export interface ReviseProducedVisualInput {
  job_id: string;
  target: RevisionTarget;
  instruction: string;
  uploaded_assets?: UploadedAsset[];
  options?: {
    enable_ai?: boolean;
  };
}

export interface ReviseProducedVisualResult {
  ok: true;
  job_id: string;
  version: number;
  target: RevisionTarget;
  visual_job: Awaited<ReturnType<typeof reviseVisualJob>>["visual_job"];
  output_url: string;
  output_path: string;
  width: number;
  height: number;
  post_caption?: string;
  warnings: string[];
}

function outputFor(jobId: string, target: RevisionTarget, version: number) {
  const fileName = `${Date.now()}-${safeFilename(jobId)}-v${version}-${safeFilename(target)}.png`;
  return {
    outputPath: path.join(process.cwd(), "public", "generated", "visual", fileName),
    outputUrl: `/generated/visual/${fileName}`,
  };
}

export async function reviseProducedVisual(input: ReviseProducedVisualInput): Promise<ReviseProducedVisualResult> {
  const store = new FileVisualJobStore();
  const record = await store.get(input.job_id);
  if (!record) throw new Error("Visual job not found.");

  const version = nextOutputVersion(record);
  const revision = await reviseVisualJob({
    visual_job: record.visual_job,
    target: input.target,
    instruction: input.instruction,
    uploaded_assets: input.uploaded_assets || [],
    options: {
      enable_ai: Boolean(input.options?.enable_ai),
    },
  });
  const previousJob = structuredClone(record.visual_job);
  const { outputPath, outputUrl } = outputFor(input.job_id, input.target, version);
  const composeResult = await composeVisualJob({ ...revision.visual_job, output_path: outputPath });
  const quality = qualityCheckVisual({
    visual_job: revision.visual_job,
    compose_result: composeResult,
    previous_job: previousJob,
    revision_target: input.target,
  });
  const now = new Date().toISOString();

  record.visual_job = { ...revision.visual_job, output_path: outputPath };
  record.image_text = {
    title: record.visual_job.text_layer?.text,
    subtitle: record.visual_job.text_layer?.subtitle,
    sticker: record.visual_job.text_layer?.sticker,
  };
  record.post_caption = record.visual_job.post_caption || record.visual_job.text_layer?.post_caption || record.post_caption;
  record.internal_prompt = record.visual_job.internal_prompt || record.visual_job.text_layer?.internal_prompt || record.internal_prompt;
  record.outputs.push({
    version,
    output_path: composeResult.output_path,
    output_url: outputUrl,
    width: composeResult.width,
    height: composeResult.height,
    created_at: now,
  });
  record.layers[input.target === "format" ? "layout" : input.target].last_updated_at = now;
  record.history.push({
    type: "revised",
    message: `${input.target}: ${input.instruction}`,
    created_at: now,
  });
  await store.update(record);

  return {
    ok: true,
    job_id: input.job_id,
    version,
    target: input.target,
    visual_job: record.visual_job,
    output_url: outputUrl,
    output_path: composeResult.output_path,
    width: composeResult.width,
    height: composeResult.height,
    post_caption: record.post_caption,
    warnings: [...revision.warnings, ...composeResult.warnings, ...quality.warnings, ...quality.critical],
  };
}
