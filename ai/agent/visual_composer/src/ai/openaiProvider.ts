import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { VisualAiProvider } from "./types";
import { buildImagePrompt } from "./prompts";

export function createOpenAiProvider(): VisualAiProvider {
  return {
    async generateTextLayer(input) {
      const prompt = [
        input.profile?.text_style_rules,
        "Return compact JSON with optional title, subtitle, sticker, post_caption. Do not include secrets.",
        input.command_text,
      ].filter(Boolean).join("\n");
      try {
        const json = await callOpenAiText(prompt);
        return {
          text: typeof json.title === "string" ? json.title.toUpperCase().slice(0, 72) : undefined,
          subtitle: typeof json.subtitle === "string" ? json.subtitle.toUpperCase().slice(0, 48) : undefined,
          sticker: typeof json.sticker === "string" ? json.sticker.toUpperCase().slice(0, 32) : undefined,
          post_caption: typeof json.post_caption === "string" ? json.post_caption : `${input.profile?.project_name || input.project_key}: ${input.command_text}`,
          internal_prompt: prompt,
          locked: false,
        };
      } catch {
        return {
          locked: false,
          internal_prompt: prompt,
          post_caption: `${input.profile?.project_name || input.project_key}: ${input.command_text}`,
        };
      }
    },
    async generateIllustrationLayer(input) {
      return generateImageOrFallback(input.project_key, "illustration", buildImagePrompt(input, "illustration"));
    },
    async generateBackgroundLayer(input) {
      return generateImageOrFallback(input.project_key, "background", buildImagePrompt(input, "background"));
    },
    async generateStyleBaseImage(input) {
      return generateImageOrFallback(input.project_key, "style_base", buildImagePrompt(input, "style_base"));
    },
  };
}

async function callOpenAiText(prompt: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const model = process.env.OPENAI_TEXT_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You create short Russian promo copy for a visual composer. Output JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI text failed: ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(payload.choices?.[0]?.message?.content || "{}");
}

async function generateImageOrFallback(projectKey: string, kind: string, prompt: string) {
  try {
    const assetPath = await callOpenAiImage(projectKey, kind, prompt);
    return { enabled: true, asset_path: assetPath, locked: false };
  } catch {
    return createSafeGeneratedPlaceholder(projectKey, kind, prompt);
  }
}

async function callOpenAiImage(projectKey: string, kind: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const quality = process.env.VISUAL_OUTPUT_QUALITY || "standard";
  const n = Math.max(1, Math.min(Number(process.env.VISUAL_AI_MAX_IMAGES_PER_REQUEST || "1"), 1));
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, prompt, n, size: "1024x1024", quality, response_format: "b64_json" }),
  });
  if (!response.ok) throw new Error(`OpenAI image failed: ${response.status}`);
  const payload = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image response has no b64_json");
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", projectKey);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${kind}-openai.png`);
  await fs.writeFile(filePath, Buffer.from(b64, "base64"));
  await fs.writeFile(filePath.replace(/\.png$/, ".prompt.txt"), prompt, "utf8");
  return filePath;
}

async function createSafeGeneratedPlaceholder(projectKey: string, kind: string, prompt: string) {
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", projectKey);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${kind}.png`);
  const label = `${projectKey} ${kind}`;
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#16202A"/><stop offset="1" stop-color="#3B82F6"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="760" cy="240" r="180" fill="#ffffff" opacity="0.15"/><rect x="120" y="680" width="784" height="150" rx="42" fill="#ffffff" opacity="0.14"/><text x="512" y="500" text-anchor="middle" font-size="54" font-family="Arial" font-weight="800" fill="#ffffff">${escapeXml(label)}</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  await fs.writeFile(filePath.replace(/\.png$/, ".prompt.txt"), prompt, "utf8");
  return { enabled: true, asset_path: filePath, locked: false };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}
