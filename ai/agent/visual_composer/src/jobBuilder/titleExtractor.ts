import type { VisualProjectKey } from "../types";

export interface TitleExtractionResult {
  raw_command: string;
  extracted_title: string;
  normalized_title: string;
  method: string;
  removed_prefixes: string[];
  confidence: number;
  warnings: string[];
}

const markerPatterns = [
  /(?:с\s+текстом|с\s+надписью|надпись|заголовок|текст|тема)\s*[:\-]?\s+(.+)$/iu,
  /:\s*(.+)$/u,
  /["“«]([^"”»]{2,120})["”»]/u,
];

const servicePatterns: Array<[RegExp, string]> = [
  [/\bсделай\b/giu, "сделай"],
  [/\bновую\s+картинку\b/giu, "новую картинку"],
  [/\bновая\s+картинка\b/giu, "новая картинка"],
  [/\bкартинку\s+для\b/giu, "картинку для"],
  [/\bнужна\s+новая\s+картинка\b/giu, "нужна новая картинка"],
  [/\bнужно\s+сделать\b/giu, "нужно сделать"],
  [/\bпост\b/giu, "пост"],
  [/\bафиша\b/giu, "афиша"],
  [/\bс\s+текстом\b/giu, "с текстом"],
  [/\bнадпись\b/giu, "надпись"],
  [/\bзаголовок\b/giu, "заголовок"],
  [/\bтема\b/giu, "тема"],
];

const projectPatterns: Record<VisualProjectKey, Array<[RegExp, string]>> = {
  monopoly: [[/\bдля\s+монополии\b|\bдля\s+monopoly\b|\bмонополия\b|\bмонополии\b|\bmonopoly\b/giu, "project_monopoly"]],
  monopoly_pay: [[/\bдля\s+монополии\s+пэй\b|\bмонополия\s+пэй\b|\bмонополии\s+пэй\b|\bmonopoly\s+pay\b|\bдля\s+pay\b|\bдля\s+пэй\b|\bpay\b|\bпэй\b/giu, "project_pay"]],
  casper: [[/\bдля\s+каспера\b|\bкаспер\b|\bкаспера\b|\bcasper\b/giu, "project_casper"]],
  gorilla_hockey: [[/\bдля\s+хоккея\b|\bзадача\s+для\s+хоккея\b|\bхоккей\b|\bхоккея\b|\bgorilla\s+hockey\b/giu, "project_hockey"]],
  dnk: [],
};

export function extractTitleForProject(commandText: string, projectKey: VisualProjectKey): TitleExtractionResult {
  const raw = commandText.trim();
  const warnings: string[] = [];
  const removed = new Set<string>();
  let method = "service_phrase_cleanup";
  let source = extractByMarker(raw);
  if (source) method = source.method;
  let value = source?.value || raw;

  for (const [pattern, label] of [...servicePatterns, ...(projectPatterns[projectKey] || [])]) {
    const before = value;
    value = value.replace(pattern, " ");
    if (before !== value) removed.add(label);
  }
  value = value
    .replace(/\b(для|нужна|нужно|надо|новый|новая|новое)\b/giu, " ")
    .replace(/[.,!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) {
    value = raw;
    method = "fallback_raw";
    warnings.push("title_extraction_low_confidence");
  }

  const normalized = normalizeTitleForProject(projectKey, value, warnings);
  const confidence = method === "fallback_raw" ? 0.35 : source ? 0.92 : removed.size ? 0.78 : 0.62;
  if (confidence < 0.7) warnings.push("title_extraction_low_confidence");

  return {
    raw_command: raw,
    extracted_title: value.toUpperCase(),
    normalized_title: normalized,
    method,
    removed_prefixes: [...removed],
    confidence,
    warnings,
  };
}

export function normalizeTitleForProject(projectKey: VisualProjectKey, title: string, warnings: string[] = []): string {
  let value = title
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^MONOPOLY\s+PAY\s*[:\-]?\s*/iu, "")
    .replace(/^MONOPOLY\s*[:\-]?\s*/iu, "")
    .replace(/^МОНОПОЛ(ИЯ|ИИ)\s+ПЭЙ\s*[:\-]?\s*/iu, "")
    .replace(/^МОНОПОЛ(ИЯ|ИИ)\s*[:\-]?\s*/iu, "")
    .trim();

  const lower = value.toLowerCase();
  if (projectKey === "monopoly") {
    if (lower.includes("история знакомства")) value = "ИСТОРИЯ ЗНАКОМСТВА";
    else if (lower.includes("результаты конкурса")) value = "РЕЗУЛЬТАТЫ КОНКУРСА";
    else if (lower.includes("новый конкурс")) value = "НОВЫЙ КОНКУРС";
    else if (/2000\s+польз/.test(lower)) value = "2000 ПОЛЬЗОВАТЕЛЕЙ";
  }
  if (projectKey === "monopoly_pay") {
    if (lower.includes("яндекс-яндекс")) value = "ЯНДЕКС-ЯНДЕКС";
    else if (lower.includes("новые триггеры банков") || (lower.includes("триггер") && lower.includes("банк"))) value = "НОВЫЕ ТРИГГЕРЫ БАНКОВ";
    else if (lower.includes("оплата по ссылке")) value = "ОПЛАТА ПО ССЫЛКЕ";
  }
  if (projectKey === "casper") {
    if (lower.includes("3000")) value = "КОНКУРС НА 3000";
    else if (lower.includes("будь на связи")) value = "БУДЬ НА СВЯЗИ";
    else if (lower.includes("результаты конкурса")) value = "РЕЗУЛЬТАТЫ КОНКУРСА";
  }
  if (projectKey === "gorilla_hockey") {
    if (lower.includes("завтра") && lower.includes("трениров")) value = "ТРЕНИРОВКА ЗАВТРА";
    else if (lower.includes("набор") && lower.includes("дет")) value = "НАБОР ДЕТЕЙ";
    else if (lower.includes("день защиты детей")) value = "ДЕНЬ ЗАЩИТЫ ДЕТЕЙ";
  }

  value = value.toUpperCase().replace(/\s+/g, " ").trim();
  const maxWords = projectKey === "monopoly" ? 4 : 5;
  const words = value.split(" ").filter(Boolean);
  if (words.length > maxWords) {
    value = words.slice(-maxWords).join(" ");
    warnings.push("title_shortened");
  }
  if (value.length > 34 && projectKey === "monopoly") warnings.push("title_too_long");
  if (value.length > 42 && projectKey !== "monopoly") warnings.push("title_too_long");
  return value || "ВИЗУАЛ";
}

function extractByMarker(text: string): { value: string; method: string } | null {
  for (const pattern of markerPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) return { value: match[1].trim().replace(/^[:\-\s]+/, ""), method: pattern.source.startsWith(":") ? "colon_marker" : "explicit_marker" };
  }
  return null;
}
