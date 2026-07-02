import path from "node:path";
import { composeVisualJob } from "../compose";
import { getVisualAiProvider } from "../ai";
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
  if (input.options?.enable_ai && input.target !== "layout" && input.target !== "format") {
    const provider = getVisualAiProvider(true);
    const aiInput = {
      command_text: `${record.source.command_text}\nRevision: ${input.instruction}`,
      project_key: record.detected.project_key,
      visual_mode: record.detected.visual_mode,
      profile: record.visual_job.profile,
      visual_job: revision.visual_job,
      revision_target: input.target,
      enable_ai: true,
    };
    if (input.target === "illustration" && record.detected.visual_mode !== "hockey_photo_template") {
      const aiLayer = await provider.generateIllustrationLayer(aiInput);
      if (aiLayer.asset_path) revision.visual_job.illustration_layer = { enabled: true, ...revision.visual_job.illustration_layer, ...aiLayer };
      if (aiLayer.warnings?.length) revision.warnings.push(...aiLayer.warnings);
    }
    if (input.target === "background" && record.detected.visual_mode !== "hockey_photo_template") {
      const aiLayer = record.detected.project_key === "casper"
        ? await (provider.generateStyleBaseImage?.(aiInput) || provider.generateBackgroundLayer(aiInput))
        : await provider.generateBackgroundLayer(aiInput);
      if (aiLayer.asset_path) revision.visual_job.background_layer = { enabled: true, ...revision.visual_job.background_layer, ...aiLayer };
      if (aiLayer.warnings?.length) revision.warnings.push(...aiLayer.warnings);
    }
    if (input.target === "text" && shouldUseAiForText(input.instruction)) {
      const aiText = await provider.generateTextLayer(aiInput);
      revision.visual_job.text_layer = {
        ...(revision.visual_job.text_layer || { enabled: true }),
        ...aiText,
        enabled: true,
      };
      revision.visual_job.post_caption = aiText.post_caption || revision.visual_job.post_caption;
      if (aiText.warnings?.length) revision.warnings.push(...aiText.warnings);
    }
  }
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
  record.quality_warnings = [...(record.quality_warnings || []), ...quality.warnings, ...quality.critical];
  record.ai_generation_log = [
    ...(record.ai_generation_log || []),
    input.options?.enable_ai ? `AI requested for ${input.target}` : `AI skipped for ${input.target}: VISUAL_BOT_ENABLE_AI=false`,
  ];
  record.compose_log = [...(record.compose_log || []), `v${version} layout=${record.visual_job.layout.variant} output=${composeResult.output_path}`];
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

function shouldUseAiForText(instruction: string): boolean {
  return /продающ|смешн|короч|лучше|вариант|перепиши|улучши/iu.test(instruction);
}
