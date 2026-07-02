import path from "node:path";
import { VisualJob, ComposeResult, RenderContext } from "./types";
import { ensureDir } from "./utils/ensureDir";
import { safeFilename } from "./utils/safeFilename";
import { renderGorillaHockeyPoster } from "./layouts/gorillaHockeyPoster";
import { renderGorillaPrintLayout } from "./layouts/gorillaPrintLayout";
import { renderMonopolyPaySquare } from "./layouts/monopolyPaySquare";
import { renderMonopolySquare } from "./layouts/monopolySquare";
import { renderSimpleOverlayLayout } from "./layouts/simpleOverlayLayout";

export function getRepoRoot(): string {
  return process.cwd();
}

export function getComposerRoot(): string {
  return path.resolve(getRepoRoot(), "ai", "agent", "visual_composer");
}

export function validateVisualJob(job: unknown): asserts job is VisualJob {
  if (!job || typeof job !== "object") throw new Error("Job must be an object.");
  const value = job as Partial<VisualJob>;
  if (value.job_type !== "visual_production") throw new Error("job_type must be visual_production.");
  if (!value.project_key) throw new Error("project_key is required.");
  if (!value.visual_mode) throw new Error("visual_mode is required.");
  if (!value.output_format) throw new Error("output_format is required.");
  if (!value.layout || typeof value.layout !== "object") throw new Error("layout is required.");
  if (!value.layout.variant) throw new Error("layout.variant is required.");
}

export async function composeVisualJob(job: VisualJob): Promise<ComposeResult> {
  validateVisualJob(job);

  const repoRoot = getRepoRoot();
  const composerRoot = getComposerRoot();
  const outputDir = path.join(composerRoot, "examples", "outputs");
  await ensureDir(outputDir);

  const sourceSlug = safeFilename(job.text_layer?.text || job.source_text || "");
  const outputName = [safeFilename(job.project_key), safeFilename(job.layout.variant), sourceSlug]
    .filter(Boolean)
    .join(".");
  const outputPath = path.resolve(job.output_path || path.join(outputDir, `${outputName}.png`));
  await ensureDir(path.dirname(outputPath));

  const context: RenderContext = {
    repoRoot,
    composerRoot,
    outputPath,
    warnings: [],
  };

  if (job.project_key === "monopoly") return renderMonopolySquare(job, context);
  if (job.project_key === "monopoly_pay") return renderMonopolyPaySquare(job, context);
  if (job.project_key === "gorilla_hockey" && job.visual_mode === "hockey_print_layout") {
    return renderGorillaPrintLayout(job, context);
  }
  if (job.project_key === "gorilla_hockey") return renderGorillaHockeyPoster(job, context);
  if (job.project_key === "casper") return renderSimpleOverlayLayout(job, context);

  return renderSimpleOverlayLayout(job, context);
}
