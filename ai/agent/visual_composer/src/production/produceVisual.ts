import path from "node:path";
import { randomUUID } from "node:crypto";
import { composeVisualJob } from "../compose";
import { buildVisualJobFromCommand, type BuildVisualJobInput } from "../jobBuilder";
import { createVisualJobRecord, FileVisualJobStore } from "../store";
import { safeFilename } from "../utils/safeFilename";
import { qualityCheckVisual } from "../quality";

export interface ProduceVisualInput extends BuildVisualJobInput {
  source?: {
    chat_id?: string;
    user_id?: string;
  };
}

export interface ProduceVisualResult {
  ok: true;
  job_id: string;
  version: number;
  detected: Awaited<ReturnType<typeof buildVisualJobFromCommand>>["detected"];
  visual_job: Awaited<ReturnType<typeof buildVisualJobFromCommand>>["visual_job"];
  output_url: string;
  output_path: string;
  width: number;
  height: number;
  post_caption?: string;
  available_revisions: string[];
  warnings: string[];
}

function buildPublicOutput(projectKey: string, layoutVariant: string, jobId: string) {
  const fileName = `${Date.now()}-${safeFilename(projectKey)}-${safeFilename(layoutVariant)}-${safeFilename(jobId)}.png`;
  return {
    outputPath: path.join(process.cwd(), "public", "generated", "visual", fileName),
    relativeUrl: `/generated/visual/${fileName}`,
  };
}

export async function produceVisualFromCommand(input: ProduceVisualInput): Promise<ProduceVisualResult> {
  const commandText = input.command_text.trim();
  const buildResult = await buildVisualJobFromCommand({
    command_text: commandText,
    project_key: input.project_key || "",
    visual_mode: input.visual_mode || "",
    output_format: input.output_format || "",
    uploaded_assets: input.uploaded_assets || [],
    asset_manifest: input.asset_manifest,
    options: {
      enable_ai: Boolean(input.options?.enable_ai),
      layout_variant: input.options?.layout_variant || "auto",
    },
  });
  const jobId = randomUUID();
  const { outputPath, relativeUrl } = buildPublicOutput(
    buildResult.visual_job.project_key,
    buildResult.visual_job.layout.variant,
    jobId,
  );
  const composeResult = await composeVisualJob({ ...buildResult.visual_job, output_path: outputPath });
  buildResult.visual_job.final_composite = {
    ...(buildResult.visual_job.final_composite || {}),
    output_path: composeResult.output_path,
    output_url: relativeUrl,
    width: composeResult.width,
    height: composeResult.height,
    delivery_mode: buildResult.visual_job.output_format === "print_a4" || buildResult.visual_job.output_format === "print_a5" ? "document" : "preview",
  };
  const quality = qualityCheckVisual({
    visual_job: buildResult.visual_job,
    compose_result: composeResult,
    expected: {
      project_key: buildResult.detected.project_key,
      visual_mode: buildResult.detected.visual_mode,
      uploaded_photo_required: buildResult.detected.visual_mode === "hockey_photo_template",
    },
  });
  const warnings = [...buildResult.warnings, ...composeResult.warnings, ...quality.warnings, ...quality.critical];
  const output = {
    version: 1,
    output_path: composeResult.output_path,
    output_url: relativeUrl,
    width: composeResult.width,
    height: composeResult.height,
    created_at: new Date().toISOString(),
  };
  const record = createVisualJobRecord({
    job_id: jobId,
    command_text: commandText,
    chat_id: input.source?.chat_id,
    user_id: input.source?.user_id,
    detected: buildResult.detected,
    visual_job: { ...buildResult.visual_job, output_path: outputPath },
    output,
    message: "Produced visual from command.",
  });
  await new FileVisualJobStore().save({ record });
  record.quality_warnings = [...quality.warnings, ...quality.critical];
  record.asset_selection_log = buildResult.warnings.filter((warning) => warning.includes("asset") || warning.includes("Asset") || warning.includes("selected=") || warning.includes("candidates="));
  record.ai_generation_log = [
    input.options?.enable_ai ? "AI requested" : "AI skipped: VISUAL_BOT_ENABLE_AI=false",
    process.env.OPENAI_API_KEY ? "OPENAI_API_KEY present" : "OPENAI_API_KEY missing",
    buildResult.visual_job.illustration_layer?.generated_by_ai ? `illustration AI model=${buildResult.visual_job.illustration_layer.model || "-"}` : "illustration fallback/manual",
    buildResult.visual_job.background_layer?.generated_by_ai ? `background AI model=${buildResult.visual_job.background_layer.model || "-"}` : "background fallback/manual",
    buildResult.visual_job.illustration_layer?.warnings?.join("; ") || "",
    buildResult.visual_job.background_layer?.warnings?.join("; ") || "",
  ];
  record.compose_log = [
    `layout=${record.visual_job.layout.variant}`,
    `output=${composeResult.output_path}`,
    `size=${composeResult.width}x${composeResult.height}`,
    ...composeResult.warnings.filter((warning) => warning.startsWith("composer_usage")),
  ];
  await new FileVisualJobStore().update(record);

  return {
    ok: true,
    job_id: jobId,
    version: 1,
    detected: buildResult.detected,
    visual_job: record.visual_job,
    output_url: relativeUrl,
    output_path: composeResult.output_path,
    width: composeResult.width,
    height: composeResult.height,
    post_caption: record.post_caption,
    available_revisions: ["text", "illustration", "background", "layout", "format"],
    warnings,
  };
}
