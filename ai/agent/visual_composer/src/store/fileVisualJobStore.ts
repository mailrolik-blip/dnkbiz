import fs from "node:fs/promises";
import path from "node:path";
import type { SaveVisualJobRecordInput, VisualJobRecord, VisualJobStore } from "./types";

export class FileVisualJobStore implements VisualJobStore {
  constructor(private readonly rootDir = path.join(process.cwd(), ".storage", "visual_jobs")) {}

  async get(jobId: string): Promise<VisualJobRecord | null> {
    try {
      const raw = await fs.readFile(this.pathFor(jobId), "utf8");
      return JSON.parse(raw) as VisualJobRecord;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async save(input: SaveVisualJobRecordInput): Promise<VisualJobRecord> {
    await fs.mkdir(this.rootDir, { recursive: true });
    await fs.writeFile(this.pathFor(input.record.job_id), JSON.stringify(input.record, null, 2), "utf8");
    return input.record;
  }

  async update(record: VisualJobRecord): Promise<VisualJobRecord> {
    record.updated_at = new Date().toISOString();
    return this.save({ record });
  }

  private pathFor(jobId: string): string {
    const safeId = jobId.replace(/[^a-zA-Z0-9._-]/g, "_");
    return path.join(this.rootDir, `${safeId}.json`);
  }
}
