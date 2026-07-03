import type { VisualProjectKey } from "../types";

export function detectProject(commandText: string, explicit?: VisualProjectKey | ""): VisualProjectKey {
  if (explicit) return explicit;

  const text = commandText.toLowerCase();
  const hasExplicitMonopoly = hasAny(text, ["монопол", "monopoly"]);
  const hasExplicitCasper = hasAny(text, ["casper", "каспер", "каспера"]);
  const hasExplicitHockey = hasAny(text, ["хоккей", "хоккея", "хоккейную", "gorilla hockey", "горилла"]);
  if (
    hasAny(text, [
      "monopoly pay",
      "монополии пэй",
      "монополия пэй",
      "монополии pay",
      "pay",
      "пэй",
      "яндекс-яндекс",
      "спб",
      "банк",
      "банков",
      "оплата",
      "платеж",
      "платёж",
      "карта",
      "баланс",
    ])
  ) {
    return "monopoly_pay";
  }
  if (hasExplicitCasper) return "casper";
  if (hasExplicitMonopoly) return "monopoly";
  if (
    hasExplicitHockey ||
    (!hasExplicitMonopoly && !hasExplicitCasper && hasAny(text, ["тренировка", "тренировку", "набор детей", "афиша для хоккея", "пост для хоккея", "задача для хоккея"]))
  ) {
    return "gorilla_hockey";
  }

  return "dnk";
}

export function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
