import fs from "node:fs/promises";
import path from "node:path";
import type { VisualJob } from "../types";
import { resolveAssetPath } from "../utils/loadImage";
import { writeSimpleZip } from "./simpleZip";

export async function exportLayerPack(input: {
  job_id: string;
  visual_job: VisualJob;
  final_output_path: string;
  manifest?: unknown;
}): Promise<{ folder_path: string; zip_path: string }> {
  const folder = path.join(process.cwd(), ".storage", "visual_layer_packs", input.job_id);
  await fs.mkdir(folder, { recursive: true });
  const repoRoot = process.cwd();
  const composerRoot = path.join(repoRoot, "ai", "agent", "visual_composer");
  const entries: Array<{ name: string; data: Buffer }> = [];

  await addFile(entries, "final.png", input.final_output_path, repoRoot, composerRoot);
  await addFile(entries, "background.png", input.visual_job.background_layer?.asset_path, repoRoot, composerRoot);
  await addFile(entries, "character.png", input.visual_job.character_layer?.asset_path || input.visual_job.illustration_layer?.asset_path, repoRoot, composerRoot);
  await addFile(entries, "title.png", input.visual_job.title_image_layer?.asset_path || input.visual_job.title_image_layer?.generated_asset_path, repoRoot, composerRoot);
  await addFile(entries, "logo.png", input.visual_job.logo_layer?.asset_path || input.visual_job.brand?.logo_path, repoRoot, composerRoot);
  for (let index = 0; index < (input.visual_job.decor_layer?.icons || []).length; index += 1) {
    await addFile(entries, `decor-${index + 1}.png`, input.visual_job.decor_layer?.icons?.[index], repoRoot, composerRoot);
  }

  entries.push({ name: "visual_job.json", data: Buffer.from(JSON.stringify(input.visual_job, null, 2)) });
  entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(input.manifest || {}, null, 2)) });
  for (const entry of entries) {
    const target = path.join(folder, entry.name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, entry.data);
  }
  const zipPath = path.join(folder, `${input.job_id}-layers.zip`);
  await writeSimpleZip(zipPath, entries);
  return { folder_path: folder, zip_path: zipPath };
}

async function addFile(entries: Array<{ name: string; data: Buffer }>, name: string, assetPath: string | undefined, repoRoot: string, composerRoot: string): Promise<void> {
  const resolved = resolveAssetPath(assetPath, repoRoot, composerRoot);
  if (!resolved) return;
  try {
    entries.push({ name, data: await fs.readFile(resolved) });
  } catch {
    // Missing optional layer files are omitted from the pack.
  }
}
