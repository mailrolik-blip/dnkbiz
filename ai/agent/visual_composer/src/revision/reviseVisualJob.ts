import { getPlacementPreset, nudgePlacement } from "../layouts/layerPlacement";
import { loadDefaultAssetManifest } from "../assets/assetResolver";
import { resolveApprovedPoseAsset, resolveApprovedTitleAsset } from "../assets/approvedAssetResolver";
import { reviseBackgroundLayer } from "./reviseBackgroundLayer";
import { reviseFormat, reviseLayout } from "./reviseLayout";
import { reviseIllustrationLayer } from "./reviseIllustrationLayer";
import { reviseTextLayer } from "./reviseTextLayer";
import type { ReviseVisualJobInput, ReviseVisualJobResult } from "./types";

export async function reviseVisualJob(input: ReviseVisualJobInput): Promise<ReviseVisualJobResult> {
  const warnings: string[] = [];
  let result;

  if (input.target === "text" || input.target === "title_image") {
    const placement = reviseTitlePlacement(input);
    if (placement) {
      result = { job: placement.job, warnings: placement.warnings };
    } else {
      result = reviseTextLayer(input.visual_job, input.instruction);
      if (result.job.title_image_layer) {
        const approvedTitle = resolveApprovedTitleAsset({
          project_key: result.job.project_key,
          title: result.job.text_layer?.text || result.job.title_image_layer.text,
          manifest: loadDefaultAssetManifest(),
        });
        result.job.title_image_layer = {
          ...result.job.title_image_layer,
          text: result.job.text_layer?.text || result.job.title_image_layer.text,
          asset_path: approvedTitle.asset_path || undefined,
          generated_asset_path: approvedTitle.asset_path ? undefined : result.job.title_image_layer.generated_asset_path,
          source: approvedTitle.asset_path ? "asset" : "composer_fallback",
          revision_state: `updated:${new Date().toISOString()}`,
          warnings: [...(result.job.title_image_layer.warnings || []), approvedTitle.log],
        };
        if (approvedTitle.asset_path) result.warnings.push(approvedTitle.log);
      }
    }
  }
  else if (input.target === "character") {
    const placement = reviseCharacterPlacement(input);
    if (placement) {
      result = { job: placement.job, warnings: placement.warnings };
    } else {
      const approvedPose = resolveApprovedPoseAsset({ project_key: input.visual_job.project_key, instruction: input.instruction, manifest: loadDefaultAssetManifest() });
      if (approvedPose.asset_path) {
        const next = structuredClone(input.visual_job);
        next.character_layer = {
          ...(next.character_layer || { enabled: true }),
          enabled: true,
          asset_path: approvedPose.asset_path,
          generated_asset_path: undefined,
          role: "main_character",
          lock_policy: approvedPose.asset?.lock_policy || "replaceable",
          source: "asset",
          locked: false,
          warnings: [...(next.character_layer?.warnings || []), approvedPose.log],
        };
        next.illustration_layer = {
          ...(next.illustration_layer || { enabled: true }),
          enabled: true,
          asset_path: approvedPose.asset_path,
          locked: false,
          warnings: [...(next.illustration_layer?.warnings || []), approvedPose.log],
        };
        result = { job: next, warnings: [approvedPose.log, "character revision used approved_pose without AI generation"] };
      } else {
        result = reviseIllustrationLayer(input.visual_job, input.instruction, input.uploaded_assets);
      }
      result.job.character_layer = {
        ...(input.visual_job.character_layer || { enabled: true }),
        ...(result.job.character_layer || {}),
        asset_path: result.job.character_layer?.asset_path || input.visual_job.character_layer?.asset_path || result.job.illustration_layer?.asset_path,
        generated_asset_path: result.job.character_layer?.generated_asset_path || input.visual_job.character_layer?.generated_asset_path,
        locked: input.visual_job.character_layer?.locked ?? result.job.illustration_layer?.locked,
      };
      result.warnings.push("Character revision is layer-scoped. Locked character is preserved unless explicit unlock/replacement is requested.");
    }
  }
  else if (input.target === "illustration") result = reviseIllustrationLayer(input.visual_job, input.instruction, input.uploaded_assets);
  else if (input.target === "background") result = reviseBackgroundLayer(input.visual_job, input.instruction, input.uploaded_assets);
  else if (input.target === "layout") result = reviseLayout(input.visual_job, input.instruction);
  else result = reviseFormat(input.visual_job, input.instruction, input.options?.output_format);

  warnings.push(...result.warnings);
  return { ok: true, visual_job: result.job, target: input.target, warnings, changed_layers: [input.target] };
}

function reviseTitlePlacement(input: ReviseVisualJobInput): { job: ReviseVisualJobInput["visual_job"]; warnings: string[] } | null {
  if (!isPlacementCommand(input.instruction, "title")) return null;
  const next = structuredClone(input.visual_job);
  const preset = getPlacementPreset(next.project_key, next.layout.variant);
  const placement = nudgePlacement(next.title_image_layer?.placement, preset.title_image, input.instruction, "title");
  if (!placement) return null;
  next.title_image_layer = { ...(next.title_image_layer || { enabled: true, text: next.text_layer?.text || "" }), enabled: true, placement, revision_state: `placement:${new Date().toISOString()}` };
  return { job: next, warnings: [/обрез/i.test(input.instruction) ? "fixed title crop by reducing title placement without regenerating title_image_layer" : "title placement updated without regenerating title_image_layer"] };
}

function reviseCharacterPlacement(input: ReviseVisualJobInput): { job: ReviseVisualJobInput["visual_job"]; warnings: string[] } | null {
  if (!isPlacementCommand(input.instruction, "character")) return null;
  const next = structuredClone(input.visual_job);
  const preset = getPlacementPreset(next.project_key, next.layout.variant);
  const placement = nudgePlacement(next.character_layer?.placement, preset.character, input.instruction, "character");
  if (!placement) return null;
  next.character_layer = { ...(next.character_layer || { enabled: true }), enabled: true, placement };
  return { job: next, warnings: ["character placement updated without AI generation"] };
}

function isPlacementCommand(instruction: string, layer: "title" | "character"): boolean {
  const lower = instruction.toLowerCase();
  const titleWords = /текст|заголов|надпис|title/.test(lower);
  const characterWords = /дед|персонаж|character/.test(lower);
  const action = /увелич|уменьш|меньш|крупн|больше|растяни|левее|влево|справа|слева|правее|вправо|выше|ниже|вниз|наверх|вверх|обрез/.test(lower);
  if (!action) return false;
  if (layer === "title") return titleWords || !characterWords;
  return characterWords;
}

