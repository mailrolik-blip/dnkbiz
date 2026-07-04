import { composeVisualJob } from "../compose";
import { boxToTopLeftPlacement, clampBoxToCanvas } from "../layouts/layerPlacement";
import type { ComposeResult, VisualJob } from "../types";
import { runVisualQa, type VisualQaResult } from "../quality/visualQa";

export interface ComposeWithQaResult {
  compose_result: ComposeResult;
  visual_job: VisualJob;
  qa: VisualQaResult;
  repair_actions: string[];
}

export async function composeWithVisualQaRepair(job: VisualJob, maxAttempts = 2): Promise<ComposeWithQaResult> {
  let working: VisualJob = structuredClone(job);
  const repairActions: string[] = [];
  let composeResult = await composeVisualJob(working);
  let qa = runVisualQa(working, { output_path: composeResult.output_path, width: composeResult.width, height: composeResult.height });
  for (let attempt = 0; attempt < maxAttempts && !qa.ok; attempt += 1) {
    const repaired = repairVisualJob(working, qa, composeResult.width, composeResult.height);
    if (!repaired.changed) break;
    working = repaired.job;
    repairActions.push(...repaired.actions.map((action) => `attempt=${attempt + 1} ${action}`));
    composeResult = await composeVisualJob(working);
    qa = runVisualQa(working, { output_path: composeResult.output_path, width: composeResult.width, height: composeResult.height });
  }
  return { compose_result: composeResult, visual_job: working, qa, repair_actions: repairActions };
}

function repairVisualJob(job: VisualJob, qa: VisualQaResult, width: number, height: number): { job: VisualJob; changed: boolean; actions: string[] } {
  const next = structuredClone(job);
  const actions: string[] = [];
  if (qa.autoRepairSuggestions.includes("clamp_title_box") || qa.autoRepairSuggestions.includes("render_title_png")) {
    const box = next.layout.boxes?.title_image_box;
    if (box) {
      const safe = next.project_key === "monopoly_pay" && width >= 1600 ? 80 : width >= 1600 ? 72 : 48;
      const reduced = { ...box, width: Math.round(box.width * 0.9), height: Math.round(box.height * 0.9) };
      const clamped = clampBoxToCanvas(reduced, { width, height }, safe);
      next.title_image_layer = {
        ...(next.title_image_layer || { enabled: true, text: next.text_layer?.text || "" }),
        placement: boxToTopLeftPlacement(clamped, { width, height }),
      };
      actions.push(`title_crop_repair_success scale_before=${box.width}x${box.height} scale_after=${clamped.width}x${clamped.height}`);
    }
  }
  return { job: next, changed: actions.length > 0, actions };
}
