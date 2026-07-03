import fs from "node:fs/promises";
import path from "node:path";

export interface VisualAiUsageSummary {
  date: string;
  image_generations_count: number;
  text_generations_count: number;
  failed_generations_count: number;
  last_generation_at?: string;
  daily_limit: number;
  cost_guard_enabled: boolean;
  reset_at?: string;
}

type StoredUsage = Omit<VisualAiUsageSummary, "daily_limit" | "cost_guard_enabled">;

const usageRoot = path.join(process.cwd(), ".storage", "visual_ai_usage");

export async function canGenerateImage(): Promise<{ ok: boolean; reason?: string; summary: VisualAiUsageSummary }> {
  const summary = await getUsageSummary();
  if (!summary.cost_guard_enabled) return { ok: true, summary };
  if (summary.image_generations_count >= summary.daily_limit) {
    return { ok: false, reason: `VISUAL_AI_DAILY_LIMIT reached: ${summary.image_generations_count}/${summary.daily_limit}`, summary };
  }
  return { ok: true, summary };
}

export async function recordImageGeneration(success = true): Promise<VisualAiUsageSummary> {
  const usage = await readUsage();
  usage.image_generations_count += success ? 1 : 0;
  usage.failed_generations_count += success ? 0 : 1;
  usage.last_generation_at = new Date().toISOString();
  await writeUsage(usage);
  return getUsageSummary();
}

export async function recordTextGeneration(success = true): Promise<VisualAiUsageSummary> {
  const usage = await readUsage();
  usage.text_generations_count += success ? 1 : 0;
  usage.failed_generations_count += success ? 0 : 1;
  usage.last_generation_at = new Date().toISOString();
  await writeUsage(usage);
  return getUsageSummary();
}

export async function getUsageSummary(): Promise<VisualAiUsageSummary> {
  const usage = await readUsage();
  return {
    ...usage,
    daily_limit: Number(process.env.VISUAL_AI_DAILY_LIMIT || "20"),
    cost_guard_enabled: process.env.VISUAL_AI_COST_GUARD !== "false",
    reset_at: nextResetIso(),
  };
}

export async function resetLocalUsageForToday(): Promise<void> {
  await fs.rm(path.join(usageRoot, `${todayKey()}.json`), { force: true });
}

async function readUsage(): Promise<StoredUsage> {
  const today = todayKey();
  try {
    const parsed = JSON.parse(await fs.readFile(path.join(usageRoot, `${today}.json`), "utf8")) as StoredUsage;
    return {
      date: today,
      image_generations_count: Number(parsed.image_generations_count || 0),
      text_generations_count: Number(parsed.text_generations_count || 0),
      failed_generations_count: Number(parsed.failed_generations_count || 0),
      last_generation_at: parsed.last_generation_at,
    };
  } catch {
    return {
      date: today,
      image_generations_count: 0,
      text_generations_count: 0,
      failed_generations_count: 0,
    };
  }
}

async function writeUsage(usage: StoredUsage): Promise<void> {
  await fs.mkdir(usageRoot, { recursive: true });
  await fs.writeFile(path.join(usageRoot, `${usage.date}.json`), JSON.stringify(usage, null, 2), "utf8");
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextResetIso(): string {
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return next.toISOString();
}
