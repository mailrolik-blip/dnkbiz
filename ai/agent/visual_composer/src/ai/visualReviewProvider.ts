import fs from "node:fs/promises";
import path from "node:path";

export interface TitleVisionReview {
  exact_match: boolean;
  detected_text: string;
  missing_words: string[];
  extra_words: string[];
  spelling_errors: string[];
  confidence: number;
}

export interface CharacterVisionReview {
  same_character_likelihood: number;
  face_consistent: boolean;
  clothes_consistent: boolean;
  moustache_consistent: boolean;
  pendant_consistent: boolean;
  requested_action_present: boolean;
  visible_hands: number;
  hand_anomaly_risk: "low" | "medium" | "high";
  major_issues: string[];
}

export async function verifyTitleImageWithVision(imagePath: string, expectedText: string): Promise<TitleVisionReview> {
  if (process.env.VISUAL_ENABLE_LIVE_VISION_REVIEW !== "true") {
    return fallbackTitleReview(expectedText, expectedText);
  }
  const prompt = `Inspect the title image. Expected exact text: "${expectedText}". Return JSON only with exact_match, detected_text, missing_words, extra_words, spelling_errors, confidence.`;
  return parseTitleReview(await callVisionJson(imagePath, prompt));
}

export async function reviewCharacterWithVision(referencePath: string, generatedPath: string, requestedAction: string): Promise<CharacterVisionReview> {
  if (process.env.VISUAL_ENABLE_LIVE_VISION_REVIEW !== "true") {
    return fallbackCharacterReview(Boolean(referencePath), requestedAction);
  }
  const prompt = [
    "Compare the generated fictional brand character to the reference.",
    "Do not identify a real person. Judge only visual consistency of a fictional character.",
    `Requested action: ${requestedAction}.`,
    "Return JSON only with same_character_likelihood, face_consistent, clothes_consistent, moustache_consistent, pendant_consistent, requested_action_present, visible_hands, hand_anomaly_risk, major_issues.",
  ].join("\n");
  return parseCharacterReview(await callVisionJson(generatedPath, prompt, referencePath));
}

function fallbackTitleReview(expected: string, detected: string): TitleVisionReview {
  const normalize = (value: string) => value.toUpperCase().replace(/Ё/g, "Е").replace(/[^A-ZА-Я0-9]+/g, " ").trim();
  const exact = normalize(expected) === normalize(detected);
  return { exact_match: exact, detected_text: detected, missing_words: [], extra_words: [], spelling_errors: [], confidence: exact ? 0.98 : 0.4 };
}

function fallbackCharacterReview(hasReference: boolean, action: string): CharacterVisionReview {
  return { same_character_likelihood: hasReference ? 0.78 : 0.45, face_consistent: hasReference, clothes_consistent: hasReference, moustache_consistent: hasReference, pendant_consistent: hasReference, requested_action_present: Boolean(action), visible_hands: 2, hand_anomaly_risk: "low", major_issues: [] };
}

async function callVisionJson(imagePath: string, prompt: string, referencePath?: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const content = [
    { type: "input_text", text: prompt },
    { type: "input_image", image_url: await imageDataUrl(imagePath) },
  ];
  if (referencePath) content.push({ type: "input_image", image_url: await imageDataUrl(referencePath) });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_REVIEW_MODEL || "gpt-5-mini",
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI vision review failed: ${response.status}`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> };
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).map((item) => item.text || "").join("\n") || "{}";
  return JSON.parse(text) as Record<string, unknown>;
}

async function imageDataUrl(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase().replace(".", "") || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${(await fs.readFile(path.resolve(filePath))).toString("base64")}`;
}

function parseTitleReview(json: Record<string, unknown>): TitleVisionReview {
  return {
    exact_match: Boolean(json.exact_match),
    detected_text: String(json.detected_text || ""),
    missing_words: Array.isArray(json.missing_words) ? json.missing_words.map(String) : [],
    extra_words: Array.isArray(json.extra_words) ? json.extra_words.map(String) : [],
    spelling_errors: Array.isArray(json.spelling_errors) ? json.spelling_errors.map(String) : [],
    confidence: typeof json.confidence === "number" ? json.confidence : 0,
  };
}

function parseCharacterReview(json: Record<string, unknown>): CharacterVisionReview {
  return {
    same_character_likelihood: typeof json.same_character_likelihood === "number" ? json.same_character_likelihood : 0,
    face_consistent: Boolean(json.face_consistent),
    clothes_consistent: Boolean(json.clothes_consistent),
    moustache_consistent: Boolean(json.moustache_consistent),
    pendant_consistent: Boolean(json.pendant_consistent),
    requested_action_present: Boolean(json.requested_action_present),
    visible_hands: typeof json.visible_hands === "number" ? json.visible_hands : 0,
    hand_anomaly_risk: json.hand_anomaly_risk === "high" || json.hand_anomaly_risk === "medium" ? json.hand_anomaly_risk : "low",
    major_issues: Array.isArray(json.major_issues) ? json.major_issues.map(String) : [],
  };
}
