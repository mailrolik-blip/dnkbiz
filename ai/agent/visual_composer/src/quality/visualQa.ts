import fs from "node:fs";
import type { VisualJob } from "../types";

export interface VisualQaIssue {
  code: string;
  message: string;
  layer?: string;
}

export interface VisualQaResult {
  ok: boolean;
  errors: VisualQaIssue[];
  warnings: VisualQaIssue[];
  autoRepairSuggestions: string[];
}

export function runVisualQa(job: VisualJob, output?: { output_path?: string; width?: number; height?: number }): VisualQaResult {
  const errors: VisualQaIssue[] = [];
  const warnings: VisualQaIssue[] = [];
  const autoRepairSuggestions: string[] = [];
  const width = job.layout.width || job.final_composite?.width || output?.width || 0;
  const height = job.layout.height || job.final_composite?.height || output?.height || 0;
  const titleBox = job.layout.boxes?.title_image_box;
  const characterBox = job.layout.boxes?.character_box;
  const logoBox = job.layout.boxes?.logo_box;
  const safe = job.project_key === "monopoly_pay" && width >= 1600 ? 80 : width >= 1600 ? 72 : 48;

  if (output?.output_path && !fs.existsSync(output.output_path)) errors.push(issue("output_missing", `Output file does not exist: ${output.output_path}`, "output"));
  if (output?.width && width && output.width !== width) warnings.push(issue("output_width_mismatch", `Expected width ${width}, got ${output.width}`, "output"));
  if (output?.height && height && output.height !== height) warnings.push(issue("output_height_mismatch", `Expected height ${height}, got ${output.height}`, "output"));
  if (job.project_key === "gorilla_hockey" && job.output_format === "square_1024x1024" && (width !== 1024 || height !== 1024)) errors.push(issue("hockey_default_size_invalid", "Hockey default output must be 1024x1024.", "output"));
  if ((job.project_key === "monopoly" || job.project_key === "monopoly_pay" || job.project_key === "casper") && job.output_format === "wide_1920x1080" && (width !== 1920 || height !== 1080)) warnings.push(issue("wide_size_unexpected", "Wide project output should be 1920x1080.", "output"));

  if (job.title_image_layer?.enabled) {
    const titlePath = job.title_image_layer.generated_asset_path || job.title_image_layer.asset_path;
    if (!titlePath) {
      errors.push(issue("title_path_missing", "title_image_layer has no real title PNG path.", "title"));
      autoRepairSuggestions.push("render_title_png");
    } else if (!fs.existsSync(titlePath)) {
      errors.push(issue("title_path_not_found", `Title PNG path not found: ${titlePath}`, "title"));
      autoRepairSuggestions.push("render_title_png");
    }
    if (!titleBox) {
      errors.push(issue("title_box_missing", "title_image_box missing.", "title"));
      autoRepairSuggestions.push("resolve_title_box");
    } else {
      if (!boxInside(titleBox, width, height, safe)) {
        errors.push(issue("title_box_outside_canvas", `Title box outside safe canvas: ${formatBox(titleBox)}`, "title"));
        autoRepairSuggestions.push("clamp_title_box");
      }
      if (titleBox.width < width * 0.34 || titleBox.height < height * 0.12) warnings.push(issue("title_too_small", `Title box may be too small: ${formatBox(titleBox)}`, "title"));
    }
  }

  if (characterBox) {
    if (!boxInside(characterBox, width, height, 0)) {
      warnings.push(issue("character_box_outside_canvas", `Character box outside canvas: ${formatBox(characterBox)}`, "character"));
      autoRepairSuggestions.push("clamp_character_box");
    }
    if ((job.project_key === "monopoly" || job.project_key === "monopoly_pay") && characterBox.height < height * 0.42) warnings.push(issue("character_too_small", "Character may be too small.", "character"));
  } else if ((job.project_key === "monopoly" || job.project_key === "monopoly_pay") && (job.character_layer?.asset_path || job.character_layer?.generated_asset_path)) {
    warnings.push(issue("character_box_missing", "Character asset exists but character_box missing.", "character"));
  }

  if (logoBox && !boxInside(logoBox, width, height, 0)) warnings.push(issue("logo_box_outside_canvas", `Logo box outside canvas: ${formatBox(logoBox)}`, "logo"));
  return { ok: errors.length === 0, errors, warnings, autoRepairSuggestions: [...new Set(autoRepairSuggestions)] };
}

function boxInside(box: { x: number; y: number; width: number; height: number }, canvasWidth: number, canvasHeight: number, safe: number): boolean {
  return box.x >= safe && box.y >= safe && box.x + box.width <= canvasWidth - safe && box.y + box.height <= canvasHeight - safe;
}

function issue(code: string, message: string, layer?: string): VisualQaIssue {
  return { code, message, layer };
}

function formatBox(box: { x: number; y: number; width: number; height: number }): string {
  return `${box.x},${box.y},${box.width}x${box.height}`;
}
