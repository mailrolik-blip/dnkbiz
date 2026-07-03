import { reviseBackgroundLayer } from "./reviseBackgroundLayer";
import { reviseFormat, reviseLayout } from "./reviseLayout";
import { reviseIllustrationLayer } from "./reviseIllustrationLayer";
import { reviseTextLayer } from "./reviseTextLayer";
import type { ReviseVisualJobInput, ReviseVisualJobResult } from "./types";

export async function reviseVisualJob(input: ReviseVisualJobInput): Promise<ReviseVisualJobResult> {
  const warnings: string[] = [];
  let result;

  if (input.target === "text" || input.target === "title_image") {
    result = reviseTextLayer(input.visual_job, input.instruction);
    if (result.job.title_image_layer) {
      result.job.title_image_layer = {
        ...result.job.title_image_layer,
        text: result.job.text_layer?.text || result.job.title_image_layer.text,
        source: "composer_fallback",
        revision_state: `updated:${new Date().toISOString()}`,
      };
    }
  }
  else if (input.target === "character") {
    result = reviseIllustrationLayer(input.visual_job, input.instruction, input.uploaded_assets);
    result.job.character_layer = {
      ...(result.job.character_layer || { enabled: true }),
      asset_path: result.job.illustration_layer?.asset_path || result.job.character_layer?.asset_path,
      locked: result.job.character_layer?.locked ?? result.job.illustration_layer?.locked,
    };
    result.warnings.push("Character revision is layer-scoped. Locked character is preserved unless explicit unlock/replacement is requested.");
  }
  else if (input.target === "illustration") result = reviseIllustrationLayer(input.visual_job, input.instruction, input.uploaded_assets);
  else if (input.target === "background") result = reviseBackgroundLayer(input.visual_job, input.instruction, input.uploaded_assets);
  else if (input.target === "layout") result = reviseLayout(input.visual_job, input.instruction);
  else result = reviseFormat(input.visual_job, input.instruction, input.options?.output_format);

  warnings.push(...result.warnings);
  return {
    ok: true,
    visual_job: result.job,
    target: input.target,
    warnings,
    changed_layers: [input.target],
  };
}
