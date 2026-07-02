import fs from "node:fs/promises";
import { reviseProducedVisual } from "@/ai/agent/visual_composer/src/production";
import type { RevisionTarget } from "@/ai/agent/visual_composer/src/revision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReviseRequestBody = {
  job_id?: string;
  target?: RevisionTarget;
  instruction?: string;
  uploaded_assets?: Array<{
    id?: string;
    type: "background" | "illustration" | "photo" | "logo" | "qr";
    source?: "telegram" | "local" | "url";
    path?: string;
    url?: string;
    file_id?: string;
    mime_type?: string;
    original_name?: string;
  }>;
  options?: {
    enable_ai?: boolean;
    return_mode?: "json" | "binary";
    save_output?: boolean;
  };
};

function jsonError(status: number, code: string, message: string) {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

function isAuthorized(request: Request) {
  const expectedKey = process.env.VISUAL_COMPOSER_API_KEY?.trim();
  if (!expectedKey) return true;
  return (request.headers.get("authorization") || "") === `Bearer ${expectedKey}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return jsonError(401, "UNAUTHORIZED", "Missing or invalid visual composer API key.");

  let body: ReviseRequestBody | null = null;
  try {
    body = await request.json() as ReviseRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  if (!body?.job_id) return jsonError(400, "MISSING_JOB_ID", "job_id is required.");
  if (!body.target) return jsonError(400, "MISSING_TARGET", "target is required.");
  if (!body.instruction) return jsonError(400, "MISSING_INSTRUCTION", "instruction is required.");

  try {
    const result = await reviseProducedVisual({
      job_id: body.job_id,
      target: body.target,
      instruction: body.instruction,
      uploaded_assets: (body.uploaded_assets || []).map((asset) => ({
        type: asset.type === "photo" ? "photo" : asset.type === "background" ? "background" : asset.type === "illustration" ? "illustration" : "logo",
        asset_path: asset.path || "",
        id: asset.id || asset.file_id,
      })),
      options: {
        enable_ai: Boolean(body.options?.enable_ai),
      },
    });

    if (body.options?.return_mode === "binary") {
      const png = await fs.readFile(result.output_path);
      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, max-age=0",
          "X-Visual-Job-Id": body.job_id,
          "X-Visual-Version": String(result.version),
          "X-Visual-Output-Url": result.output_url,
        },
      });
    }

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Visual job not found.") {
      return jsonError(404, "NOT_FOUND", "Visual job not found.");
    }
    console.error("Visual revise failed", error);
    return jsonError(500, "REVISE_FAILED", error instanceof Error ? error.message : "Visual revise failed.");
  }
}
