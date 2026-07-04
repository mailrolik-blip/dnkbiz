import type { ProjectAssetManifest, VisualAsset } from "./types";
import type { VisualProjectKey } from "../types";

export interface ApprovedAssetMatch {
  asset: VisualAsset | null;
  asset_path: string;
  exact?: boolean;
  score: number;
  log: string;
}

export function resolveApprovedTitleAsset(input: {
  project_key: VisualProjectKey;
  title: string;
  manifest?: ProjectAssetManifest;
}): ApprovedAssetMatch {
  const title = normalizeText(input.title);
  const assets = approvedAssets(input.manifest, input.project_key, "title_image");
  const scored = assets.map((asset) => {
    const assetText = normalizeText(asset.text || titleFromTags(asset.tags));
    const exact = Boolean(assetText && assetText === title);
    const score = (asset.priority || 0) * 10
      + (exact ? 10000 : 0)
      + overlapScore(title, assetText)
      + overlapScore(title, asset.tags.join(" "));
    return { asset, exact, score };
  }).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score <= 0) {
    return { asset: null, asset_path: "", exact: false, score: 0, log: `title_asset_match exact=false source=missing title=${title}` };
  }
  return {
    asset: best.asset,
    asset_path: best.asset.path,
    exact: best.exact,
    score: best.score,
    log: `title_asset_match exact=${best.exact ? "true" : "false"} source=approved_asset asset_path=${best.asset.path}`,
  };
}

export function resolveApprovedPoseAsset(input: {
  project_key: VisualProjectKey;
  instruction: string;
  manifest?: ProjectAssetManifest;
}): ApprovedAssetMatch & { requested_pose: string } {
  const requestedTags = poseTags(input.instruction);
  const requestedPose = requestedTags.join(",") || normalizeText(input.instruction);
  const assets = approvedAssets(input.manifest, input.project_key, "character_pose");
  const scored = assets.map((asset) => {
    const tags = [...asset.tags, asset.pose || ""].map(normalizeTag).filter(Boolean);
    const matches = requestedTags.filter((tag) => tags.includes(tag)).length;
    const score = (asset.priority || 0) * 10 + matches * 100 + (asset.role === "main_character" ? 20 : 0);
    return { asset, score };
  }).filter((item) => item.score > (item.asset.priority || 0) * 10).sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) {
    return {
      asset: null,
      asset_path: "",
      score: 0,
      requested_pose: requestedPose,
      log: `pose_asset_match requested_pose=${requestedPose || "-"} selected_pose=- source=locked_character`,
    };
  }
  return {
    asset: best.asset,
    asset_path: best.asset.path,
    score: best.score,
    requested_pose: requestedPose,
    log: `pose_asset_match requested_pose=${requestedPose || "-"} selected_pose=${best.asset.pose || best.asset.tags.join(",") || "-"} source=approved_pose asset_path=${best.asset.path}`,
  };
}

function approvedAssets(manifest: ProjectAssetManifest | undefined, projectKey: VisualProjectKey, type: VisualAsset["type"]): VisualAsset[] {
  const productionAssetFirst = process.env.VISUAL_PRODUCTION_ASSET_FIRST !== "false";
  if (!productionAssetFirst) return [];
  return (manifest?.assets || [])
    .filter((asset) => asset.project_key === projectKey)
    .filter((asset) => asset.type === type)
    .filter((asset) => asset.approved === true)
    .filter((asset) => asset.safe_for_auto_use !== false)
    .filter((asset) => !asset.recommended_modes?.length || asset.recommended_modes.includes("composer"));
}

export function normalizeText(value: string): string {
  return value
    .toUpperCase()
    .replace(/Ё/g, "Е")
    .replace(/[^A-ZА-Я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTag(value: string): string {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

function titleFromTags(tags: string[]): string {
  return tags.join(" ");
}

function overlapScore(title: string, value: string): number {
  if (!title || !value) return 0;
  const titleWords = new Set(title.split(" ").filter(Boolean));
  const valueWords = new Set(normalizeText(value).split(" ").filter(Boolean));
  let score = 0;
  for (const word of titleWords) {
    if (valueWords.has(word)) score += 25;
  }
  return score;
}

function poseTags(value: string): string[] {
  const lower = value.toLowerCase().replace(/ё/g, "е");
  const tags = new Set<string>();
  if (/дед|ded|персонаж/.test(lower)) tags.add("ded");
  if (/телефон|phone|смартфон/.test(lower)) tags.add("phone");
  if (/кубок|cup|троф/.test(lower)) tags.add("cup");
  if (/карт/.test(lower)) tags.add("card");
  if (/чек|receipt/.test(lower)) tags.add("receipt");
  if (/показыв|point|указыв/.test(lower)) tags.add("points_up");
  if (/банк|bank|банкомат|atm/.test(lower)) tags.add("bank");
  return [...tags];
}
