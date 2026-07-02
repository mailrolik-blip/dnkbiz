import type { AssetSelectionRequest, AssetSelectionResult, ProjectAssetManifest, VisualAsset } from "./types";
import fs from "node:fs";
import path from "node:path";

export const EMPTY_ASSET_MANIFEST: ProjectAssetManifest = {
  version: "empty",
  assets: [],
};

const placeholderByType: Record<string, string> = {
  background: "",
  illustration: "",
  logo: "",
  reference: "",
  template: "",
  photo: "",
  qr: "",
  icon: "",
};

export function resolveVisualAsset(request: AssetSelectionRequest): AssetSelectionResult {
  const warnings: string[] = [];
  const manifest = request.manifest || EMPTY_ASSET_MANIFEST;
  const tags = request.tags || [];
  const candidates = manifest.assets.filter(
    (asset) =>
      asset.project_key === request.project_key &&
      asset.type === request.asset_type &&
      asset.safe_for_auto_use &&
      tags.every((tag) => asset.tags.includes(tag)),
  );

  const asset = chooseBestAsset(candidates, tags);
  if (!asset) {
    warnings.push(
      `No safe asset found for ${request.project_key}/${request.asset_type}; composer placeholder will be used.`,
    );
    return {
      ok: true,
      asset: null,
      asset_path: placeholderByType[request.asset_type] || "",
      is_placeholder: true,
      warnings,
    };
  }

  return {
    ok: true,
    asset,
    asset_path: asset.path,
    is_placeholder: false,
    warnings,
  };
}

export function loadDefaultAssetManifest(): ProjectAssetManifest {
  const localPath = path.join(process.cwd(), "ai", "agent", "visual_assets", "manifest.local.json");
  const examplePath = path.join(process.cwd(), "ai", "agent", "visual_assets", "manifest.example.json");
  for (const manifestPath of [localPath, examplePath]) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ProjectAssetManifest;
    } catch {
      // try next source
    }
  }
  return EMPTY_ASSET_MANIFEST;
}

function chooseBestAsset(assets: VisualAsset[], tags: string[]): VisualAsset | null {
  if (!assets.length) return null;
  return [...assets].sort((a, b) => scoreAsset(b, tags) - scoreAsset(a, tags))[0] || null;
}

function scoreAsset(asset: VisualAsset, tags: string[]) {
  return tags.reduce((score, tag) => score + (asset.tags.includes(tag) ? 1 : 0), 0);
}
