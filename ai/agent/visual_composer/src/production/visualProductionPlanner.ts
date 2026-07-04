import { resolveVisualAsset } from "../assets/assetResolver";
import { resolveApprovedPoseAsset, resolveApprovedTitleAsset } from "../assets/approvedAssetResolver";
import type { ProjectAssetManifest } from "../assets/types";
import type { ProjectProfileSnapshot, VisualJob, VisualProjectKey } from "../types";

export interface VisualProductionPlan {
  project_key: VisualProjectKey;
  output_preset: string;
  quality_mode: "fast" | "quality";
  title: {
    exact_text: string;
    action: "generate" | "reuse" | "none";
    approved_asset_path?: string;
    style_reference_paths: string[];
  };
  character: {
    action: "reference_edit" | "generate" | "reuse";
    action_description: string;
    approved_pose_path?: string;
    identity_reference_paths: string[];
    identity_reference_source?: "locked_main_character" | "job_character_layer" | "approved_pose" | "none";
    secondary_reference_paths: string[];
    style_reference_paths: string[];
  };
  background: {
    action: "reuse" | "generate";
    asset_path?: string;
    description: string;
  };
  logo: {
    action: "reuse";
    asset_path?: string;
  };
  decor: {
    action: "generate" | "reuse" | "none";
    description: string;
  };
  composition: {
    preset: string;
    title_side: "left" | "center" | "right";
    character_side: "left" | "center" | "right";
  };
}

export function createVisualProductionPlan(input: {
  command_text: string;
  project_key: VisualProjectKey;
  project_profile?: ProjectProfileSnapshot;
  visual_job: VisualJob;
  manifest?: ProjectAssetManifest;
  quality_mode?: "fast" | "quality";
}): VisualProductionPlan {
  const titleText = input.visual_job.title_image_layer?.text || input.visual_job.text_layer?.text || input.command_text;
  const sourcePolicy = process.env.VISUAL_LAYER_SOURCE_POLICY || "generate_first";
  const titleAsset = resolveApprovedTitleAsset({ project_key: input.project_key, title: titleText, manifest: input.manifest });
  const poseAsset = resolveApprovedPoseAsset({ project_key: input.project_key, instruction: input.command_text, manifest: input.manifest });
  const background = resolveVisualAsset({ project_key: input.project_key, visual_mode: "composer", asset_type: "background", tags: ["wide", "promo", "pay"], manifest: input.manifest });
  const logo = resolveVisualAsset({ project_key: input.project_key, visual_mode: "composer", asset_type: "logo", tags: ["main"], manifest: input.manifest });
  const references = (input.manifest?.assets || [])
    .filter((asset) => asset.project_key === input.project_key && asset.type === "reference")
    .filter((asset) => asset.safe_for_auto_use !== false)
    .slice(0, 3)
    .map((asset) => asset.path);
  const lockedMainCharacter = resolveLockedMainCharacter(input.project_key, input.manifest)?.path;
  const jobCharacter = input.visual_job.character_layer?.asset_path || input.visual_job.style_assets?.main_character;
  const identity = [
    lockedMainCharacter,
    jobCharacter && jobCharacter !== poseAsset.asset_path ? jobCharacter : undefined,
    !lockedMainCharacter && !jobCharacter ? poseAsset.asset_path : undefined,
  ].filter((value): value is string => Boolean(value));
  const secondaryReferences = [
    poseAsset.asset_path,
    ...references,
  ].filter((value): value is string => Boolean(value && !identity.includes(value)));
  const explicitReuse = /используй готов|возьми готов|reuse|без генерации/iu.test(input.command_text);
  const wantsSceneBackground = /фон|сцена|улица|банк|банкомат|лучами|сигнализац/iu.test(input.command_text);
  return {
    project_key: input.project_key,
    output_preset: input.visual_job.output_format,
    quality_mode: input.quality_mode || "quality",
    title: {
      exact_text: titleText,
      action: sourcePolicy === "asset_first" || explicitReuse ? (titleAsset.asset_path ? "reuse" : "generate") : "generate",
      approved_asset_path: titleAsset.asset_path || undefined,
      style_reference_paths: references.filter((ref) => /title|text|style/i.test(ref)).slice(0, 2),
    },
    character: {
      action: sourcePolicy === "asset_first" || explicitReuse ? (poseAsset.asset_path ? "reuse" : "reference_edit") : "reference_edit",
      action_description: describeCharacterAction(input.command_text),
      approved_pose_path: poseAsset.asset_path || undefined,
      identity_reference_paths: [...new Set(identity)].slice(0, 3),
      identity_reference_source: lockedMainCharacter ? "locked_main_character" : jobCharacter ? "job_character_layer" : poseAsset.asset_path ? "approved_pose" : "none",
      secondary_reference_paths: [...new Set(secondaryReferences)].slice(0, 3),
      style_reference_paths: references,
    },
    background: {
      action: wantsSceneBackground && /нов(ый|ая)?\s+фон|другой фон|сгенерируй фон/iu.test(input.command_text) ? "generate" : "reuse",
      asset_path: background.asset_path || undefined,
      description: wantsSceneBackground ? "task-specific environment may be needed" : "reuse approved project background",
    },
    logo: { action: "reuse", asset_path: logo.asset_path || input.visual_job.logo_layer?.asset_path || input.visual_job.brand?.logo_path },
    decor: { action: input.project_key === "monopoly_pay" ? "reuse" : "none", description: input.project_key === "monopoly_pay" ? "payment chips/icons" : "" },
    composition: chooseComposition(input.project_key, input.command_text),
  };
}

function resolveLockedMainCharacter(projectKey: VisualProjectKey, manifest?: ProjectAssetManifest) {
  return (manifest?.assets || [])
    .filter((asset) => asset.project_key === projectKey)
    .filter((asset) => asset.type === "character")
    .filter((asset) => asset.role === "main_character")
    .filter((asset) => asset.lock_policy === "locked")
    .filter((asset) => asset.safe_for_auto_use !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
}

function describeCharacterAction(command: string): string {
  const lower = command.toLowerCase();
  if (/лучам|лучами|сигнализац/.test(lower)) return "walking carefully between visible security laser beams";
  if (/телефон/.test(lower)) return "showing a phone";
  if (/кубок/.test(lower)) return "holding a cup";
  if (/банк|банкомат/.test(lower)) return "reacting near a bank or ATM";
  if (/лучами|сигнализац/.test(lower)) return "walking between security beams";
  if (/телефон/.test(lower)) return "showing a phone";
  if (/кубок/.test(lower)) return "holding a cup";
  if (/банк|банкомат/.test(lower)) return "reacting near a bank or ATM";
  return "new relevant promotional pose";
}

function chooseComposition(projectKey: VisualProjectKey, command: string): VisualProductionPlan["composition"] {
  if (projectKey === "monopoly_pay") {
    return {
      preset: /банк|сигнализац|лучами/iu.test(command) ? "pay_alert_title_big_icons_bottom" : "pay_method_title_center_character_right",
      title_side: "left",
      character_side: "right",
    };
  }
  return { preset: "monopoly_banner_like_reference", title_side: "left", character_side: "right" };
}
