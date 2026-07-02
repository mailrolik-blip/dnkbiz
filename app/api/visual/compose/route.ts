import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { composeVisualJob, validateVisualJob } from "@/ai/agent/visual_composer/src/compose";
import type { VisualJob } from "@/ai/agent/visual_composer/src/types";
import { safeFilename } from "@/ai/agent/visual_composer/src/utils/safeFilename";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ComposeRequestBody = {
  visual_job?: unknown;
  options?: {
    return_mode?: "json" | "binary";
    save_output?: boolean;
  };
};

function jsonError(status: number, code: string, message: string) {
  return Response.json(
    {
      ok: false,
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function isAuthorized(request: Request) {
  const expectedKey = process.env.VISUAL_COMPOSER_API_KEY?.trim();
  if (!expectedKey) return true;

  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${expectedKey}`;
}

function buildPublicOutput(job: VisualJob, jobId: string) {
  const safeProject = safeFilename(job.project_key);
  const safeLayout = safeFilename(job.layout.variant);
  const safeId = safeFilename(jobId);
  const fileName = `${Date.now()}-${safeProject}-${safeLayout}-${safeId}.png`;
  const relativeUrl = `/generated/visual/${fileName}`;
  const outputPath = path.join(process.cwd(), "public", "generated", "visual", fileName);

  return { fileName, outputPath, relativeUrl };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return jsonError(401, "UNAUTHORIZED", "Missing or invalid visual composer API key.");
  }

  let body: ComposeRequestBody | null = null;
  try {
    body = (await request.json()) as ComposeRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!body || typeof body !== "object") {
    return jsonError(400, "INVALID_BODY", "Request body is required.");
  }

  if (!body.visual_job) {
    return jsonError(400, "MISSING_VISUAL_JOB", "visual_job is required.");
  }

  try {
    validateVisualJob(body.visual_job);
  } catch (error) {
    return jsonError(400, "INVALID_VISUAL_JOB", error instanceof Error ? error.message : "Invalid visual_job.");
  }

  const jobId = randomUUID();
  const { outputPath, relativeUrl } = buildPublicOutput(body.visual_job, jobId);
  const visualJob: VisualJob = {
    ...body.visual_job,
    output_path: outputPath,
  };

  try {
    const result = await composeVisualJob(visualJob);
    const responsePayload = {
      ok: true,
      job_id: jobId,
      project_key: result.project_key,
      visual_mode: result.visual_mode,
      layout_variant: result.layout_variant,
      output_format: visualJob.output_format,
      width: result.width,
      height: result.height,
      output_path: result.output_path,
      output_url: relativeUrl,
      warnings: result.warnings,
    };

    if (body.options?.return_mode === "binary") {
      const png = await fs.readFile(result.output_path);
      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, max-age=0",
          "X-Visual-Job-Id": jobId,
          "X-Visual-Output-Url": relativeUrl,
        },
      });
    }

    return Response.json(responsePayload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Visual compose failed", error);
    return jsonError(500, "COMPOSE_FAILED", error instanceof Error ? error.message : "Visual compose failed.");
  }
}
