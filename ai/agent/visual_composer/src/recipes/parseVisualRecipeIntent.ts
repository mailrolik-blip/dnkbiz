export interface VisualRecipeIntent {
  exact_title: string;
  character_action: string | null;
  background_request: string | null;
  composition_request: string | null;
  explicit_ai_variant: boolean;
  confidence: number;
  parsing_method: string;
}

const VISUAL_SUBJECT_RE = /^(дед|персонаж|герой|хоккеист|игрок|приведение|привидение|каспер)(?:\s|$)/iu;
const ACTION_RE = /(?:^|\s)(держит|показывает|ид[её]т|проходит|бежит|сидит|стоит|празднует|кричит|смотрит|оплачивает|крутит|поднимает|машет|указывает)(?:\s|$)/iu;
const BACKGROUND_RE = /\b(фон|задник|background|на фоне)\b/i;
const COMPOSITION_RE = /\b(композици|слева|справа|по центру|крупно|сверху|снизу|макет|ракурс)\b/i;

export function parseVisualRecipeIntent(commandText: string): VisualRecipeIntent {
  const normalized = commandText.replace(/\s+/g, " ").trim();
  const afterColon = normalized.includes(":") ? normalized.slice(normalized.indexOf(":") + 1).trim() : normalized;
  const cleaned = stripProductionPrefix(afterColon);
  const clauses = cleaned.split(",").map((item) => item.trim()).filter(Boolean);
  const titleClauses: string[] = [];
  const characterClauses: string[] = [];
  const backgroundClauses: string[] = [];
  const compositionClauses: string[] = [];

  for (const clause of clauses.length ? clauses : [cleaned]) {
    if (isCharacterActionClause(clause)) characterClauses.push(clause);
    else if (BACKGROUND_RE.test(clause)) backgroundClauses.push(clause);
    else if (COMPOSITION_RE.test(clause)) compositionClauses.push(clause);
    else titleClauses.push(clause);
  }

  const titleSource = titleClauses.join(", ").trim() || cleaned;
  const exactTitle = toExactTitle(titleSource);
  const hasStructuredSplit = characterClauses.length > 0 || backgroundClauses.length > 0 || compositionClauses.length > 0;
  return {
    exact_title: exactTitle,
    character_action: characterClauses.join(", ") || null,
    background_request: backgroundClauses.join(", ") || null,
    composition_request: compositionClauses.join(", ") || null,
    explicit_ai_variant: characterClauses.some((item) => ACTION_RE.test(item)),
    confidence: hasStructuredSplit ? 0.92 : 0.78,
    parsing_method: hasStructuredSplit ? "comma_visual_clause_split_v1" : "title_only_v1",
  };
}

function stripProductionPrefix(value: string): string {
  return value
    .replace(/^(сделай|создай|собери|нарисуй)?\s*(для\s+)?(монополии\s+пэй|монополии|пэй|pay|monopoly\s+pay|monopoly)\s+/i, "")
    .replace(/^(новая|новую|новый|новые)?\s*(картинка|визуал|изображение|постер|пост)\s*(с\s+текстом)?\s*/i, "")
    .replace(/^(с\s+текстом)\s+/i, "")
    .trim();
}

function isCharacterActionClause(value: string): boolean {
  return VISUAL_SUBJECT_RE.test(value) && ACTION_RE.test(value);
}

function toExactTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase().slice(0, 72) || "ВИЗУАЛ";
}
