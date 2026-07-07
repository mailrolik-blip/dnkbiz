import fs from "node:fs/promises";
import path from "node:path";

export type VisualAcceptanceAction = "accepted" | "needs_local_revision" | "needs_new_ai_variant";

export interface VisualAcceptanceRecord {
  job_id: string;
  action: VisualAcceptanceAction;
  created_at: string;
}

export class VisualAcceptanceTelemetry {
  constructor(private readonly filePath = path.join(process.cwd(), ".storage", "visual_acceptance", "events.local.jsonl")) {}

  async record(jobId: string, action: VisualAcceptanceAction): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify({ job_id: jobId, action, created_at: new Date().toISOString() } satisfies VisualAcceptanceRecord)}\n`, "utf8");
  }

  async readAll(): Promise<VisualAcceptanceRecord[]> {
    try {
      return (await fs.readFile(this.filePath, "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as VisualAcceptanceRecord);
    } catch {
      return [];
    }
  }
}
