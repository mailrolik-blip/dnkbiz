import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import OpenAI, { toFile } from "openai";
import { normalizeReferenceImages } from "../imageProcessing/normalizeReferenceImage";

export interface OpenAiLayerImageInput {
  project_key: string;
  job_id?: string;
  layer_type: "title_image" | "character" | "background" | "decor";
  prompt: string;
  input_images?: Array<{ path: string; role?: string; priority?: number }>;
  size?: string;
  quality?: "standard" | "low" | "medium" | "high" | "auto";
}

export interface OpenAiLayerImageResult {
  output_path: string;
  model: string;
  prompt: string;
  input_count: number;
  edit_request?: ImageEditRequestDiagnostics;
  reference_input_files?: Array<{
    basename: string;
    detected_format: string;
    mime_type: string;
    size_bytes: number;
    normalized_path: string;
    width: number;
    height: number;
    alpha: boolean;
  }>;
}

export interface ImageEditRequestDiagnostics {
  model: string;
  input_count: number;
  applied_optional_parameters: string[];
  skipped_optional_parameters: Record<string, string>;
}

export function getOpenAiImageEditImplementationCapabilities() {
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  return {
    image_generation: true,
    image_reference: true,
    image_edit: true,
    transparent_background: false,
    sdk: "openai",
    edit_parameter_profile: resolveImageEditParameters(model, { input_fidelity: "high" }).diagnostics,
  };
}

export async function generateLayer(input: OpenAiLayerImageInput): Promise<OpenAiLayerImageResult> {
  return callImagesGenerate(input);
}

export async function generateFromReferences(input: OpenAiLayerImageInput): Promise<OpenAiLayerImageResult> {
  return input.input_images?.length ? callImagesEdit(input) : callImagesGenerate(input);
}

export async function editFromReference(input: OpenAiLayerImageInput): Promise<OpenAiLayerImageResult> {
  return callImagesEdit(input);
}

async function callImagesGenerate(input: OpenAiLayerImageInput): Promise<OpenAiLayerImageResult> {
  const client = createClient();
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const response = await client.images.generate({
    model,
    prompt: input.prompt,
    size: input.size || process.env.OPENAI_IMAGE_SIZE || "1536x864",
    quality: input.quality || normalizedQuality(),
    output_format: "png",
    background: "opaque",
    n: 1,
  });
  return saveImageResponse(input, response, model, 0);
}

async function callImagesEdit(input: OpenAiLayerImageInput): Promise<OpenAiLayerImageResult> {
  if (!input.input_images?.length) throw new Error("images.edit requires at least one input image.");
  const client = createClient();
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const sorted = [...input.input_images].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 16);
  const normalizedInputs = await normalizeReferenceImages(sorted.map((item) => item.path), input.job_id || `${Date.now()}`);
  const files = await Promise.all(normalizedInputs.map((item) => toFile(
    fsSync.createReadStream(item.normalized_path),
    path.basename(item.normalized_path),
    { type: "image/png" },
  )));
  const optional = resolveImageEditParameters(model, { input_fidelity: "high" });
  const response = await client.images.edit({
    model,
    image: files,
    prompt: input.prompt,
    size: input.size || process.env.OPENAI_IMAGE_SIZE || "1536x864",
    quality: input.quality || normalizedQuality(),
    output_format: "png",
    background: "opaque",
    n: 1,
    ...optional.parameters,
  } as never);
  const saved = await saveImageResponse(input, response, model, files.length);
  return {
    ...saved,
    edit_request: { ...optional.diagnostics, input_count: files.length },
    reference_input_files: normalizedInputs.map((item) => ({
      basename: path.basename(item.source_path),
      detected_format: item.detected.format,
      mime_type: item.diagnostics.mime_type,
      size_bytes: item.diagnostics.size_bytes,
      normalized_path: item.normalized_path,
      width: item.diagnostics.width,
      height: item.diagnostics.height,
      alpha: item.diagnostics.alpha,
    })),
  };
}

export function resolveImageEditParameters(model: string, requestedOptions: { input_fidelity?: "low" | "high" } = {}) {
  const normalizedModel = model.toLowerCase();
  const parameters: Record<string, string> = {};
  const applied_optional_parameters: string[] = [];
  const skipped_optional_parameters: Record<string, string> = {};

  if (requestedOptions.input_fidelity) {
    if (supportsInputFidelity(normalizedModel)) {
      parameters.input_fidelity = requestedOptions.input_fidelity;
      applied_optional_parameters.push("input_fidelity");
    } else {
      skipped_optional_parameters.input_fidelity = "unsupported_for_model";
    }
  }

  return {
    parameters,
    diagnostics: {
      model,
      input_count: 0,
      applied_optional_parameters,
      skipped_optional_parameters,
    } satisfies ImageEditRequestDiagnostics,
  };
}

function supportsInputFidelity(model: string): boolean {
  if (model === "gpt-image-2") return false;
  if (model.startsWith("gpt-image-2")) return false;
  return false;
}

function createClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function normalizedQuality(): "standard" | "low" | "medium" | "high" | "auto" {
  const value = process.env.OPENAI_IMAGE_QUALITY || process.env.VISUAL_OUTPUT_QUALITY || "auto";
  return ["standard", "low", "medium", "high", "auto"].includes(value) ? value as "standard" | "low" | "medium" | "high" | "auto" : "auto";
}

async function saveImageResponse(input: OpenAiLayerImageInput, response: { data?: Array<{ b64_json?: string | null }> }, model: string, inputCount: number): Promise<OpenAiLayerImageResult> {
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image response did not include b64_json.");
  const date = new Date().toISOString().slice(0, 10);
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", input.project_key, date);
  await fs.mkdir(dir, { recursive: true });
  const job = input.job_id || `${Date.now()}`;
  const outputPath = path.join(dir, `${job}-${input.layer_type}-raw.png`);
  await fs.writeFile(outputPath, Buffer.from(b64, "base64"));
  return { output_path: outputPath, model, prompt: input.prompt, input_count: inputCount };
}
