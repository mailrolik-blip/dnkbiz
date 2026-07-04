import type { VisualMode, VisualProjectKey } from "../types";
import type { TextLayerParts } from "./types";
import { extractTitleForProject } from "./titleExtractor";

export function extractTextLayerParts(commandText: string, projectKey: VisualProjectKey, visualMode: VisualMode): TextLayerParts {
  const extraction = extractTitleForProject(commandText, projectKey);
  const titleSource = extraction.normalized_title;
  const parts = projectKey === "monopoly_pay"
    ? buildPayText(titleSource, commandText)
    : projectKey === "gorilla_hockey"
      ? buildHockeyText(titleSource, commandText, visualMode)
      : projectKey === "casper"
        ? buildCasperText(titleSource, commandText)
        : projectKey === "monopoly"
          ? buildMonopolyText(titleSource, commandText)
          : { title: toDisplayTitle(titleSource), post_caption: commandText };
  return {
    ...parts,
    internal_prompt: JSON.stringify({ title_extraction: extraction }),
  };
}

function buildMonopolyText(source: string, commandText: string): TextLayerParts {
  const lower = source.toLowerCase();
  if (lower.includes("история знакомства")) return withCaption("ИСТОРИЯ ЗНАКОМСТВА", commandText);
  if (lower.includes("новый конкурс")) return withCaption("НОВЫЙ КОНКУРС", commandText, "УЧАСТВУЙ");
  if (lower.includes("результаты конкурса")) return withCaption("РЕЗУЛЬТАТЫ КОНКУРСА", commandText);
  return withCaption(toDisplayTitle(source), commandText);
}

function buildPayText(source: string, commandText: string): TextLayerParts {
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
  if (lower.includes("новые триггеры банков")) return withCaption("НОВЫЕ ТРИГГЕРЫ БАНКОВ", commandText, "PAY UPDATE");
  if (lower.includes("оплата по ссылке")) return withCaption("ОПЛАТА ПО ССЫЛКЕ", commandText, "НОВЫЙ МЕТОД");
  return { title: toDisplayTitle(source), sticker: lower.includes("оплат") ? "НОВЫЙ МЕТОД" : undefined, post_caption: `Monopoly Pay: ${commandText}` };
}

function buildHockeyText(source: string, commandText: string, visualMode: VisualMode): TextLayerParts {
  const lower = source.toLowerCase();
  const isRecruitment = lower.includes("набор") || lower.includes("2016") || lower.includes("2018");
  const isTomorrowTraining = lower.includes("завтра") && lower.includes("трениров");
  const isKidsDay = lower.includes("день защиты детей");
  return {
    title: isKidsDay ? "ДЕНЬ ЗАЩИТЫ ДЕТЕЙ" : isTomorrowTraining ? "ТРЕНИРОВКА ЗАВТРА" : isRecruitment ? "НАБОР ДЕТЕЙ" : toDisplayTitle(source),
    subtitle: isRecruitment ? "2016-2018 И МЛАДШЕ" : lower.includes("трениров") ? "ТРЕНИРОВКИ ПО ХОККЕЮ" : undefined,
    sticker: isKidsDay ? "ПОЗДРАВЛЯЕМ" : undefined,
    cta: isRecruitment || lower.includes("трениров") ? "ЗАПИСЬ НА ТРЕНИРОВКУ" : "ПОДРОБНОСТИ У ТРЕНЕРА",
    body: visualMode === "hockey_print_layout" ? "Группы для начинающих. Тренировки на льду и общая физическая подготовка. Помогаем детям полюбить спорт, команду и движение." : undefined,
    contacts: "gorillahockey.ru | +7 900 000-00-00",
    post_caption: isRecruitment ? "Открыт набор детей на тренировки Gorilla Hockey. Напишите нам, чтобы узнать расписание и записаться на пробное занятие." : `Gorilla Hockey: ${commandText}`,
  };
}

function buildCasperText(source: string, commandText: string): TextLayerParts {
  const lower = source.toLowerCase();
  if (lower.includes("будь на связи")) return withCaption("БУДЬ НА СВЯЗИ", commandText, "CASPER");
  if (lower.includes("3000")) return withCaption("КОНКУРС НА 3000", commandText, "КОНКУРС");
  if (lower.includes("фишинг")) return withCaption("ОСТОРОЖНО: ФИШИНГ", commandText, "ВАЖНО");
  return withCaption(toDisplayTitle(source), commandText, "CASPER");
}

function withCaption(title: string, source: string, sticker?: string): TextLayerParts {
  return { title, sticker, post_caption: source.length > 12 ? source : title };
}

export function toDisplayTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim().toUpperCase().slice(0, 72) || "ВИЗУАЛ";
}
