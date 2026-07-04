import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AiImageLayerType, AiLayerInput, VisualAiCapabilities, VisualAiProvider } from "./types";
import { buildStructuredImagePrompt } from "./prompts/buildImagePrompt";
import { buildTextPrompt } from "./prompts/buildTextPrompt";
import { canGenerateImage, recordImageGeneration, recordTextGeneration } from "./usageGuard";

export function createOpenAiProvider(): VisualAiProvider {
  return {
    getCapabilities,
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
      return generateImageOrFallback({ ...input, mode: "generate_image", layer_type: "illustration" }, "illustration");
    },
    async generateBackgroundLayer(input) {
      if (input.visual_mode === "hockey_photo_template") {
        return { enabled: true, asset_path: "", locked: false, warnings: ["AI background skipped: uploaded photo template mode."] };
      }
      return generateImageOrFallback({ ...input, mode: "generate_image", layer_type: "background" }, "background");
    },
    async generateStyleBaseImage(input) {
      return generateImageOrFallback({ ...input, mode: "generate_image", layer_type: "style_base" }, "style_base");
    },
    async generateCharacterLayer(input) {
      return generateCharacterLayer(input);
    },
    async generateTitleImageLayer(input) {
      return generateTitleImageLayer(input);
    },
  };
}

export function describeOpenAiImageCapabilities() {
  const capabilities = getCapabilities();
  const sdkInstalled = isOpenAiSdkInstalled();
  const referenceProvider = process.env.VISUAL_IMAGE_REFERENCE_PROVIDER || "disabled";
  const editProvider = process.env.VISUAL_IMAGE_EDIT_PROVIDER || "disabled";
  const reasons = [];
  if (referenceProvider !== "openai") reasons.push("VISUAL_IMAGE_REFERENCE_PROVIDER is disabled");
  if (editProvider !== "openai") reasons.push("VISUAL_IMAGE_EDIT_PROVIDER is disabled");
  if (!sdkInstalled) reasons.push("openai npm SDK is not installed; current project uses fetch-based prompt-only image generation");
  if (referenceProvider === "openai" || editProvider === "openai") {
    reasons.push("fetch-based reference/edit endpoint is not wired for live calls in automated path yet");
  }
  return {
    model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
    reference_provider: referenceProvider,
    edit_provider: editProvider,
    openai_sdk_installed: sdkInstalled,
    image_generation_supported: capabilities.image_generation,
    image_reference_supported: capabilities.image_references,
    image_edit_supported: capabilities.image_edit,
    transparent_supported: capabilities.transparent_background,
    live_reference_test_enabled: process.env.VISUAL_ENABLE_LIVE_REFERENCE_TEST === "true",
    reason: capabilities.image_references || capabilities.image_edit ? "" : reasons.join("; "),
  };
}

function getCapabilities(): VisualAiCapabilities {
  const referenceProvider = process.env.VISUAL_IMAGE_REFERENCE_PROVIDER || "disabled";
  const editProvider = process.env.VISUAL_IMAGE_EDIT_PROVIDER || "disabled";
  const sdkInstalled = isOpenAiSdkInstalled();
  return {
    image_generation: true,
    image_references: referenceProvider === "openai" && sdkInstalled && process.env.VISUAL_ENABLE_LIVE_REFERENCE_TEST === "true",
    image_edit: editProvider === "openai" && sdkInstalled && process.env.VISUAL_ENABLE_LIVE_REFERENCE_TEST === "true",
    transparent_background: process.env.OPENAI_IMAGE_TRANSPARENT_BACKGROUND === "true",
  };
}

function isOpenAiSdkInstalled(): boolean {
  return fsSync.existsSync(path.join(process.cwd(), "node_modules", "openai", "package.json"));
}

async function generateCharacterLayer(input: AiLayerInput) {
  const capabilities = getCapabilities();
  const current = input.visual_job?.character_layer;
  const locked = Boolean(current?.locked || current?.lock_policy === "locked" || input.locked_assets?.length);
  const unlockRequested = Boolean(input.allow_locked_character_replacement || /можно заменить персонажа|сгенерируй нового деда|замени персонажа|new character|replace character/iu.test(input.command_text));
  const references = collectCharacterReferences(input);

  if (locked && !unlockRequested && (!capabilities.image_edit || !capabilities.image_references)) {
    return {
      enabled: true,
      asset_path: current?.asset_path,
      generated_asset_path: current?.generated_asset_path,
      role: "main_character" as const,
      lock_policy: current?.lock_policy || "locked" as const,
      source: current?.source || "asset" as const,
      locked: true,
      warnings: ["image reference/edit not available in current provider; locked character preserved"],
    };
  }

  const promptInput = {
    ...input,
    mode: references.length && capabilities.image_references ? "generate_with_references" as const : "generate_image" as const,
    layer_type: "character" as const,
    reference_images: references,
  };
  const generated = await generateImageOnly(promptInput, "character");
  if (!generated.asset_path) {
    return {
      enabled: true,
      asset_path: current?.asset_path,
      generated_asset_path: current?.generated_asset_path,
      source: current?.source || "asset" as const,
      locked: current?.locked,
      warnings: generated.warnings,
    };
  }

  return {
    enabled: true,
    generated_asset_path: generated.asset_path,
    role: "main_character" as const,
    lock_policy: unlockRequested ? "replaceable" as const : current?.lock_policy,
    source: "ai" as const,
    locked: false,
    warnings: [
      unlockRequested ? "character lock overridden by user" : "character revision from reference",
      ...(generated.warnings || []),
    ],
  };
}

async function generateTitleImageLayer(input: AiLayerInput) {
  const capabilities = getCapabilities();
  const promptInput = {
    ...input,
    mode: input.reference_images?.length ? "generate_with_references" as const : "generate_image" as const,
    layer_type: "title_image" as const,
    output: { transparent_background: true, size: input.output?.size || process.env.OPENAI_TITLE_IMAGE_SIZE || "1024x1024" },
  };
  const generated = await generateImageOnly(promptInput, "title_image");
  const text = input.visual_job?.title_image_layer?.text || input.visual_job?.text_layer?.text || input.command_text;
  if (!generated.asset_path) {
    return {
      enabled: true,
      text,
      source: "composer_fallback" as const,
      transparent_background: true,
      warnings: generated.warnings,
    };
  }
  return {
    enabled: true,
    text,
    generated_asset_path: generated.asset_path,
    source: "ai" as const,
    transparent_background: capabilities.transparent_background,
    warnings: [
      "AI title image may need manual review for exact Cyrillic text",
      ...(capabilities.transparent_background ? [] : ["generated title not transparent; transparent background is not enabled in current provider"]),
      ...(generated.warnings || []),
    ],
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

async function generateImageOrFallback(input: AiLayerInput, kind: AiImageLayerType) {
  const prompt = buildStructuredImagePrompt(input, kind);
  const promptText = [prompt.system, prompt.user, `Negative rules: ${prompt.negative_rules}`, `Output: ${prompt.output_expectations}`].join("\n\n");
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const referenceWarning = hasReferenceAssets(input) && input.mode !== "generate_image"
    ? "image reference/edit not available in current provider; using prompt-only generation"
    : hasReferenceAssets(input)
      ? "reference assets selected but image reference input is not implemented; using prompt-only generation"
      : "";
  try {
    const guard = await canGenerateImage();
    if (!guard.ok) throw new Error(guard.reason || "AI image usage guard blocked generation.");
    const assetPath = await callOpenAiImage(input.project_key, kind, promptText, model, input.output);
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

async function generateImageOnly(input: AiLayerInput, kind: AiImageLayerType): Promise<{ asset_path?: string; warnings: string[]; prompt_used?: string; model?: string }> {
  const prompt = buildStructuredImagePrompt(input, kind);
  const promptText = [prompt.system, prompt.user, `Negative rules: ${prompt.negative_rules}`, `Output: ${prompt.output_expectations}`].join("\n\n");
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
    const guard = await canGenerateImage();
    if (!guard.ok) throw new Error(guard.reason || "AI image usage guard blocked generation.");
    const assetPath = await callOpenAiImage(input.project_key, kind, promptText, model, input.output);
    await recordImageGeneration(true);
    return { asset_path: assetPath, warnings: [], prompt_used: promptText, model };
  } catch (error) {
    await recordImageGeneration(false);
    return { warnings: [`OpenAI ${kind} generation unavailable: ${error instanceof Error ? error.message : "unknown error"}`], prompt_used: promptText, model };
  }
}

function collectCharacterReferences(input: AiLayerInput): NonNullable<AiLayerInput["reference_images"]> {
  const references = [...(input.reference_images || [])];
  const characterPath = input.visual_job?.character_layer?.asset_path || input.visual_job?.style_assets?.main_character;
  if (characterPath && !references.some((ref) => ref.path === characterPath)) {
    references.unshift({ path: characterPath, role: "main_character", lock_policy: "locked", description: "Locked character identity reference" });
  }
  return references;
}

function hasReferenceAssets(input: AiLayerInput): boolean {
  return Boolean(
    input.reference_images?.length ||
      input.visual_job?.style_assets?.reference ||
      input.visual_job?.style_assets?.main_character ||
      input.visual_job?.style_assets?.logo ||
      input.visual_job?.title_image_layer?.style_ref_asset_path,
  );
}

async function callOpenAiImage(projectKey: string, kind: string, prompt: string, model: string, output?: AiLayerInput["output"]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const quality = process.env.OPENAI_IMAGE_QUALITY || process.env.VISUAL_OUTPUT_QUALITY || "medium";
  const size = output?.size || process.env.OPENAI_IMAGE_SIZE || "1024x1024";
  const n = Math.max(1, Math.min(Number(process.env.VISUAL_AI_MAX_IMAGES_PER_REQUEST || "1"), 1));
  const body: Record<string, unknown> = { model, prompt, n, size, quality };
  if (output?.transparent_background && process.env.OPENAI_IMAGE_TRANSPARENT_BACKGROUND === "true") body.background = "transparent";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
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

