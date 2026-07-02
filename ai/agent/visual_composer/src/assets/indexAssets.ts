import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectAssetManifest, VisualAsset, VisualAssetType } from "./types";
import type { VisualProjectKey } from "../types";

const projectKeys: VisualProjectKey[] = ["monopoly", "monopoly_pay", "casper", "gorilla_hockey"];
const typeByDir: Record<string, VisualAssetType> = {
  backgrounds: "background",
  illustrations: "illustration",
  logos: "logo",
  references: "reference",
  templates: "template",
  photos: "photo",
  print: "template",
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
          path: path.relative(process.cwd(), fullPath).replace(/\\/g, "/"),
          tags: meta.tags || [],
          usage: meta.usage || type,
          description: meta.description || "",
          safe_for_auto_use: meta.safe_for_auto_use ?? true,
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

async function readMeta(metaPath: string): Promise<Partial<VisualAsset>> {
  try {
    return JSON.parse(await fs.readFile(metaPath, "utf8")) as Partial<VisualAsset>;
  } catch {
    return {};
  }
}
