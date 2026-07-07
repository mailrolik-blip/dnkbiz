import fs from "node:fs/promises";
import path from "node:path";

export type TriggerState = "claimed" | "running" | "completed" | "canceled" | "failed";

export interface ProcessedTriggerRecord {
  key: string;
  state: TriggerState;
  job_id?: string;
  created_at: string;
  updated_at: string;
  duplicate_trigger_filtered?: boolean;
}

export class ProcessedTriggerRegistry {
  constructor(private readonly dir = path.join(process.cwd(), ".storage", "visual_triggers")) {}

  async claim(key: string): Promise<{ claimed: boolean; record: ProcessedTriggerRecord }> {
    await fs.mkdir(this.dir, { recursive: true });
    const filePath = this.pathFor(key);
    const now = new Date().toISOString();
    try {
      const existing = JSON.parse(await fs.readFile(filePath, "utf8")) as ProcessedTriggerRecord;
      return { claimed: false, record: { ...existing, duplicate_trigger_filtered: true } };
    } catch {
      const record: ProcessedTriggerRecord = { key, state: "claimed", created_at: now, updated_at: now };
      await fs.writeFile(filePath, JSON.stringify(record, null, 2), { encoding: "utf8", flag: "wx" });
      return { claimed: true, record };
    }
  }

  async update(key: string, state: TriggerState, jobId?: string): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const filePath = this.pathFor(key);
    const now = new Date().toISOString();
    let record: ProcessedTriggerRecord = { key, state, job_id: jobId, created_at: now, updated_at: now };
    try {
      record = { ...(JSON.parse(await fs.readFile(filePath, "utf8")) as ProcessedTriggerRecord), state, job_id: jobId, updated_at: now };
    } catch {
      // Create missing state file for defensive use.
    }
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), "utf8");
  }

  private pathFor(key: string): string {
    return path.join(this.dir, `${key.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
  }
}

export function isStaleTrigger(timestampMs: number | undefined, thresholdSeconds = Number(process.env.TELEGRAM_STALE_UPDATE_SECONDS || 600)): boolean {
  if (!timestampMs) return false;
  return Date.now() - timestampMs > thresholdSeconds * 1000;
}
