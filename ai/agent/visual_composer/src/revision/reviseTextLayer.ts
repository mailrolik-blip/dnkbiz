import type { VisualJob } from "../types";
import { parseRevisionInstruction } from "./parseRevisionInstruction";

export function reviseTextLayer(job: VisualJob, instruction: string): { job: VisualJob; warnings: string[] } {
  const parsed = parseRevisionInstruction(instruction);
  const next: VisualJob = structuredClone(job);
  next.text_layer = {
    ...(next.text_layer || { enabled: true }),
    enabled: true,
    text: parsed.replacement_text || next.text_layer?.text || instruction.trim().toUpperCase(),
  };
  return { job: next, warnings: parsed.replacement_text ? [] : ["No explicit replacement text detected; used instruction as title."] };
}
