import fs from "node:fs";
import type { QualityCheckInput, QualityCheckResult } from "./types";

export function qualityCheckVisual(input: QualityCheckInput): QualityCheckResult {
  const warnings: string[] = [];
  const critical: string[] = [];
  const job = input.visual_job;

  if (job.text_layer?.enabled && !job.text_layer.text?.trim()) {
    warnings.push("text_layer is enabled but empty.");
  }
  if (input.compose_result) {
    if (!fs.existsSync(input.compose_result.output_path)) critical.push(`output file does not exist: ${input.compose_result.output_path}`);
    if (job.layout.width && input.compose_result.width !== job.layout.width) warnings.push(`width mismatch: expected ${job.layout.width}, got ${input.compose_result.width}.`);
    if (job.layout.height && input.compose_result.height !== job.layout.height) warnings.push(`height mismatch: expected ${job.layout.height}, got ${input.compose_result.height}.`);
  }
  if (input.expected?.project_key && job.project_key !== input.expected.project_key) {
    critical.push(`project_key mismatch: expected ${input.expected.project_key}, got ${job.project_key}.`);
  }
  if (input.expected?.visual_mode && job.visual_mode !== input.expected.visual_mode) {
    critical.push(`visual_mode mismatch: expected ${input.expected.visual_mode}, got ${job.visual_mode}.`);
  }
  if (input.expected?.uploaded_photo_required && !job.background_layer?.asset_path && !job.illustration_layer?.asset_path) {
    critical.push("photo template expected uploaded photo asset, but no photo/background asset path is set.");
  }

  if (input.previous_job && input.revision_target) {
    const previous = input.previous_job;
    if (input.revision_target === "text") {
      if (job.background_layer?.asset_path !== previous.background_layer?.asset_path) warnings.push("text revision changed background asset.");
      if (job.illustration_layer?.asset_path !== previous.illustration_layer?.asset_path) warnings.push("text revision changed illustration asset.");
    }
    if (input.revision_target === "background" && job.text_layer?.text !== previous.text_layer?.text) warnings.push("background revision changed text.");
    if (input.revision_target === "layout" && job.text_layer?.text !== previous.text_layer?.text) warnings.push("layout revision changed text.");
  }

  return {
    ok: critical.length === 0,
    warnings,
    critical,
  };
}
