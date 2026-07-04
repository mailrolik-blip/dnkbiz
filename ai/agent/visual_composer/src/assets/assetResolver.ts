import type { AssetSelectionRequest, AssetSelectionResult, ProjectAssetManifest, VisualAsset } from "./types";
import fs from "node:fs";
import path from "node:path";

export const EMPTY_ASSET_MANIFEST: ProjectAssetManifest = {
  version: "empty",
  assets: [],
};

const placeholderByType: Record<string, string> = {
  background: "",
  character: "",
  illustration: "",
  logo: "",
  title_image: "",
  character_pose: "",
  reference: "",
  composition_template: "",
  template: "",
  decor: "",
  photo: "",
  qr: "",
  icon: "",
  print: "",
};

export function resolveVisualAsset(request: AssetSelectionRequest): AssetSelectionResult {
  const warnings: string[] = [];
  const selectionLog: string[] = [];
  const manifest = request.manifest || EMPTY_ASSET_MANIFEST;
  const tags = request.tags || [];
  const projectAssets = manifest.assets.filter((asset) => asset.project_key === request.project_key);
  const typeAssets = projectAssets.filter((asset) => asset.type === request.asset_type);
  const modeAssets = typeAssets.filter((asset) => modeAllowed(asset, request.visual_mode));
  const safeAssets = modeAssets.filter((asset) => asset.safe_for_auto_use !== false);
  const policyAssets = request.lock_policy
    ? safeAssets.filter((asset) => asset.lock_policy === request.lock_policy)
    : safeAssets.filter((asset) => request.asset_type !== "reference" || asset.lock_policy !== "locked");
  const roleAssets = request.role
    ? policyAssets.filter((asset) => !asset.role || asset.role === request.role)
    : policyAssets;
  const candidates = roleAssets.length ? roleAssets : policyAssets;
  const tagMatches = candidates.filter((asset) => tags.some((tag) => asset.tags.includes(tag))).length;

  selectionLog.push(
    [
      `selection project=${request.project_key} type=${request.asset_type} role=${request.role || "-"} lock=${request.lock_policy || "-"} mode=${request.visual_mode || "-"} tags=${tags.join(",") || "-"}`,
      `manifest_project_total=${projectAssets.length}`,
      `after_type=${typeAssets.length}`,
      `after_mode=${modeAssets.length}`,
      `after_safe=${safeAssets.length}`,
      `after_lock=${policyAssets.length}`,
      `after_role=${roleAssets.length}`,
      `candidates=${candidates.length}`,
      `tag_matches=${tagMatches}`,
    ].join(" "),
  );
  if (typeAssets.length && !modeAssets.length) selectionLog.push(`reject_summary mode_mismatch=${typeAssets.length} requested_mode=${request.visual_mode || "-"}`);
  if (modeAssets.length && !safeAssets.length) selectionLog.push(`reject_summary unsafe=${modeAssets.length}`);
  if (safeAssets.length && !policyAssets.length) selectionLog.push(`reject_summary lock_policy_mismatch=${safeAssets.length} requested_lock=${request.lock_policy || "-"}`);
  if (request.role && policyAssets.length && !roleAssets.length) selectionLog.push(`role_optional_no_match requested=${request.role}; falling back to same project/type assets`);
  if (tags.length && candidates.length && !tagMatches) selectionLog.push(`tag_preference_no_exact_match requested=${tags.join(",")}; selecting by priority from same project/type/mode`);

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
      selection_log: selectionLog,
    };
  }
  selectionLog.push(`selected=${asset.id} path=${asset.path} role=${asset.role || "-"} lock=${asset.lock_policy || "-"} priority=${asset.priority || 0} tags=${asset.tags.join(",")}`);

  return {
    ok: true,
    asset,
    asset_path: asset.path,
    is_placeholder: false,
    warnings,
    selection_log: selectionLog,
  };
}

function modeAllowed(asset: VisualAsset, visualMode: AssetSelectionRequest["visual_mode"]): boolean {
  if (!visualMode) return true;
  return !asset.recommended_modes?.length || asset.recommended_modes.includes(visualMode);
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
  const lockScore = asset.lock_policy === "locked" ? 40 : asset.lock_policy === "replaceable" ? 20 : asset.lock_policy === "reference_only" ? 10 : 0;
  return (asset.priority || 0) * 10 + lockScore + tags.reduce((score, tag) => score + (asset.tags.includes(tag) ? 5 : 0), 0);
}
