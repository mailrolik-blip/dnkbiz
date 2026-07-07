import path from "node:path";
import type { VisualJob } from "../types";

export function validateLayerSourceIntegrity(job: VisualJob): string[] {
  const errors: string[] = [];
  const title = job.title_image_layer;
  if (!title) return errors;
  const titlePath = title.generated_asset_path || title.asset_path || "";
  const normalized = titlePath.replace(/\\/g, "/");
  if (title.source === "local_renderer") {
    if (!title.generated_asset_path) errors.push("local_renderer title must use generated_asset_path");
    if (title.asset_path) errors.push("local_renderer title must not keep asset_path");
    if (!normalized.includes("/.storage/visual_generated_assets/")) errors.push(`local_renderer title path must point to .storage/visual_generated_assets, got ${titlePath || "-"}`);
    if (normalized.includes("/manual_project_packs/")) errors.push(`local_renderer title path points to manual title asset: ${titlePath}`);
  }
  if (title.source === "asset" && title.generated_asset_path && !title.asset_path) errors.push("asset title source must use asset_path");
  if (titlePath && path.basename(titlePath).includes("-mock")) errors.push(`normal layer path must not point to mock output: ${titlePath}`);
  return errors;
}

