import path from "node:path";
import { randomUUID } from "node:crypto";
import { buildVisualJobFromCommand, type UploadedAsset } from "../jobBuilder";
import { composeWithVisualQaRepair } from "../production/composeWithVisualQa";
import { runVisualProductionPipeline } from "../production/runVisualProductionPipeline";
import { createVisualJobRecord, FileVisualJobStore } from "../store";
import type { OutputFormat, VisualJob, VisualProjectKey } from "../types";
import { safeFilename } from "../utils/safeFilename";
import { CostPolicy } from "../cost/CostPolicy";
import { VisualCostLedger } from "../cost/VisualCostLedger";
import { VisualRecipeRegistry } from "../recipes/registry";
import type { PaidActionMetadata, VisualRecipe } from "../recipes/types";
import { ImageProviderRouter } from "../providers/providerRouter";
import { MonopolyTitleRenderer } from "../renderers/title/MonopolyTitleRenderer";
import { PayTitleRenderer } from "../renderers/title/PayTitleRenderer";
import { loadDefaultAssetManifest, resolveVisualAsset } from "../assets/assetResolver";
import type { ProjectAssetManifest } from "../assets/types";
import { parseVisualRecipeIntent } from "../recipes/parseVisualRecipeIntent";
import { validateLayerSourceIntegrity } from "../quality/validateLayerSourceIntegrity";

export type VisualPipelineMode = "hybrid_economy" | "experimental_multipass";

export interface VisualProductionEngineInput {
  user_id?: string;
  brand_key?: VisualProjectKey;
  command_text: string;
  requested_revision?: string;
  requested_recipe_key?: string;
  channel_context?: { channel?: string; chat_id?: string; trigger_key?: string };
  uploaded_assets?: UploadedAsset[];
  explicit_paid_action?: boolean;
  paid_action?: PaidActionMetadata;
  options?: { enable_ai?: boolean };
  asset_manifest?: ProjectAssetManifest;
}

export interface VisualProductionEngineOutput {
  job_id: string;
  brand_key: VisualProjectKey;
  recipe_key: string;
  output_path: string;
  output_url: string;
  layer_paths: string[];
  ai_usage: { attempted: number; successful: number; failed: number };
  estimated_provider_cost: number;
  warnings: string[];
  visual_job: VisualJob;
  detected: { project_key: VisualProjectKey; visual_mode: VisualJob["visual_mode"]; output_format: OutputFormat };
}

export class VisualProductionEngine {
  constructor(
    private readonly recipes = new VisualRecipeRegistry(),
    private readonly providers = new ImageProviderRouter(),
    private readonly ledger = new VisualCostLedger(),
  ) {}

  async run(input: VisualProductionEngineInput): Promise<VisualProductionEngineOutput> {
    const mode = getVisualPipelineMode();
    if (mode === "experimental_multipass") return this.runExperimentalMultipass(input);
    return this.runHybridEconomy(input);
  }

  private async runHybridEconomy(input: VisualProductionEngineInput): Promise<VisualProductionEngineOutput> {
    const startedAt = new Date().toISOString();
    const commandText = input.command_text.trim();
    const manifest = input.asset_manifest || loadDefaultAssetManifest();
    const built = await buildVisualJobFromCommand({
      command_text: commandText,
      project_key: input.brand_key || "",
      uploaded_assets: input.uploaded_assets || [],
      asset_manifest: manifest,
      options: { enable_ai: false, layout_variant: "auto" },
    });
    const recipe = this.recipes.resolve({ brand_key: built.detected.project_key, requested_recipe_key: input.requested_recipe_key });
    const recipeIntent = parseVisualRecipeIntent(commandText);
    built.visual_job.text_layer = { ...(built.visual_job.text_layer || { enabled: true }), enabled: true, text: recipeIntent.exact_title };
    built.visual_job.title_image_layer = { ...(built.visual_job.title_image_layer || { enabled: true, text: recipeIntent.exact_title }), enabled: true, text: recipeIntent.exact_title, asset_path: undefined };
    const jobId = randomUUID();
    const costPolicy = new CostPolicy({
      ...recipe.cost_policy,
      max_ai_image_calls_per_job: Number(process.env.VISUAL_MAX_AI_IMAGE_CALLS_PER_JOB || recipe.cost_policy.max_ai_image_calls_per_job || 1),
    });
    const warnings: string[] = [`pipeline_mode=hybrid_economy`, `recipe_key=${recipe.key}`, "ai_critics_disabled", "automatic_ai_retry_disabled"];
    const output = buildPublicOutput(recipe.brand_key, recipe.composition.template_key, jobId);
    let visualJob = normalizeRecipeJob(built.visual_job, recipe, output.outputPath);
    visualJob = await this.applyLocalTitle(recipe, visualJob, jobId, warnings);
    visualJob = applyRecipeAssets(recipe, visualJob, manifest, warnings);

    let successful = 0;
    let failed = 0;
    let realBillable = 0;
    let estimatedCost = 0;
    let providerRouteRequested = "disabled";
    let providerResolved = "disabled";
    let providerRuntimeAvailable = false;
    let providerBillable = false;
    let providerModel: string | undefined;
    const needsAi = shouldUseAi(commandText, recipe, input, recipeIntent.character_action);
    if (needsAi) {
      const resolution = this.providers.resolveCharacterEdit({ channel: input.channel_context?.channel });
      providerRouteRequested = resolution.requested;
      providerResolved = resolution.resolved;
      providerRuntimeAvailable = resolution.runtime_available;
      providerBillable = resolution.billable;
      if (!resolution.provider) {
        warnings.push(resolution.warning || "character_ai_provider_unavailable", "AI-провайдер для генерации персонажа не настроен. Картинка собрана с текущим персонажем без платной AI-генерации.");
      } else {
        try {
        costPolicy.authorizeImageCall({ estimated_calls: 1, explicit_paid_action: Boolean(input.explicit_paid_action || input.paid_action?.explicit_paid_action), reason: needsAi });
        const provider = resolution.provider;
        const request = {
          job_id: jobId,
          brand_key: recipe.brand_key,
          prompt: buildProviderPrompt(commandText, recipe, recipeIntent.character_action),
          output_dir: path.join(process.cwd(), ".storage", "visual_generated_assets", recipe.brand_key),
          size: recipe.overall_strategy === "one_shot" ? "1920x1080" : "1024x1024",
          reference_images: collectReferenceImages(visualJob),
        };
        const providerResult = recipe.overall_strategy === "one_shot" ? await provider.generateImage(request) : await provider.editImage(request);
        estimatedCost += providerResult.estimated_cost;
        successful += providerResult.request_count;
        realBillable += providerResult.billable === false ? 0 : providerResult.request_count;
        providerModel = providerResult.model;
        if (recipe.overall_strategy === "one_shot") {
          visualJob.background_layer = { ...(visualJob.background_layer || { enabled: true }), enabled: true, generated_asset_path: providerResult.output_path, source: "ai", generated_by_ai: true, model: providerResult.model };
        } else {
          visualJob.character_layer = { ...(visualJob.character_layer || { enabled: true }), enabled: true, generated_asset_path: providerResult.output_path, role: "main_character", source: "ai", fit: "contain" };
          visualJob.illustration_layer = { ...(visualJob.illustration_layer || { enabled: true }), enabled: true, asset_path: providerResult.output_path, generated_by_ai: true, model: providerResult.model };
        }
        warnings.push(`ai_provider=${providerResult.provider}`, `ai_model=${providerResult.model}`, `requires_ai_call=true estimated_calls=1`);
        } catch (error) {
          failed += 1;
          warnings.push(`ai_call_failed_no_retry=${error instanceof Error ? error.message : "unknown"}`);
        }
      }
    }

    const sourceErrors = validateLayerSourceIntegrity(visualJob);
    if (sourceErrors.length) warnings.push(...sourceErrors.map((item) => `layer_source_integrity_error=${item}`));
    visualJob.production = {
      ...(visualJob.production || {}),
      phase: "production_complete",
      pipeline_route: "hybrid_economy",
      plan: { recipe },
      recipe_intent: recipeIntent,
      image_calls_this_job: costPolicy.attemptedCalls,
      image_call_accounting: { attempted: costPolicy.attemptedCalls, successful, failed, title: 0, character: recipe.overall_strategy === "one_shot" ? 0 : costPolicy.attemptedCalls, background: recipe.overall_strategy === "one_shot" ? costPolicy.attemptedCalls : 0, real_billable: realBillable },
      title_final_source: "local_renderer",
      title_font_source: visualJob.title_image_layer?.fit_metadata?.warnings?.find((item) => item.startsWith("font_source="))?.slice("font_source=".length),
      title_font_fallback: visualJob.title_image_layer?.fit_metadata?.warnings?.includes("pay_title_font_fallback_used"),
      character_source: visualJob.character_layer?.generated_asset_path ? "reference_edit" : "locked_asset",
      provider_route_requested: providerRouteRequested,
      provider_resolved: providerResolved,
      provider_runtime_available: providerRuntimeAvailable,
      provider_billable: providerBillable && realBillable > 0,
      provider_model: providerModel,
      estimated_provider_cost: estimatedCost,
      background_source: visualJob.background_layer?.generated_asset_path ? "ai" : visualJob.background_layer?.source || "asset",
      repair_cycles: 0,
      history: warnings,
      warnings,
    };
    const qaCompose = await composeWithVisualQaRepair(visualJob);
    visualJob = qaCompose.visual_job;
    const compose = qaCompose.compose_result;
    visualJob.final_composite = { output_path: compose.output_path, output_url: output.relativeUrl, width: compose.width, height: compose.height, delivery_mode: "preview" };
    warnings.push(...compose.warnings, ...qaCompose.qa.errors.map((item) => item.code), ...qaCompose.qa.warnings.map((item) => item.code));

    const record = createVisualJobRecord({
      job_id: jobId,
      command_text: commandText,
      chat_id: input.channel_context?.chat_id,
      user_id: input.user_id,
      detected: built.detected,
      visual_job: { ...visualJob, output_path: output.outputPath },
      output: { version: 1, output_path: compose.output_path, output_url: output.relativeUrl, width: compose.width, height: compose.height, created_at: new Date().toISOString() },
      message: "Produced visual through hybrid economy VisualProductionEngine.",
    });
    record.ai_generation_log = warnings;
    record.compose_log = [`recipe_key=${recipe.key}`, `pipeline_mode=hybrid_economy`, `ai_calls=${costPolicy.attemptedCalls}`, `qa_errors=${qaCompose.qa.errors.length}`, `qa_warnings=${qaCompose.qa.warnings.length}`];
    await new FileVisualJobStore().save({ record });
    await this.ledger.append({
      job_id: jobId,
      brand_key: recipe.brand_key,
      recipe_key: recipe.key,
      channel: input.channel_context?.channel || "unknown",
      provider: warnings.find((item) => item.startsWith("ai_provider="))?.split("=")[1],
      model: warnings.find((item) => item.startsWith("ai_model="))?.split("=")[1],
      billable: realBillable > 0,
      real_provider_call: realBillable > 0,
      real_billable_image_calls: realBillable,
      ai_image_calls_attempted: costPolicy.attemptedCalls,
      ai_image_calls_successful: successful,
      ai_image_calls_failed: failed,
      estimated_provider_cost: estimatedCost,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      explicit_paid_retry: Boolean(input.explicit_paid_action),
      local_revision_count: 0,
      explicit_ai_retry_count: input.explicit_paid_action ? 1 : 0,
    });

    return {
      job_id: jobId,
      brand_key: recipe.brand_key,
      recipe_key: recipe.key,
      output_path: compose.output_path,
      output_url: output.relativeUrl,
      layer_paths: collectLayerPaths(visualJob),
      ai_usage: { attempted: costPolicy.attemptedCalls, successful, failed },
      estimated_provider_cost: estimatedCost,
      warnings,
      visual_job: record.visual_job,
      detected: built.detected,
    };
  }

  private async runExperimentalMultipass(input: VisualProductionEngineInput): Promise<VisualProductionEngineOutput> {
    const built = await buildVisualJobFromCommand({ command_text: input.command_text, project_key: input.brand_key || "", uploaded_assets: input.uploaded_assets || [], asset_manifest: input.asset_manifest, options: { enable_ai: Boolean(input.options?.enable_ai), layout_variant: "auto" } });
    const jobId = randomUUID();
    const output = buildPublicOutput(built.visual_job.project_key, built.visual_job.layout.variant, jobId);
    const pipeline = await runVisualProductionPipeline({ command_text: input.command_text, visual_job: { ...built.visual_job, output_path: output.outputPath }, manifest: input.asset_manifest, enable_ai: Boolean(input.options?.enable_ai), job_id: jobId });
    const qaCompose = await composeWithVisualQaRepair({ ...pipeline.visual_job, output_path: output.outputPath });
    return {
      job_id: jobId,
      brand_key: built.visual_job.project_key,
      recipe_key: "experimental_multipass",
      output_path: qaCompose.compose_result.output_path,
      output_url: output.relativeUrl,
      layer_paths: collectLayerPaths(qaCompose.visual_job),
      ai_usage: { attempted: pipeline.image_call_accounting.attempted, successful: pipeline.image_call_accounting.successful, failed: pipeline.image_call_accounting.failed },
      estimated_provider_cost: 0,
      warnings: pipeline.logs,
      visual_job: qaCompose.visual_job,
      detected: built.detected,
    };
  }

  private async applyLocalTitle(recipe: VisualRecipe, job: VisualJob, jobId: string, warnings: string[]): Promise<VisualJob> {
    if (recipe.title.strategy !== "local_renderer") return job;
    const title = job.title_image_layer?.text || job.text_layer?.text || job.source_text || "DNK VISUAL";
    const renderer = recipe.title.renderer_key === "monopoly_psd_style_v1" ? new MonopolyTitleRenderer() : new PayTitleRenderer();
    const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", recipe.brand_key, new Date().toISOString().slice(0, 10));
    const outputPath = path.join(dir, `${jobId}-title.png`);
    const result = await renderer.render({ text: title, width: 1100, height: 360, output_path: outputPath });
    const fontWarnings = [`font_source=${result.metadata.font_source}`, result.metadata.font_fallback_used ? "pay_title_font_fallback_used" : ""].filter(Boolean);
    warnings.push(`local_title_renderer=${result.metadata.renderer_key}`, `local_title_exact_text=${result.metadata.exact_text}`, ...fontWarnings);
    return { ...job, title_image_layer: { ...(job.title_image_layer || { enabled: true, text: title }), enabled: true, text: title, asset_path: undefined, generated_asset_path: result.output_path, transparent_background: true, source: "local_renderer", fit_metadata: { title_image_width: result.width, title_image_height: result.height, final_font_size: result.metadata.font_size, lines: result.metadata.lines, was_shrunk: false, was_wrapped: result.metadata.lines.length > 1, safe_padding_used: 0, warnings: fontWarnings } } };
  }
}

export function getVisualPipelineMode(): VisualPipelineMode {
  return process.env.VISUAL_PIPELINE_MODE === "experimental_multipass" ? "experimental_multipass" : "hybrid_economy";
}

function normalizeRecipeJob(job: VisualJob, recipe: VisualRecipe, outputPath: string): VisualJob {
  const [width, height] = recipe.output_preset === "square_1024x1024" ? [1024, 1024] : [1920, 1080];
  return { ...job, output_format: recipe.output_preset as OutputFormat, output_path: outputPath, layout: { ...job.layout, variant: recipe.composition.template_key, width, height } };
}

function applyRecipeAssets(recipe: VisualRecipe, job: VisualJob, manifest: ProjectAssetManifest, warnings: string[]): VisualJob {
  const next = { ...job };
  const background = resolveVisualAsset({ project_key: recipe.brand_key, asset_type: "background", role: "background", manifest, tags: recipe.background.palette || [] });
  if (background.asset_path) next.background_layer = { ...(next.background_layer || { enabled: true }), enabled: true, asset_path: background.asset_path, source: "asset", fit: "cover", locked: recipe.background.strategy !== "ai_generate" };
  const character = resolveVisualAsset({ project_key: recipe.brand_key, asset_type: "character", role: "main_character", manifest, lock_policy: "locked" });
  if (character.asset_path) {
    next.character_layer = { ...(next.character_layer || { enabled: true }), enabled: true, asset_path: character.asset_path, role: "main_character", source: "asset", fit: "contain", locked: true };
    next.illustration_layer = { ...(next.illustration_layer || { enabled: true }), enabled: true, asset_path: character.asset_path, locked: true };
  }
  const logo = resolveVisualAsset({ project_key: recipe.brand_key, asset_type: "logo", role: "brand_logo", manifest });
  if (logo.asset_path) {
    next.logo_layer = { ...(next.logo_layer || { enabled: true }), enabled: true, asset_path: logo.asset_path, source: "asset", fit: "contain", lock_policy: "locked" };
    next.brand = { ...(next.brand || {}), logo_path: logo.asset_path };
  }
  warnings.push(...(background.selection_log || []), ...(character.selection_log || []), ...(logo.selection_log || []));
  return next;
}

function shouldUseAi(commandText: string, recipe: VisualRecipe, input: VisualProductionEngineInput, characterAction?: string | null): string | null {
  if (input.paid_action?.requires_ai_call || input.explicit_paid_action) return input.paid_action?.action_key || "explicit_paid_ai_variant";
  if (characterAction) return "requested_character_action";
  const text = commandText.toLowerCase();
  if (recipe.overall_strategy === "one_shot") return "one_shot_recipe";
  if (/нов(ая|ую|ый)?\s+(поз|pose|действ|персонаж|игрок|форм)/i.test(text) || /держит|бежит|прыгает|идет|летит|uniform|player/i.test(text)) {
    return recipe.overall_strategy === "photo_template" ? "explicit_new_player_or_uniform" : "requested_new_character_pose";
  }
  return null;
}

function buildProviderPrompt(commandText: string, recipe: VisualRecipe, characterAction?: string | null): string {
  return `${recipe.key}: ${characterAction || commandText}. Preserve approved brand identity. Produce only the variable character layer requested by the recipe.`;
}

function collectReferenceImages(job: VisualJob): Array<{ path: string; role?: string }> {
  return [job.character_layer?.asset_path, job.illustration_layer?.asset_path, job.style_assets?.main_character].filter(Boolean).map((item) => ({ path: String(item), role: "main_character" }));
}

function collectLayerPaths(job: VisualJob): string[] {
  return [job.title_image_layer?.generated_asset_path, job.title_image_layer?.asset_path, job.character_layer?.generated_asset_path, job.character_layer?.asset_path, job.background_layer?.generated_asset_path, job.background_layer?.asset_path, job.logo_layer?.asset_path].filter(Boolean).map(String);
}

function buildPublicOutput(projectKey: string, layoutVariant: string, jobId: string) {
  const fileName = `${Date.now()}-${safeFilename(projectKey)}-${safeFilename(layoutVariant)}-${safeFilename(jobId)}.png`;
  return { outputPath: path.join(process.cwd(), "public", "generated", "visual", fileName), relativeUrl: `/generated/visual/${fileName}` };
}
