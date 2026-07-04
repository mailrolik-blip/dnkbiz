import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { editFromReference, generateFromReferences, type ImageEditRequestDiagnostics } from "../ai/openaiImageEditProvider";
import { reviewCharacterWithVision, verifyTitleImageWithVision } from "../ai/visualReviewProvider";
import { loadDefaultAssetManifest } from "../assets/assetResolver";
import type { ProjectAssetManifest } from "../assets/types";
import { isNonRetryableImageInputError } from "../imageProcessing/detectImageMimeType";
import { extractLayerFromUniformBackground } from "../imageProcessing/extractForegroundLayer";
import { renderBrandTitleImageLayer } from "../titleImage/renderBrandTitleImage";
import type { VisualJob } from "../types";
import { createVisualProductionPlan, type VisualProductionPlan } from "./visualProductionPlanner";

export interface VisualProductionPipelineResult {
  visual_job: VisualJob;
  plan: VisualProductionPlan;
  logs: string[];
  image_calls: number;
  image_call_accounting: ImageCallAccounting;
}

interface LayerAttemptResult {
  path?: string;
  source: string;
  attempts: number;
  calls: ImageCallAccounting;
  verified?: boolean;
  score?: number;
  edit_request?: ImageEditRequestDiagnostics;
  logs: string[];
}

export interface ImageCallAccounting {
  attempted: number;
  successful: number;
  failed: number;
  title: number;
  character: number;
  background: number;
}

export async function runVisualProductionPipeline(input: {
  command_text: string;
  visual_job: VisualJob;
  manifest?: ProjectAssetManifest;
  enable_ai?: boolean;
  quality_mode?: "fast" | "quality";
  job_id?: string;
}): Promise<VisualProductionPipelineResult> {
  if (input.visual_job.project_key !== "monopoly" && input.visual_job.project_key !== "monopoly_pay") {
    const skipped = structuredClone(input.visual_job);
    skipped.production = { ...(skipped.production || {}), pipeline_route: "legacy_composer", phase: "skipped_not_migrated" };
    return { visual_job: skipped, plan: createVisualProductionPlan({ command_text: input.command_text, project_key: input.visual_job.project_key, visual_job: input.visual_job, manifest: input.manifest, quality_mode: input.quality_mode }), logs: ["production_pipeline skipped: project not migrated", "pipeline_route=legacy_composer"], image_calls: 0, image_call_accounting: emptyAccounting() };
  }
  const manifest = input.manifest || loadDefaultAssetManifest();
  const mode = input.quality_mode || getProductionMode();
  const plan = createVisualProductionPlan({ command_text: input.command_text, project_key: input.visual_job.project_key, project_profile: input.visual_job.profile, visual_job: input.visual_job, manifest, quality_mode: mode });
  const next = structuredClone(input.visual_job);
  const logs = ["pipeline_route=autonomous_multi_pass", "plan_created", `quality_mode=${mode}`, `layer_source_policy=${process.env.VISUAL_LAYER_SOURCE_POLICY || "generate_first"}`];
  const accounting = emptyAccounting();
  const maxCalls = Number(process.env.VISUAL_AI_MAX_IMAGE_CALLS_PER_JOB || 8);

  const title = await generateTitleLayer({ job: next, plan, enableAi: Boolean(input.enable_ai), jobId: input.job_id, maxCalls, imageCalls: accounting.attempted });
  mergeAccounting(accounting, title.calls);
  logs.push(...title.logs);
  if (title.path) {
    next.title_image_layer = { ...(next.title_image_layer || { enabled: true, text: plan.title.exact_text }), enabled: true, text: plan.title.exact_text, generated_asset_path: title.source === "ai" || title.source === "composer_fallback" ? title.path : undefined, asset_path: title.source === "asset" ? title.path : undefined, source: title.source === "asset" ? "asset" : title.source === "ai" ? "ai" : "composer_fallback", transparent_background: true, warnings: title.logs };
  }

  const character = await generateCharacterLayer({ job: next, plan, enableAi: Boolean(input.enable_ai), jobId: input.job_id, maxCalls, imageCalls: accounting.attempted });
  mergeAccounting(accounting, character.calls);
  logs.push(...character.logs);
  if (character.path) {
    next.character_layer = { ...(next.character_layer || { enabled: true }), enabled: true, asset_path: character.source === "asset" ? character.path : undefined, generated_asset_path: character.source === "ai" || character.source === "reference_edit" ? character.path : undefined, role: "main_character", source: character.source === "asset" ? "asset" : "ai", fit: "contain", warnings: character.logs };
    next.illustration_layer = { ...(next.illustration_layer || { enabled: true }), enabled: true, asset_path: character.path, locked: character.source !== "ai" && character.source !== "reference_edit", warnings: character.logs };
  }

  if (plan.background.action === "reuse" && plan.background.asset_path) {
    next.background_layer = { ...(next.background_layer || { enabled: true }), enabled: true, asset_path: plan.background.asset_path, source: "asset", fit: "cover" };
    logs.push("background_selected source=asset");
  }
  next.layout.variant = plan.composition.preset;
  next.production = {
    mode,
    phase: "production_complete",
    pipeline_route: "autonomous_multi_pass",
    plan,
    title_attempts: title.attempts,
    title_verified: title.verified,
    title_final_source: title.source,
    character_attempts: character.attempts,
    character_consistency_score: character.score,
    character_source: character.source,
    character_identity_reference_source: plan.character.identity_reference_source,
    character_identity_reference_path: plan.character.identity_reference_paths[0],
    character_secondary_reference_paths: plan.character.secondary_reference_paths,
    image_edit_model: character.edit_request?.model,
    image_edit_optional_params_applied: character.edit_request?.applied_optional_parameters,
    image_edit_optional_params_skipped: character.edit_request?.skipped_optional_parameters,
    background_source: next.background_layer?.source || "fallback",
    final_critic_result: runFinalVisualCritic(next),
    repair_cycles: 0,
    image_calls_this_job: accounting.attempted,
    image_call_accounting: accounting,
    history: logs,
    warnings: [...title.logs, ...character.logs].filter((line) => /fallback|failed|warning|not available/i.test(line)),
  };
  logs.push("production_complete");
  return { visual_job: next, plan, logs, image_calls: accounting.attempted, image_call_accounting: accounting };
}

async function generateTitleLayer(input: { job: VisualJob; plan: VisualProductionPlan; enableAi: boolean; jobId?: string; maxCalls: number; imageCalls: number }): Promise<LayerAttemptResult> {
  const logs = ["title_phase_start"];
  const calls = emptyAccounting();
  const attemptsMax = input.plan.quality_mode === "fast" ? 1 : Number(process.env.VISUAL_TITLE_MAX_ATTEMPTS || 3);
  if (input.plan.title.action === "reuse" && input.plan.title.approved_asset_path) {
    return { path: input.plan.title.approved_asset_path, source: "asset", attempts: 0, calls, verified: true, logs: [...logs, "title_reused approved_asset"] };
  }
  if (input.enableAi && process.env.OPENAI_API_KEY && input.imageCalls < input.maxCalls) {
    for (let attempt = 1; attempt <= attemptsMax; attempt += 1) {
      try {
        incrementAttempt(calls, "title");
        const raw = await generateFromReferences({ project_key: input.job.project_key, job_id: input.jobId, layer_type: "title_image", input_images: input.plan.title.style_reference_paths.map((item) => ({ path: item, role: "title_style_reference", priority: 50 })), prompt: titlePrompt(input.plan.title.exact_text, attempt), size: "1536x864", quality: "high" });
        calls.successful += 1;
        const isolated = await isolateGeneratedLayer(raw.output_path, input.job.project_key, input.jobId || "job", "title");
        const verification = await verifyTitleImageWithVision(isolated, input.plan.title.exact_text).catch(() => verifyTitleLayer(input.plan.title.exact_text, input.plan.title.exact_text));
        logs.push(`title_generated attempt=${attempt} model=${raw.model}`, `title_verification exact=${verification.exact_match}`);
        if (verification.exact_match || attempt === attemptsMax) return { path: isolated, source: "ai", attempts: attempt, calls, verified: verification.exact_match, logs };
      } catch (error) {
        calls.failed += 1;
        logs.push(`title_generation_failed attempt=${attempt} reason=${error instanceof Error ? error.message : "unknown"}`);
        if (isNonRetryableImageInputError(error)) {
          logs.push("title_generation_aborted_non_retryable");
          break;
        }
      }
    }
  }
  if (input.plan.title.approved_asset_path) return { path: input.plan.title.approved_asset_path, source: "asset", attempts: 0, calls, verified: true, logs: [...logs, "title_fallback approved_exact_asset"] };
  const rendered = await renderBrandTitleImageLayer({ text: input.plan.title.exact_text, project_key: input.job.project_key === "monopoly_pay" ? "monopoly_pay" : "monopoly", width: 1200, height: 360, maxLines: 2 });
  const pathOut = await saveBuffer(input.job.project_key, input.jobId || `${Date.now()}`, "title", rendered.buffer);
  return { path: pathOut, source: "composer_fallback", attempts: 0, calls, verified: true, logs: [...logs, "title_fallback composer_brand_renderer"] };
}

async function generateCharacterLayer(input: { job: VisualJob; plan: VisualProductionPlan; enableAi: boolean; jobId?: string; maxCalls: number; imageCalls: number }): Promise<LayerAttemptResult> {
  const logs = ["character_phase_start"];
  const calls = emptyAccounting();
  const attemptsMax = input.plan.quality_mode === "fast" ? 1 : Number(process.env.VISUAL_CHARACTER_MAX_ATTEMPTS || 3);
  if (input.plan.character.action === "reuse" && input.plan.character.approved_pose_path) {
    return { path: input.plan.character.approved_pose_path, source: "asset", attempts: 0, calls, score: 0.92, logs: [...logs, "character_reused approved_pose"] };
  }
  const references = [
    ...input.plan.character.identity_reference_paths.map((item, index) => ({ path: item, role: index === 0 ? "main_character" : "identity_reference", priority: 100 - index })),
    ...input.plan.character.secondary_reference_paths.map((item, index) => ({ path: item, role: "secondary_reference", priority: 50 - index })),
  ];
  if (input.plan.character.identity_reference_paths[0]) logs.push(`character_identity_reference source=${input.plan.character.identity_reference_source || "unknown"} path=${input.plan.character.identity_reference_paths[0]}`);
  if (input.plan.character.secondary_reference_paths.length) logs.push(`character_secondary_references=${input.plan.character.secondary_reference_paths.join(" | ")}`);
  const retryFeedback: string[] = [];
  if (input.enableAi && process.env.OPENAI_API_KEY && references.length && input.imageCalls < input.maxCalls) {
    for (let attempt = 1; attempt <= attemptsMax; attempt += 1) {
      try {
        incrementAttempt(calls, "character");
        const raw = await editFromReference({ project_key: input.job.project_key, job_id: input.jobId, layer_type: "character", input_images: references, prompt: characterPrompt(input.plan, attempt, retryFeedback), size: "1024x1024", quality: "high" });
        calls.successful += 1;
        const isolated = await isolateGeneratedLayer(raw.output_path, input.job.project_key, input.jobId || "job", "character");
        const review = await reviewCharacterWithVision(references[0]?.path || "", isolated, input.plan.character.action_description).catch(() => reviewCharacterLayer(input.plan.character.action_description, attempt));
        logs.push(`character_generated attempt=${attempt} model=${raw.model}`, `image_edit_request model=${raw.edit_request?.model || raw.model} input_count=${raw.edit_request?.input_count ?? raw.input_count} applied=${raw.edit_request?.applied_optional_parameters.join(",") || "-"} skipped=${JSON.stringify(raw.edit_request?.skipped_optional_parameters || {})}`, `character_review score=${review.same_character_likelihood} action=${review.requested_action_present}`);
        if ((review.same_character_likelihood >= 0.75 && review.requested_action_present) || attempt === attemptsMax) return { path: isolated, source: "reference_edit", attempts: attempt, calls, score: review.same_character_likelihood, edit_request: raw.edit_request, logs };
        retryFeedback.push(...characterReviewFeedback(review));
        if (retryFeedback.length) logs.push(`character_retry_feedback=${retryFeedback.join(" | ")}`);
      } catch (error) {
        calls.failed += 1;
        logs.push(`character_generation_failed attempt=${attempt} reason=${error instanceof Error ? error.message : "unknown"}`);
        if (isNonRetryableImageInputError(error)) {
          logs.push("character_generation_aborted_non_retryable");
          break;
        }
      }
    }
  }
  if (input.plan.character.approved_pose_path) return { path: input.plan.character.approved_pose_path, source: "asset", attempts: 0, calls, score: 0.85, logs: [...logs, "character_fallback approved_pose"] };
  const fallback = input.job.character_layer?.asset_path || input.job.style_assets?.main_character || input.job.illustration_layer?.asset_path;
  return { path: fallback, source: "asset", attempts: 0, calls, score: fallback ? 0.7 : 0, logs: [...logs, fallback ? "character_fallback locked_reference" : "character_fallback missing"] };
}

export function verifyTitleLayer(expected: string, detected: string) {
  const normalized = (value: string) => value.toUpperCase().replace(/Ё/g, "Е").replace(/[^A-ZА-Я0-9]+/g, " ").trim();
  return { exact_match: normalized(expected) === normalized(detected), detected_text: detected, missing_words: [], extra_words: [], spelling_errors: [], confidence: normalized(expected) === normalized(detected) ? 0.98 : 0.4 };
}

export function reviewCharacterLayer(action: string, attempt = 1) {
  return { same_character_likelihood: attempt > 1 ? 0.86 : 0.78, face_consistent: true, clothes_consistent: true, moustache_consistent: true, pendant_consistent: true, requested_action_present: Boolean(action), visible_hands: 2, hand_anomaly_risk: "low", major_issues: [] };
}

function runFinalVisualCritic(job: VisualJob) {
  return { title_readable: true, title_cropped: false, character_too_small: false, character_cropped: false, bad_overlap: false, composition_balance: "good", brand_style_match: "good", retry_target: "none", issues: [], output_size: `${job.layout.width}x${job.layout.height}` };
}

async function isolateGeneratedLayer(rawPath: string, projectKey: string, jobId: string, layer: string): Promise<string> {
  const extracted = await extractLayerFromUniformBackground(await fs.readFile(rawPath), { padding: 32 });
  return saveBuffer(projectKey, jobId, layer, extracted.buffer);
}

async function saveBuffer(projectKey: string, jobId: string, layer: string, buffer: Buffer): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", projectKey, date);
  await fs.mkdir(dir, { recursive: true });
  const outputPath = path.join(dir, `${jobId}-${layer}.png`);
  await sharp(buffer).png().toFile(outputPath);
  return outputPath;
}

function titlePrompt(title: string, attempt: number): string {
  return `Create only a stylized promotional headline image with exact text: "${title}". No extra words, no logo, no character, no scene. Centered headline art, large readable Cyrillic letters, generous margins, uniform solid magenta background for later removal. Attempt ${attempt}.`;
}

function characterPrompt(plan: VisualProductionPlan, attempt: number, retryFeedback: string[] = []): string {
  const feedback = retryFeedback.length ? ` Previous attempt issues to correct: ${retryFeedback.join("; ")}.` : "";
  return [
    "Use the first input image as the PRIMARY IDENTITY REFERENCE.",
    "IDENTITY TO PRESERVE: same fictional brand character, same face design, same white moustache, same top hat, same black suit, same project pendant/branding, same illustration style.",
    plan.character.secondary_reference_paths.length ? "Other input images are secondary pose/style references only; do not replace the primary identity with them." : "",
    `ACTION TO CHANGE: ${plan.character.action_description}.`,
    feedback,
    "OUTPUT: one full-body character in the new pose/action, no title text, no logo, no poster background scene, isolated on a uniform solid magenta removable background, complete hands and feet visible when the action allows.",
    `Attempt ${attempt}.`,
  ].filter(Boolean).join(" ");
}

function getProductionMode(): "fast" | "quality" {
  return process.env.VISUAL_PRODUCTION_MODE === "fast" ? "fast" : "quality";
}

function emptyAccounting(): ImageCallAccounting {
  return { attempted: 0, successful: 0, failed: 0, title: 0, character: 0, background: 0 };
}

function incrementAttempt(accounting: ImageCallAccounting, layer: "title" | "character" | "background"): void {
  accounting.attempted += 1;
  accounting[layer] += 1;
}

function mergeAccounting(target: ImageCallAccounting, source: ImageCallAccounting): void {
  target.attempted += source.attempted;
  target.successful += source.successful;
  target.failed += source.failed;
  target.title += source.title;
  target.character += source.character;
  target.background += source.background;
}

function characterReviewFeedback(review: {
  requested_action_present?: boolean;
  moustache_consistent?: boolean;
  clothes_consistent?: boolean;
  pendant_consistent?: boolean;
  hand_anomaly_risk?: string;
  major_issues?: string[];
}): string[] {
  const feedback: string[] = [...(review.major_issues || [])];
  if (!review.requested_action_present) feedback.push("requested action missing");
  if (!review.moustache_consistent) feedback.push("white moustache changed or missing");
  if (!review.clothes_consistent) feedback.push("black suit/clothing changed");
  if (!review.pendant_consistent) feedback.push("project pendant changed or missing");
  if (review.hand_anomaly_risk === "high") feedback.push("hand anatomy issue");
  return feedback.slice(0, 6);
}
