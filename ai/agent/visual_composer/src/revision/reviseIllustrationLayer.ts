import type { VisualJob } from "../types";
import type { UploadedAsset } from "../jobBuilder";
import { parseRevisionInstruction } from "./parseRevisionInstruction";

export function reviseIllustrationLayer(job: VisualJob, instruction: string, uploadedAssets: UploadedAsset[] = []) {
  const parsed = parseRevisionInstruction(instruction);
  const next: VisualJob = structuredClone(job);
  const uploaded = uploadedAssets.find((asset) => asset.type === "illustration" && asset.asset_path);
  const hasLockedCharacter = Boolean(next.style_assets?.main_character && next.illustration_layer?.locked);
  const unlockRequested = /unlock|разблок|замени персонажа|без старого персонажа/i.test(instruction);
  const unlockRequestedRu = /разблок|замени\s+персонажа|без\s+старого\s+персонажа|новый\s+персонаж/i.test(instruction);
  if (hasLockedCharacter && !uploaded && !unlockRequested && !unlockRequestedRu) {
    next.source_text = `${next.source_text || ""}\nIllustration/background revision with locked character preserved: ${instruction}`;
    return { job: next, warnings: ["Locked main character preserved; change surrounding illustration/background or explicitly request unlock/replacement."] };
  }
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
