import { reviseBackgroundLayer } from "./reviseBackgroundLayer";
import { reviseFormat, reviseLayout } from "./reviseLayout";
import { reviseIllustrationLayer } from "./reviseIllustrationLayer";
import { reviseTextLayer } from "./reviseTextLayer";
import type { ReviseVisualJobInput, ReviseVisualJobResult } from "./types";

export async function reviseVisualJob(input: ReviseVisualJobInput): Promise<ReviseVisualJobResult> {
  const warnings: string[] = [];
  let result;

  if (input.target === "text") result = reviseTextLayer(input.visual_job, input.instruction);
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
