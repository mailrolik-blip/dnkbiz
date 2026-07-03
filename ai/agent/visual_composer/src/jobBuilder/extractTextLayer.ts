import type { VisualMode, VisualProjectKey } from "../types";
import type { TextLayerParts } from "./types";

export function extractTextLayerParts(commandText: string, projectKey: VisualProjectKey, visualMode: VisualMode): TextLayerParts {
  const explicitText =
    extractQuoted(commandText) ||
    extractLabeledText(commandText, ["текст", "title", "заголовок", "тема"]) ||
    extractAfterAnyPhrase(commandText, ["с текстом", "с надписью", "надпись", "заголовок", "тема"]);
  const cleaned = cleanCommand(commandText, projectKey);
  const titleSource = explicitText || cleaned || commandText;

  if (projectKey === "monopoly_pay") return buildPayText(titleSource);
  if (projectKey === "gorilla_hockey") return buildHockeyText(titleSource, visualMode);
  if (projectKey === "casper") return buildCasperText(titleSource);
  if (projectKey === "monopoly") return buildMonopolyText(titleSource);

  return {
    title: toDisplayTitle(titleSource),
    post_caption: titleSource,
  };
}

function buildMonopolyText(source: string): TextLayerParts {
  const lower = source.toLowerCase();
  if (lower.includes("история знакомства")) return withCaption("ИСТОРИЯ ЗНАКОМСТВА", source);
  if (lower.includes("новый конкурс")) return withCaption("НОВЫЙ КОНКУРС", source, "УЧАСТВУЙ");
  if (lower.includes("результаты конкурса")) return withCaption("РЕЗУЛЬТАТЫ КОНКУРСА", source);
  return withCaption(toDisplayTitle(source), source);
}

function buildPayText(source: string): TextLayerParts {
  const lower = source.toLowerCase();
  if (lower.includes("яндекс-яндекс")) {
    return {
      title: "ЯНДЕКС-ЯНДЕКС",
      sticker: "НОВЫЙ МЕТОД",
      subtitle: "БЫСТРАЯ ОПЛАТА",
      cta: "ПОДКЛЮЧИТЬ МЕТОД",
      post_caption: "Новый способ оплаты для пользователей Monopoly Pay: Яндекс-Яндекс. Проверьте сценарий и подготовьте запуск.",
    };
  }
  if (lower.includes("новые триггеры банков")) return withCaption("НОВЫЕ ТРИГГЕРЫ БАНКОВ", source, "PAY UPDATE");
  if (lower.includes("триггер") && lower.includes("банк")) return withCaption("НОВЫЕ ТРИГГЕРЫ БАНКОВ", source, "PAY UPDATE");
  if (lower.includes("оплата по ссылке")) return withCaption("ОПЛАТА ПО ССЫЛКЕ", source, "НОВЫЙ МЕТОД");

  return {
    title: toDisplayTitle(source),
    sticker: lower.includes("оплат") ? "НОВЫЙ МЕТОД" : undefined,
    post_caption: `Monopoly Pay: ${source}`,
  };
}

function buildHockeyText(source: string, visualMode: VisualMode): TextLayerParts {
  const lower = source.toLowerCase();
  const isRecruitment = lower.includes("набор") || lower.includes("запис") || lower.includes("2016") || lower.includes("2018");
  const isTomorrowTraining = lower.includes("завтра") && lower.includes("трениров");
  const isKidsDay = lower.includes("день защиты детей");

  return {
    title: isKidsDay ? "ДЕНЬ ЗАЩИТЫ ДЕТЕЙ" : isTomorrowTraining ? "ТРЕНИРОВКА ЗАВТРА" : isRecruitment ? "НАБОР ДЕТЕЙ" : toDisplayTitle(source),
    subtitle: isRecruitment ? "2016-2018 И МЛАДШЕ" : lower.includes("трениров") ? "ТРЕНИРОВКИ ПО ХОККЕЮ" : undefined,
    sticker: isKidsDay ? "ПОЗДРАВЛЯЕМ" : undefined,
    cta: isRecruitment || lower.includes("трениров") ? "ЗАПИСЬ НА ТРЕНИРОВКУ" : "ПОДРОБНОСТИ У ТРЕНЕРА",
    body:
      visualMode === "hockey_print_layout"
        ? "Группы для начинающих. Тренировки на льду и общая физическая подготовка. Помогаем детям полюбить спорт, команду и движение."
        : undefined,
    contacts: "gorillahockey.ru | +7 900 000-00-00",
    post_caption: isRecruitment
      ? "Открыт набор детей на тренировки Gorilla Hockey. Напишите нам, чтобы узнать расписание и записаться на пробное занятие."
      : `Gorilla Hockey: ${source}`,
  };
}

function buildCasperText(source: string): TextLayerParts {
  const lower = source.toLowerCase();
  if (lower.includes("будь на связи")) return withCaption("БУДЬ НА СВЯЗИ", source, "CASPER");
  if (lower.includes("3000")) return withCaption("КОНКУРС НА 3000", source, "КОНКУРС");
  if (lower.includes("фишинг")) return withCaption("ОСТОРОЖНО: ФИШИНГ", source, "ВАЖНО");
  return withCaption(toDisplayTitle(source), source, "CASPER");
}

function withCaption(title: string, source: string, sticker?: string): TextLayerParts {
  return {
    title,
    sticker,
    post_caption: source.length > 12 ? source : title,
  };
}

function cleanCommand(commandText: string, projectKey: VisualProjectKey): string {
  let value = commandText
    .replace(/^сделай\s+(новую\s+)?(картинку|афишу|листовку|постер|пост|задачу)\s*(для)?/i, "")
    .replace(/^используй\s+это\s+фото\s+и\s+сделай/i, "")
    .replace(/^для\s+/i, "")
    .replace(/^[^:]{1,40}:\s*/i, "")
    .trim();

  const projectWords: Record<VisualProjectKey, RegExp[]> = {
    monopoly: [/^(монополии|монополия|monopoly)\s*/i],
    monopoly_pay: [/^(монополии\s+пэй|монополия\s+пэй|monopoly\s+pay|pay|пэй)\s*/i],
    casper: [/^(каспера|каспер|casper)\s*/i],
    gorilla_hockey: [/^(хоккея|хоккей|хоккейную|gorilla hockey|горилла)\s*/i],
    dnk: [],
  };
  for (const pattern of projectWords[projectKey]) value = value.replace(pattern, "").trim();
  value = value.replace(/^(нужна|нужно|надо|новая|новый)\s+/i, "").trim();
  return value;
}

function extractLabeledText(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*:\\s*["“«]?([^"”»]+)["”»]?`, "iu");
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function extractAfterAnyPhrase(text: string, phrases: string[]): string | null {
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    const index = lower.indexOf(phrase);
    if (index >= 0) return text.slice(index + phrase.length).trim().replace(/^[:\s"“«]+|["”»]+$/g, "") || null;
  }
  return null;
}

function extractQuoted(text: string): string | null {
  return text.match(/["“«]([^"”»]{2,80})["”»]/u)?.[1]?.trim() || null;
}

export function toDisplayTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase().slice(0, 72) || "ВИЗУАЛ";
}
