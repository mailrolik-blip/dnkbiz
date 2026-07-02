import type { VisualJob } from "../types";
import type { UploadedAsset } from "../jobBuilder";
import { parseRevisionInstruction } from "./parseRevisionInstruction";

export function reviseBackgroundLayer(job: VisualJob, instruction: string, uploadedAssets: UploadedAsset[] = []) {
  const parsed = parseRevisionInstruction(instruction);
  const next: VisualJob = structuredClone(job);
  const uploaded = uploadedAssets.find((asset) => (asset.type === "background" || asset.type === "photo") && asset.asset_path);
  next.background_layer = {
    ...(next.background_layer || { enabled: true }),
    enabled: true,
    asset_path: parsed.remove_layer ? "" : uploaded?.asset_path ?? next.background_layer?.asset_path ?? "",
    locked: Boolean(uploaded),
  };
  const warnings = uploaded || parsed.remove_layer ? [] : ["No background/photo asset supplied; kept existing background and stored revision intent in source_text."];
  if (!uploaded && !parsed.remove_layer) next.source_text = `${next.source_text || ""}\nBackground revision: ${instruction}`;
  return { job: next, warnings };
}
