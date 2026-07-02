import fs from "node:fs/promises";
import type { BuildVisualJobInput } from "@/ai/agent/visual_composer/src/jobBuilder";
import { produceVisualFromCommand } from "@/ai/agent/visual_composer/src/production";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProduceRequestBody = Partial<BuildVisualJobInput> & {
  options?: BuildVisualJobInput["options"] & {
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

  let body: ProduceRequestBody | null = null;
  try {
    body = await request.json() as ProduceRequestBody;
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const commandText = body?.command_text?.trim();
  if (!commandText) return jsonError(400, "MISSING_COMMAND_TEXT", "command_text is required.");

  try {
    const result = await produceVisualFromCommand({
      command_text: commandText,
      project_key: body.project_key || "",
      visual_mode: body.visual_mode || "",
      output_format: body.output_format || "",
      uploaded_assets: body.uploaded_assets || [],
      options: {
        enable_ai: Boolean(body.options?.enable_ai),
        layout_variant: body.options?.layout_variant || "auto",
      },
    });

    if (body.options?.return_mode === "binary") {
      const png = await fs.readFile(result.output_path);
      return new Response(png, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store, max-age=0",
          "X-Visual-Job-Id": result.job_id,
          "X-Visual-Output-Url": result.output_url,
        },
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Visual produce failed", error);
    return jsonError(500, "PRODUCE_FAILED", error instanceof Error ? error.message : "Visual produce failed.");
  }
}
