import type { VisualJob } from "../types";
import type { UploadedAsset } from "../jobBuilder";
import { parseRevisionInstruction } from "./parseRevisionInstruction";

export function reviseIllustrationLayer(job: VisualJob, instruction: string, uploadedAssets: UploadedAsset[] = []) {
  const parsed = parseRevisionInstruction(instruction);
  const next: VisualJob = structuredClone(job);
  const uploaded = uploadedAssets.find((asset) => asset.type === "illustration" && asset.asset_path);
  next.illustration_layer = {
    ...(next.illustration_layer || { enabled: true }),
    enabled: !parsed.remove_layer,
    asset_path: uploaded?.asset_path ?? next.illustration_layer?.asset_path ?? "",
    locked: Boolean(uploaded),
  };
  const warnings = uploaded || parsed.remove_layer ? [] : ["No illustration asset supplied; kept existing illustration and stored revision intent in source_text."];
  if (!uploaded && !parsed.remove_layer) next.source_text = `${next.source_text || ""}\nIllustration revision: ${instruction}`;
  return { job: next, warnings };
}
