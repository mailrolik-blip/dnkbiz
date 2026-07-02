import { FileVisualJobStore } from "@/ai/agent/visual_composer/src/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expectedKey = process.env.VISUAL_COMPOSER_API_KEY?.trim();
  if (!expectedKey) return true;
  return (request.headers.get("authorization") || "") === `Bearer ${expectedKey}`;
}

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid visual composer API key." } }, { status: 401 });
  }

  const { jobId } = await context.params;
  const job = await new FileVisualJobStore().get(jobId);
  if (!job) {
    return Response.json({ ok: false, error: { code: "NOT_FOUND", message: "Visual job not found." } }, { status: 404 });
  }

  return Response.json({ ok: true, job });
}
