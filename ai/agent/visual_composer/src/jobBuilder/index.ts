import path from "node:path";
import { getVisualAiProvider } from "../ai";
import { loadDefaultAssetManifest } from "../assets/assetResolver";
import { loadProjectProfile } from "../profiles/profileLoader";
import type { VisualJob } from "../types";
import type { ProjectAssetManifest, VisualAsset } from "../assets/types";
import { detectProject } from "./detectProject";
import { detectOutputFormat, detectVisualMode } from "./detectVisualMode";
import { extractTextLayerParts } from "./extractTextLayer";
import { buildCasperJob } from "./buildCasperJob";
import { buildGorillaHockeyJob } from "./buildGorillaHockeyJob";
import { buildMonopolyJob } from "./buildMonopolyJob";
import { buildMonopolyPayJob } from "./buildMonopolyPayJob";
import type { BuildVisualJobInput, VisualJobBuildResult } from "./types";

export async function buildVisualJobFromCommand(input: BuildVisualJobInput): Promise<VisualJobBuildResult> {
  const warnings: string[] = [];
  const commandText = input.command_text?.trim();
  if (!commandText) throw new Error("command_text is required.");

  const projectKey = detectProject(commandText, input.project_key);
  const profile = input.profile || loadProjectProfile(projectKey);
  const visualMode = detectVisualMode(commandText, projectKey, input.uploaded_assets || [], input.visual_mode);
  const outputFormat = detectOutputFormat(commandText, projectKey, visualMode, input.output_format);
  const provider = getVisualAiProvider(Boolean(input.options?.enable_ai));
  const text = extractTextLayerParts(commandText, projectKey, visualMode);
  const assetManifest = input.asset_manifest || loadAssetManifestFromEnv() || loadDefaultAssetManifest();

  if (input.options?.enable_ai && !process.env.OPENAI_API_KEY) {
    warnings.push("enable_ai=true requested, but OPENAI_API_KEY is missing. Using safe fallback layer generation.");
  }

  const buildInput: BuildVisualJobInput = {
    ...input,
    command_text: commandText,
    project_key: projectKey,
    visual_mode: visualMode,
    output_format: outputFormat,
    asset_manifest: assetManifest,
    profile,
  };

  let visualJob: VisualJob;
  if (projectKey === "monopoly") visualJob = buildMonopolyJob(buildInput, text, warnings);
  else if (projectKey === "monopoly_pay") visualJob = buildMonopolyPayJob(buildInput, text, warnings);
  else if (projectKey === "casper") visualJob = buildCasperJob(buildInput, text, warnings);
  else if (projectKey === "gorilla_hockey") visualJob = buildGorillaHockeyJob(buildInput, text, visualMode, warnings);
  else {
    warnings.push("Project is not visual-specific; using DNK default overlay fallback.");
    visualJob = buildCasperJob({ ...buildInput, project_key: "casper", profile: loadProjectProfile("dnk") }, text, warnings);
    visualJob.project_key = "dnk";
  }

  visualJob.profile = profile;
  const selectedStyleAssets = collectStyleAssets(visualJob, assetManifest);
  const aiInput = {
    command_text: commandText,
    project_key: projectKey,
    visual_mode: visualMode,
    profile,
    visual_job: visualJob,
    selected_assets: selectedStyleAssets,
    reference_images: selectedStyleAssets
      .filter((asset) => asset.lock_policy === "reference_only" || asset.role === "style_reference" || asset.role === "composition_reference" || asset.role === "title_style_reference")
      .map((asset) => ({ path: asset.path, role: asset.role, lock_policy: asset.lock_policy, description: asset.description })),
    locked_assets: selectedStyleAssets.filter((asset) => asset.lock_policy === "locked").map((asset) => asset.path),
    enable_ai: input.options?.enable_ai,
  };
  const aiText = await provider.generateTextLayer(aiInput);
  visualJob.text_layer = {
    ...(visualJob.text_layer || { enabled: true }),
    ...definedOnly(aiText),
    enabled: visualJob.text_layer?.enabled ?? true,
    post_caption: text.post_caption || aiText.post_caption,
  };
  visualJob.post_caption = text.post_caption || aiText.post_caption || buildDefaultPostCaption(commandText, projectKey);
  visualJob.internal_prompt = [profile.image_style_rules, profile.composition_rules, profile.negative_rules, commandText].filter(Boolean).join("\n");

  if (input.options?.enable_ai) {
    if ((projectKey === "monopoly" || projectKey === "monopoly_pay") && visualJob.title_image_layer?.enabled) {
      const titleLayer = await provider.generateTitleImageLayer?.({
        ...aiInput,
        visual_job: visualJob,
        mode: "generate_with_references",
        layer_type: "title_image",
        output: { transparent_background: true, size: process.env.OPENAI_TITLE_IMAGE_SIZE || "1024x1024" },
      });
      if (titleLayer) {
        visualJob.title_image_layer = {
          ...visualJob.title_image_layer,
          ...definedOnly(titleLayer),
          enabled: true,
          text: titleLayer.text || visualJob.title_image_layer.text,
        };
        if (titleLayer.warnings?.length) warnings.push(...titleLayer.warnings);
      }
    }
    if (!visualJob.illustration_layer?.asset_path && visualMode !== "hockey_photo_template") {
      const aiIllustration = await provider.generateIllustrationLayer({ ...aiInput, visual_job: visualJob });
      if (aiIllustration.asset_path) visualJob.illustration_layer = { enabled: true, ...visualJob.illustration_layer, ...aiIllustration };
      if (aiIllustration.warnings?.length) warnings.push(...aiIllustration.warnings);
    }
    if (!visualJob.background_layer?.asset_path && visualMode !== "hockey_photo_template") {
      const aiBackground = projectKey === "casper"
        ? await (provider.generateStyleBaseImage?.({ ...aiInput, visual_job: visualJob }) || provider.generateBackgroundLayer({ ...aiInput, visual_job: visualJob }))
        : await provider.generateBackgroundLayer({ ...aiInput, visual_job: visualJob });
      if (aiBackground.asset_path) visualJob.background_layer = { enabled: true, ...visualJob.background_layer, ...aiBackground };
      if (aiBackground.warnings?.length) warnings.push(...aiBackground.warnings);
    }
  }

  return {
    ok: true,
    visual_job: visualJob,
    detected: { project_key: projectKey, visual_mode: visualMode, output_format: outputFormat },
    warnings,
  };
}

function collectStyleAssets(job: VisualJob, manifest: ProjectAssetManifest): VisualAsset[] {
  const paths = new Set(
    [
      job.style_assets?.main_character,
      job.style_assets?.logo,
      job.style_assets?.background,
      job.style_assets?.reference,
      job.style_assets?.title_style_reference,
      job.style_assets?.template,
      job.style_assets?.icon,
      ...(job.style_assets?.icons || []),
      ...(job.style_assets?.references || []),
      ...(job.style_assets?.locked_assets || []),
    ].filter((value): value is string => Boolean(value)),
  );
  if (!paths.size) return [];
  return manifest.assets.filter((asset) => paths.has(asset.path));
}

function loadAssetManifestFromEnv() {
  const manifestPath = process.env.VISUAL_ASSET_MANIFEST_PATH;
  if (!manifestPath) return null;
  try {
    return require(path.resolve(manifestPath));
  } catch {
    return null;
  }
}

function definedOnly<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as Partial<T>;
}

function buildDefaultPostCaption(commandText: string, projectKey: string): string {
  return `${projectKey}: ${commandText}`;
}

export type { BuildVisualJobInput, VisualJobBuildResult, UploadedAsset } from "./types";
