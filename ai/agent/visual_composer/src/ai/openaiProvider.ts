import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { AiLayerInput, VisualAiProvider } from "./types";
import { buildStructuredImagePrompt } from "./prompts/buildImagePrompt";
import { buildTextPrompt } from "./prompts/buildTextPrompt";
import { canGenerateImage, recordImageGeneration, recordTextGeneration } from "./usageGuard";

export function createOpenAiProvider(): VisualAiProvider {
  return {
    async generateTextLayer(input) {
      const prompt = buildTextPrompt(input);
      try {
        const json = await callOpenAiText(prompt);
        await recordTextGeneration(true);
        return {
          text: typeof json.title === "string" ? json.title.toUpperCase().slice(0, 72) : undefined,
          subtitle: typeof json.subtitle === "string" ? json.subtitle.toUpperCase().slice(0, 48) : undefined,
          sticker: typeof json.sticker === "string" ? json.sticker.toUpperCase().slice(0, 32) : undefined,
          cta: typeof json.cta === "string" ? json.cta.toUpperCase().slice(0, 48) : undefined,
          post_caption: typeof json.post_caption === "string" ? json.post_caption : `${input.profile?.project_name || input.project_key}: ${input.command_text}`,
          internal_prompt: prompt.user,
          locked: false,
        };
      } catch (error) {
        await recordTextGeneration(false);
        return {
          locked: false,
          internal_prompt: `${prompt.user}\nFallback reason: ${error instanceof Error ? error.message : "unknown text provider error"}`,
          post_caption: `${input.profile?.project_name || input.project_key}: ${input.command_text}`,
          warnings: [`OpenAI text fallback: ${error instanceof Error ? error.message : "unknown error"}`],
        };
      }
    },
    async generateIllustrationLayer(input) {
      return generateImageOrFallback(input, "illustration");
    },
    async generateBackgroundLayer(input) {
      if (input.visual_mode === "hockey_photo_template") {
        return { enabled: true, asset_path: "", locked: false, warnings: ["AI background skipped: uploaded photo template mode."] };
      }
      return generateImageOrFallback(input, "background");
    },
    async generateStyleBaseImage(input) {
      return generateImageOrFallback(input, "style_base");
    },
  };
}

async function callOpenAiText(prompt: ReturnType<typeof buildTextPrompt>): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-5-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: prompt.system },
        { role: "user", content: `${prompt.user}\n\nOutput expectation:\n${prompt.output_expectations}` },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "visual_text_layer",
          strict: false,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              sticker: { type: "string" },
              cta: { type: "string" },
              post_caption: { type: "string" },
              internal_prompt: { type: "string" },
              warnings: { type: "array", items: { type: "string" } },
            },
            required: ["title", "post_caption"],
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI text failed: ${response.status}`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((content) => content.text || "").join("\n") || "{}";
  return parseJsonObject(text);
}

async function generateImageOrFallback(input: AiLayerInput, kind: "illustration" | "background" | "style_base") {
  const prompt = buildStructuredImagePrompt(input, kind);
  const promptText = [prompt.system, prompt.user, `Negative rules: ${prompt.negative_rules}`, `Output: ${prompt.output_expectations}`].join("\n\n");
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const referenceWarning = hasReferenceAssets(input)
    ? "reference assets selected but image reference input is not implemented; using prompt-only generation"
    : "";
  try {
    const guard = await canGenerateImage();
    if (!guard.ok) throw new Error(guard.reason || "AI image usage guard blocked generation.");
    const assetPath = await callOpenAiImage(input.project_key, kind, promptText, model);
    await recordImageGeneration(true);
    return { enabled: true, asset_path: assetPath, locked: false, generated_by_ai: true, prompt_used: promptText, model, warnings: referenceWarning ? [referenceWarning] : [] };
  } catch (error) {
    await recordImageGeneration(false);
    const fallback = await createSafeGeneratedPlaceholder(input.project_key, kind, promptText);
    return {
      ...fallback,
      generated_by_ai: false,
      prompt_used: promptText,
      model,
      warnings: [referenceWarning, `OpenAI image fallback: ${error instanceof Error ? error.message : "unknown error"}`].filter(Boolean),
    };
  }
}

function hasReferenceAssets(input: AiLayerInput): boolean {
  return Boolean(
    input.reference_images?.length ||
      input.visual_job?.style_assets?.reference ||
      input.visual_job?.style_assets?.main_character ||
      input.visual_job?.style_assets?.logo,
  );
}

async function callOpenAiImage(projectKey: string, kind: string, prompt: string, model: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const quality = process.env.OPENAI_IMAGE_QUALITY || process.env.VISUAL_OUTPUT_QUALITY || "medium";
  const size = process.env.OPENAI_IMAGE_SIZE || "1024x1024";
  const n = Math.max(1, Math.min(Number(process.env.VISUAL_AI_MAX_IMAGES_PER_REQUEST || "1"), 1));
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n, size, quality }),
  });
  if (!response.ok) throw new Error(`OpenAI image failed: ${response.status}`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image response has no b64_json");
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", projectKey, new Date().toISOString().slice(0, 10));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${kind}-openai.png`);
  await fs.writeFile(filePath, Buffer.from(b64, "base64"));
  await fs.writeFile(filePath.replace(/\.png$/, ".prompt.txt"), prompt, "utf8");
  return filePath;
}

async function createSafeGeneratedPlaceholder(projectKey: string, kind: string, prompt: string) {
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", projectKey, new Date().toISOString().slice(0, 10));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${kind}.png`);
  const label = `${projectKey} ${kind}`;
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#16202A"/><stop offset="1" stop-color="#3B82F6"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="760" cy="240" r="180" fill="#ffffff" opacity="0.15"/><rect x="120" y="680" width="784" height="150" rx="42" fill="#ffffff" opacity="0.14"/><text x="512" y="500" text-anchor="middle" font-size="54" font-family="Arial" font-weight="800" fill="#ffffff">${escapeXml(label)}</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  await fs.writeFile(filePath.replace(/\.png$/, ".prompt.txt"), prompt, "utf8");
  return { enabled: true, asset_path: filePath, locked: false };
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}
