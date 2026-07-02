import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const { buildVisualJobFromCommand } = await import("../dist/jobBuilder/index.js");
const { composeVisualJob } = await import("../dist/compose.js");
const { createVisualJobRecord, FileVisualJobStore } = await import("../dist/store/index.js");

const commandText = process.argv.slice(2).join(" ") || "сделай картинку для монополии история знакомства";
const build = await buildVisualJobFromCommand({
  command_text: commandText,
  uploaded_assets: [],
  options: {
    enable_ai: false,
    layout_variant: "auto",
  },
});
const jobId = randomUUID();
const outputName = `${Date.now()}-${build.detected.project_key}-${build.detected.visual_mode}-${jobId}.png`;
const outputPath = path.join(process.cwd(), "public", "generated", "visual", outputName);
await mkdir(path.dirname(outputPath), { recursive: true });
const compose = await composeVisualJob({ ...build.visual_job, output_path: outputPath });
const outputUrl = `/generated/visual/${outputName}`;
const record = createVisualJobRecord({
  job_id: jobId,
  command_text: commandText,
  detected: build.detected,
  visual_job: { ...build.visual_job, output_path: outputPath },
  output: {
    version: 1,
    output_path: compose.output_path,
    output_url: outputUrl,
    width: compose.width,
    height: compose.height,
    created_at: new Date().toISOString(),
  },
  message: "Local smoke produce.",
});
await new FileVisualJobStore().save({ record });
await writeFile(
  path.join(process.cwd(), "ai", "agent", "visual_composer", "examples", "outputs", "last-local-produce.json"),
  JSON.stringify({ ok: true, job_id: jobId, output_path: compose.output_path, output_url: outputUrl, detected: build.detected, warnings: [...build.warnings, ...compose.warnings] }, null, 2),
  "utf8",
);
console.log(JSON.stringify({ ok: true, job_id: jobId, output_path: compose.output_path, output_url: outputUrl, detected: build.detected, warnings: [...build.warnings, ...compose.warnings] }, null, 2));
