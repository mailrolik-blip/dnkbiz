import path from "node:path";
import { composeVisualJob } from "../compose";
import { getVisualAiProvider } from "../ai";
import { reviseVisualJob, type RevisionTarget } from "../revision";
import { FileVisualJobStore, nextOutputVersion } from "../store";
import { safeFilename } from "../utils/safeFilename";
import type { UploadedAsset } from "../jobBuilder";
import { qualityCheckVisual } from "../quality";
import type { AiLayerInput } from "../ai/types";
import type { VisualJob } from "../types";

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
    options: { enable_ai: Boolean(input.options?.enable_ai) },
  });

  const aiLogs: string[] = [];
  const placementOnly = revision.warnings.some((warning) => warning.includes("placement updated without"));
  if (input.options?.enable_ai && !placementOnly && input.target !== "layout" && input.target !== "format") {
    const provider = getVisualAiProvider(true);
    const capabilities = provider.getCapabilities?.();
    aiLogs.push(`AI requested for ${input.target}`);
    if (capabilities) aiLogs.push(`provider_capabilities generation=${capabilities.image_generation} references=${capabilities.image_references} edit=${capabilities.image_edit} transparent=${capabilities.transparent_background}`);

    const aiInput: AiLayerInput = {
      command_text: `${record.source.command_text}\nRevision: ${input.instruction}`,
      project_key: record.detected.project_key,
      visual_mode: record.detected.visual_mode,
      profile: record.visual_job.profile,
      visual_job: revision.visual_job,
      reference_images: buildReferenceImages(revision.visual_job, input.target),
      locked_assets: buildLockedAssets(revision.visual_job),
      revision_target: input.target,
      enable_ai: true,
      allow_locked_character_replacement: isCharacterUnlockRequested(input.instruction),
    };

    if (input.target === "character") {
      if (process.env.VISUAL_AI_CONFIRM_EXPENSIVE_ACTIONS === "true") {
        revision.warnings.push("AI character pose generation requires confirmation because VISUAL_AI_CONFIRM_EXPENSIVE_ACTIONS=true.");
        aiLogs.push("AI character skipped: confirmation_required");
      } else {
        const characterLayer = await provider.generateCharacterLayer?.({ ...aiInput, mode: "edit_image", layer_type: "character", output: { transparent_background: true, size: process.env.OPENAI_CHARACTER_IMAGE_SIZE || "1024x1024" } });
        if (characterLayer) {
          revision.visual_job.character_layer = {
            ...(revision.visual_job.character_layer || { enabled: true }),
            ...definedOnly(characterLayer),
            enabled: true,
          };
          if (characterLayer.generated_asset_path) {
            revision.visual_job.illustration_layer = {
              ...(revision.visual_job.illustration_layer || { enabled: true }),
              enabled: true,
              asset_path: characterLayer.generated_asset_path,
              locked: false,
              generated_by_ai: true,
              warnings: characterLayer.warnings,
            };
          }
          if (characterLayer.warnings?.length) revision.warnings.push(...characterLayer.warnings);
        }
      }
    }

    if (input.target === "background" && record.detected.visual_mode !== "hockey_photo_template") {
      const aiLayer = record.detected.project_key === "casper"
        ? await (provider.generateStyleBaseImage?.(aiInput) || provider.generateBackgroundLayer(aiInput))
        : await provider.generateBackgroundLayer({ ...aiInput, mode: "generate_image", layer_type: "background" });
      if (aiLayer.asset_path) revision.visual_job.background_layer = { enabled: true, ...revision.visual_job.background_layer, ...aiLayer, source: "ai", generated_asset_path: aiLayer.asset_path };
      if (aiLayer.warnings?.length) revision.warnings.push(...aiLayer.warnings);
    }

    if ((input.target === "text" || input.target === "title_image") && isLayeredTitleProject(record.detected.project_key)) {
      const titleLayer = await provider.generateTitleImageLayer?.({ ...aiInput, mode: "generate_with_references", layer_type: "title_image", output: { transparent_background: true, size: process.env.OPENAI_TITLE_IMAGE_SIZE || "1024x1024" } });
      if (titleLayer) {
        revision.visual_job.title_image_layer = {
          ...(revision.visual_job.title_image_layer || { enabled: true, text: revision.visual_job.text_layer?.text || input.instruction }),
          ...definedOnly(titleLayer),
          enabled: true,
          text: titleLayer.text || revision.visual_job.text_layer?.text || revision.visual_job.title_image_layer?.text || input.instruction,
        };
        if (titleLayer.warnings?.length) revision.warnings.push(...titleLayer.warnings);
      }
    } else if ((input.target === "text" || input.target === "title_image") && shouldUseAiForText(input.instruction)) {
      const aiText = await provider.generateTextLayer(aiInput);
      revision.visual_job.text_layer = { ...(revision.visual_job.text_layer || { enabled: true }), ...aiText, enabled: true };
      revision.visual_job.post_caption = aiText.post_caption || revision.visual_job.post_caption;
      if (aiText.warnings?.length) revision.warnings.push(...aiText.warnings);
    }
  } else if (placementOnly) {
    aiLogs.push(`AI skipped for ${input.target}: placement_only_revision`);
  } else if (!input.options?.enable_ai) {
    aiLogs.push(`AI skipped for ${input.target}: VISUAL_BOT_ENABLE_AI=false`);
  }

  const previousJob = structuredClone(record.visual_job);
  const { outputPath, outputUrl } = outputFor(input.job_id, input.target, version);
  const composeResult = await composeVisualJob({ ...revision.visual_job, output_path: outputPath });
  revision.visual_job.final_composite = {
    ...(revision.visual_job.final_composite || {}),
    output_path: composeResult.output_path,
    output_url: outputUrl,
    width: composeResult.width,
    height: composeResult.height,
    delivery_mode: revision.visual_job.output_format === "print_a4" || revision.visual_job.output_format === "print_a5" ? "document" : "preview",
  };
  const quality = qualityCheckVisual({ visual_job: revision.visual_job, compose_result: composeResult, previous_job: previousJob, revision_target: input.target });
  const now = new Date().toISOString();

  record.visual_job = { ...revision.visual_job, output_path: outputPath };
  record.image_text = { title: record.visual_job.text_layer?.text, subtitle: record.visual_job.text_layer?.subtitle, sticker: record.visual_job.text_layer?.sticker };
  record.post_caption = record.visual_job.post_caption || record.visual_job.text_layer?.post_caption || record.post_caption;
  record.internal_prompt = record.visual_job.internal_prompt || record.visual_job.text_layer?.internal_prompt || record.internal_prompt;
  record.quality_warnings = [...(record.quality_warnings || []), ...quality.warnings, ...quality.critical];
  record.ai_generation_log = [...(record.ai_generation_log || []), ...aiLogs, ...revision.warnings.filter((warning) => warning.includes("OpenAI") || warning.includes("image reference") || warning.includes("character lock"))];
  record.compose_log = [...(record.compose_log || []), `v${version} layout=${record.visual_job.layout.variant} output=${composeResult.output_path}`, ...composeResult.warnings.filter((warning) => warning.startsWith("composer_usage"))];
  record.outputs.push({ version, output_path: composeResult.output_path, output_url: outputUrl, width: composeResult.width, height: composeResult.height, created_at: now });
  const layerKey = input.target === "format" ? "layout" : input.target === "title_image" ? "text" : input.target === "character" ? "illustration" : input.target;
  record.layers[layerKey].last_updated_at = now;
  record.history.push({ type: "revised", message: `${input.target}: ${input.instruction}`, created_at: now });
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

function buildReferenceImages(job: VisualJob, target: RevisionTarget): NonNullable<AiLayerInput["reference_images"]> {
  const refs: NonNullable<AiLayerInput["reference_images"]> = [];
  if (target === "character") {
    const character = job.character_layer?.asset_path || job.style_assets?.main_character;
    if (character) refs.push({ path: character, role: "main_character", lock_policy: "locked", description: "Locked character reference" });
  }
  if (target === "text" || target === "title_image") {
    const titleRef = job.title_image_layer?.style_ref_asset_path || job.style_assets?.title_style_reference;
    if (titleRef) refs.push({ path: titleRef, role: "title_style_reference", lock_policy: "reference_only", description: "Title lettering style reference" });
  }
  for (const ref of job.style_assets?.references || []) {
    if (!refs.some((item) => item.path === ref)) refs.push({ path: ref, role: "style_reference", lock_policy: "reference_only" });
  }
  return refs;
}

function buildLockedAssets(job: VisualJob): string[] {
  return [job.character_layer?.asset_path, job.style_assets?.main_character, ...(job.style_assets?.locked_assets || [])].filter((value): value is string => Boolean(value));
}

function isLayeredTitleProject(projectKey: string): boolean {
  return projectKey === "monopoly" || projectKey === "monopoly_pay";
}

function isCharacterUnlockRequested(instruction: string): boolean {
  return /можно заменить персонажа|сгенерируй нового деда|замени персонажа|new character|replace character/iu.test(instruction);
}

function shouldUseAiForText(instruction: string): boolean {
  return /продающ|смешн|короч|лучше|вариант|перепиши|улучши/iu.test(instruction);
}

function definedOnly<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as Partial<T>;
}
