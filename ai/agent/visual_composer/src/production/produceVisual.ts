import path from "node:path";
import { randomUUID } from "node:crypto";
import { composeWithVisualQaRepair } from "./composeWithVisualQa";
import { runVisualProductionPipeline } from "./runVisualProductionPipeline";
import { buildVisualJobFromCommand, type BuildVisualJobInput } from "../jobBuilder";
import { createVisualJobRecord, FileVisualJobStore } from "../store";
import { safeFilename } from "../utils/safeFilename";
import { qualityCheckVisual } from "../quality";
import { getVisualPipelineMode, VisualProductionEngine } from "../engine/VisualProductionEngine";

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
  if (getVisualPipelineMode() === "hybrid_economy") {
    const engine = new VisualProductionEngine();
    const result = await engine.run({
      user_id: input.source?.user_id,
      brand_key: input.project_key || undefined,
      command_text: input.command_text,
      channel_context: { channel: input.source?.chat_id ? "telegram" : "api", chat_id: input.source?.chat_id },
      uploaded_assets: input.uploaded_assets || [],
      options: { enable_ai: Boolean(input.options?.enable_ai) },
      asset_manifest: input.asset_manifest,
    });
    return {
      ok: true,
      job_id: result.job_id,
      version: 1,
      detected: result.detected,
      visual_job: result.visual_job,
      output_url: result.output_url,
      output_path: result.output_path,
      width: result.visual_job.final_composite?.width || 0,
      height: result.visual_job.final_composite?.height || 0,
      post_caption: result.visual_job.post_caption,
      available_revisions: ["text", "title_image", "character", "background", "layout", "format"],
      warnings: result.warnings,
    };
  }

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
  const productionPipeline = await runVisualProductionPipeline({
    command_text: commandText,
    visual_job: buildResult.visual_job,
    manifest: input.asset_manifest,
    enable_ai: Boolean(input.options?.enable_ai),
    job_id: jobId,
  });
  buildResult.visual_job = productionPipeline.visual_job;
  if (productionPipeline.logs.length) buildResult.warnings.push(...productionPipeline.logs);
  const qaCompose = await composeWithVisualQaRepair({ ...buildResult.visual_job, output_path: outputPath });
  const composeResult = qaCompose.compose_result;
  buildResult.visual_job = qaCompose.visual_job;
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
  const warnings = [...buildResult.warnings, ...composeResult.warnings, ...quality.warnings, ...quality.critical, ...qaCompose.qa.errors.map((item) => item.code), ...qaCompose.qa.warnings.map((item) => item.code)];
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
    buildResult.visual_job.title_image_layer?.source === "ai" ? "title_image AI generated" : `title_image ${buildResult.visual_job.title_image_layer?.source || "none"}`,
    buildResult.visual_job.illustration_layer?.warnings?.join("; ") || "",
    buildResult.visual_job.background_layer?.warnings?.join("; ") || "",
    buildResult.visual_job.title_image_layer?.warnings?.join("; ") || "",
    `pipeline_route=${buildResult.visual_job.production?.pipeline_route || "-"}`,
    `production_mode=${buildResult.visual_job.production?.mode || "-"}`,
    `production_phase=${buildResult.visual_job.production?.phase || "-"}`,
    `production_plan=${JSON.stringify(buildResult.visual_job.production?.plan || {})}`,
    `title_attempts=${buildResult.visual_job.production?.title_attempts ?? "-"}`,
    `title_verified=${buildResult.visual_job.production?.title_verified ?? "-"}`,
    `character_attempts=${buildResult.visual_job.production?.character_attempts ?? "-"}`,
    `character_source=${buildResult.visual_job.production?.character_source ?? "-"}`,
    `character_identity_reference_source=${buildResult.visual_job.production?.character_identity_reference_source ?? "-"}`,
    `character_consistency_score=${buildResult.visual_job.production?.character_consistency_score ?? "-"}`,
    `image_edit_model=${buildResult.visual_job.production?.image_edit_model ?? "-"}`,
    `image_edit_optional_params_applied=${buildResult.visual_job.production?.image_edit_optional_params_applied?.join(",") || "-"}`,
    `image_edit_optional_params_skipped=${buildResult.visual_job.production?.image_edit_optional_params_skipped ? JSON.stringify(buildResult.visual_job.production.image_edit_optional_params_skipped) : "-"}`,
    `image_calls_this_job=${buildResult.visual_job.production?.image_calls_this_job ?? 0}`,
  ];
  record.compose_log = [
    `layout=${record.visual_job.layout.variant}`,
    `output=${composeResult.output_path}`,
    `size=${composeResult.width}x${composeResult.height}`,
    `qa_errors=${qaCompose.qa.errors.length}`,
    `qa_warnings=${qaCompose.qa.warnings.length}`,
    `repair_actions=${qaCompose.repair_actions.join(" | ") || "-"}`,
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
    available_revisions: ["text", "title_image", "character", "illustration", "background", "layout", "format"],
    warnings,
  };
}
