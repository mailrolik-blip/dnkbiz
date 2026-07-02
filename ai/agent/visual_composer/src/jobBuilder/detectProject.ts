import type { VisualProjectKey } from "../types";

export function detectProject(commandText: string, explicit?: VisualProjectKey | ""): VisualProjectKey {
  if (explicit) return explicit;

  const text = commandText.toLowerCase();
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
  if (hasAny(text, ["хоккей", "хоккея", "хоккейную", "gorilla hockey", "горилла", "тренировка", "набор детей", "афиша", "листовка"])) {
    return "gorilla_hockey";
  }
  if (hasAny(text, ["casper", "каспер", "каспера"])) return "casper";
  if (hasAny(text, ["монопол", "monopoly"])) return "monopoly";

  return "dnk";
}

export function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}
