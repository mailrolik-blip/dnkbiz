import fs from "node:fs/promises";
import path from "node:path";

export interface VisualCostLedgerRecord {
  job_id: string;
  brand_key: string;
  recipe_key: string;
  channel: string;
  provider?: string;
  model?: string;
  billable?: boolean;
  real_provider_call?: boolean;
  real_billable_image_calls?: number;
  ai_image_calls_attempted: number;
  ai_image_calls_successful: number;
  ai_image_calls_failed: number;
  estimated_provider_cost: number;
  started_at: string;
  completed_at?: string;
  duplicate_trigger_filtered?: boolean;
  explicit_paid_retry?: boolean;
  first_pass_accepted?: boolean;
  local_revision_count?: number;
  explicit_ai_retry_count?: number;
}

export class VisualCostLedger {
  constructor(private readonly filePath = path.join(process.cwd(), ".storage", "visual_cost", "ledger.local.jsonl")) {}

  async append(record: VisualCostLedgerRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  async readAll(): Promise<VisualCostLedgerRecord[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      return raw.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as VisualCostLedgerRecord);
    } catch {
      return [];
    }
  }

  async report(now = new Date()): Promise<string> {
    const records = await this.readAll();
    return [
      formatWindow("today", records, daysAgo(now, 1)),
      formatWindow("last 7 days", records, daysAgo(now, 7)),
      formatWindow("last 30 days", records, daysAgo(now, 30)),
    ].join("\n");
  }
}

function formatWindow(label: string, records: VisualCostLedgerRecord[], since: Date): string {
  const rows = records.filter((record) => new Date(record.started_at) >= since);
  const jobs = rows.length;
  const calls = rows.reduce((sum, row) => sum + row.ai_image_calls_attempted, 0);
  const realBillable = rows.reduce((sum, row) => sum + (row.real_billable_image_calls ?? (row.real_provider_call && row.billable ? row.ai_image_calls_successful : 0)), 0);
  const mockOrTest = rows.filter((row) => row.provider === "mock" || row.real_provider_call === false || row.billable === false).length;
  const cost = rows.reduce((sum, row) => sum + row.estimated_provider_cost, 0);
  const zero = rows.filter((row) => row.ai_image_calls_attempted === 0).length;
  const one = rows.filter((row) => row.ai_image_calls_attempted === 1).length;
  const exceeding = rows.filter((row) => row.ai_image_calls_attempted > 1).length;
  return [
    `${label}`,
    `jobs=${jobs}`,
    `AI image calls=${calls}`,
    `real billable image calls=${realBillable}`,
    `mock/test calls=${mockOrTest}`,
    `calls/job=${jobs ? (calls / jobs).toFixed(2) : "0.00"}`,
    `estimated cost=${cost.toFixed(4)}`,
    `cost/job=${jobs ? (cost / jobs).toFixed(4) : "0.0000"}`,
    `zero-AI jobs=${zero}`,
    `one-AI jobs=${one}`,
    `jobs exceeding budget=${exceeding}`,
  ].join(" ");
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
