import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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
  const missing: string[] = [];

  await addFile(entries, missing, "final.png", input.final_output_path, repoRoot, composerRoot);
  await addFile(entries, missing, "background.png", input.visual_job.background_layer?.generated_asset_path || input.visual_job.background_layer?.asset_path, repoRoot, composerRoot);
  await addFile(entries, missing, "character.png", input.visual_job.character_layer?.generated_asset_path || input.visual_job.character_layer?.asset_path || input.visual_job.illustration_layer?.asset_path, repoRoot, composerRoot);
  await addFile(entries, missing, "title.png", input.visual_job.title_image_layer?.generated_asset_path || input.visual_job.title_image_layer?.asset_path, repoRoot, composerRoot);
  if (!entries.some((entry) => entry.name === "title.png") && input.visual_job.title_image_layer?.text) {
    entries.push({ name: "title.png", data: await renderFallbackTitlePng(input.visual_job.title_image_layer.text) });
    const missingIndex = missing.indexOf("title.png");
    if (missingIndex >= 0) missing.splice(missingIndex, 1);
  }
  await addFile(entries, missing, "logo.png", input.visual_job.logo_layer?.asset_path || input.visual_job.brand?.logo_path, repoRoot, composerRoot);
  for (let index = 0; index < (input.visual_job.decor_layer?.icons || []).length; index += 1) {
    await addFile(entries, missing, `decor/decor-${index + 1}.png`, input.visual_job.decor_layer?.icons?.[index], repoRoot, composerRoot, false);
  }

  const promptLog = buildPromptLog(input.visual_job);
  const layerManifest = {
    job_id: input.job_id,
    project_key: input.visual_job.project_key,
    output_format: input.visual_job.output_format,
    final: "final.png",
    layers: {
      background: entries.some((entry) => entry.name === "background.png") ? "background.png" : null,
      character: entries.some((entry) => entry.name === "character.png") ? "character.png" : null,
      title: entries.some((entry) => entry.name === "title.png") ? "title.png" : null,
      logo: entries.some((entry) => entry.name === "logo.png") ? "logo.png" : null,
      decor_count: entries.filter((entry) => entry.name.startsWith("decor/")).length,
    },
    missing,
    source_manifest: input.manifest || {},
  };

  entries.push({ name: "visual_job.json", data: Buffer.from(JSON.stringify(input.visual_job, null, 2)) });
  entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(layerManifest, null, 2)) });
  entries.push({ name: "prompt_log.txt", data: Buffer.from(promptLog || "No AI prompt log recorded.", "utf8") });
  entries.push({ name: "README.txt", data: Buffer.from(buildReadme(input.visual_job), "utf8") });

  for (const entry of entries) {
    const target = path.join(folder, entry.name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, entry.data);
  }
  const zipPath = path.join(folder, `${input.job_id}-layers.zip`);
  await writeSimpleZip(zipPath, entries);
  return { folder_path: folder, zip_path: zipPath };
}

async function addFile(entries: Array<{ name: string; data: Buffer }>, missing: string[], name: string, assetPath: string | undefined, repoRoot: string, composerRoot: string, markMissing = true): Promise<void> {
  const resolved = resolveAssetPath(assetPath, repoRoot, composerRoot);
  if (!resolved) {
    if (markMissing) missing.push(name);
    return;
  }
  try {
    entries.push({ name, data: await fs.readFile(resolved) });
  } catch {
    if (markMissing) missing.push(name);
  }
}

function buildPromptLog(job: VisualJob): string {
  return [
    "# Prompt log",
    `project=${job.project_key}`,
    `format=${job.output_format}`,
    "",
    "## background",
    job.background_layer?.prompt_used || "-",
    "",
    "## illustration/character",
    job.illustration_layer?.prompt_used || job.character_layer?.warnings?.join("; ") || "-",
    "",
    "## title",
    job.title_image_layer?.warnings?.join("; ") || "-",
  ].join("\n");
}

function buildReadme(job: VisualJob): string {
  return [
    "DNK visual layer pack",
    "",
    "Open final.png to inspect the composed result.",
    "Open background.png, character.png, title.png and logo.png as separate Photoshop layers when present.",
    "To change text, replace title.png or edit title_image_layer in visual_job.json.",
    "To change the character pose, replace character.png or run a character revision in the bot.",
    "To change the background, replace background.png or run a background revision in the bot.",
    "decor/ contains optional icons or decorative assets.",
    "manifest.json lists missing optional layers.",
    "",
    `Project: ${job.project_key}`,
    `Format: ${job.output_format}`,
    `Title source: ${job.title_image_layer?.source || "-"}`,
    `Character source: ${job.character_layer?.source || "-"}`,
  ].join("\n");
}

async function renderFallbackTitlePng(text: string): Promise<Buffer> {
  const safeText = escapeXml(text.toUpperCase());
  const svg = `<svg width="1200" height="320" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="320" fill="none"/><text x="600" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="92" font-weight="900" fill="#fff6d1" stroke="#101820" stroke-width="12" paint-order="stroke">${safeText}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}
