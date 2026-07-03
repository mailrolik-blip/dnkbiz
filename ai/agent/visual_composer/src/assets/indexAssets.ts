import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectAssetManifest, VisualAsset, VisualAssetType } from "./types";
import type { VisualProjectKey } from "../types";

const projectKeys: VisualProjectKey[] = ["monopoly", "monopoly_pay", "casper", "gorilla_hockey"];
const typeByDir: Record<string, VisualAssetType> = {
  backgrounds: "background",
  characters: "character",
  illustrations: "illustration",
  logos: "logo",
  references: "reference",
  style: "reference",
  templates: "template",
  icons: "icon",
  photos: "photo",
  print: "print",
  qr: "qr",
};

export async function indexVisualAssets(rootDir = path.join(process.cwd(), "ai", "agent", "visual_assets")): Promise<ProjectAssetManifest> {
  const assets: VisualAsset[] = [];
  for (const baseDir of [rootDir, path.join(rootDir, "manual_project_packs")]) {
  for (const projectKey of projectKeys) {
    const projectDir = path.join(baseDir, projectKey);
    for (const [dirName, type] of Object.entries(typeByDir)) {
      const dir = path.join(projectDir, dirName);
      const entries = await fs.readdir(dir).catch(() => []);
      for (const entry of entries) {
        if (entry.startsWith(".") || entry.endsWith(".meta.json")) continue;
        const fullPath = path.join(dir, entry);
        const stat = await fs.stat(fullPath).catch(() => null);
        if (!stat?.isFile()) continue;
        const metaPath = fullPath.replace(/\.[^.]+$/, ".meta.json");
        const meta = await readMeta(metaPath);
        assets.push({
          id: `${projectKey}-${dirName}-${path.parse(entry).name}`,
          project_key: projectKey,
          type,
          role: meta.role || defaultRole(type),
          path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/"),
          tags: meta.tags || [],
          usage: meta.usage || type,
          description: meta.description || "",
          safe_for_auto_use: meta.safe_for_auto_use ?? true,
          priority: meta.priority || 0,
          lock_policy: meta.lock_policy || defaultLockPolicy(type),
          recommended_modes: meta.recommended_modes || [],
          negative_notes: meta.negative_notes || "",
          notes: meta.notes || "",
          created_at: meta.created_at,
        });
      }
    }
  }
  }

  return {
    version: `local-${new Date().toISOString()}`,
    assets,
  };
}

function defaultRole(type: VisualAssetType): VisualAsset["role"] {
  if (type === "character") return "main_character";
  if (type === "logo") return "brand_logo";
  if (type === "reference") return "style_reference";
  if (type === "background") return "background";
  if (type === "template") return "composition_reference";
  return undefined;
}

function defaultLockPolicy(type: VisualAssetType): VisualAsset["lock_policy"] {
  if (type === "character" || type === "logo") return "locked";
  if (type === "reference") return "reference_only";
  if (type === "background" || type === "illustration") return "replaceable";
  return "optional";
}

async function readMeta(metaPath: string): Promise<Partial<VisualAsset>> {
  try {
    return JSON.parse(await fs.readFile(metaPath, "utf8")) as Partial<VisualAsset>;
  } catch {
    return {};
  }
}
