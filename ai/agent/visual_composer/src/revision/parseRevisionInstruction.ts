import type { OutputFormat } from "../types";
import type { ParsedRevisionInstruction } from "./types";

export function parseRevisionInstruction(instruction: string): ParsedRevisionInstruction {
  const text = instruction.trim();
  const lower = text.toLowerCase();
  const quoted = text.match(/(?:текст|заголовок)\s*:\s*["“«]?([^"”»]+)["”»]?/iu)?.[1]?.trim();
  const changeTo = text.match(/(?:поменяй|замени|измени)\s+(?:только\s+)?(?:текст|заголовок)\s+на\s+(.+)$/iu)?.[1]?.trim();
  const makeTitle = text.match(/(?:сделай\s+заголовок|заголовок)\s+(.+)$/iu)?.[1]?.trim();
  const textTo = text.match(/(?:на\s+)([А-ЯA-Z0-9][\s\S]{2,})$/u)?.[1]?.trim();
  const write = text.match(/(?:напиши|сделай)\s+(.+)$/iu)?.[1]?.trim();
  const plain = /^[\p{L}\p{N}\s.,!?-]{2,80}$/u.test(text) && !detectFormat(lower) && !detectVariant(lower) ? text : undefined;
  const format = detectFormat(lower);

  return {
    replacement_text: cleanReplacement(quoted || changeTo || makeTitle || textTo || write || plain),
    remove_layer: /убери|отключи|без\s+(?:иллюстрации|иллюстрацию|фона|фон|картинки)/iu.test(lower),
    requested_variant: detectVariant(lower),
    requested_format: format,
  };
}

function cleanReplacement(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/^["“«]|["”»]$/g, "").trim().toUpperCase();
}

function detectVariant(lower: string): string | undefined {
  if (lower.includes("сверху")) return "monopoly_square_title_top";
  if (lower.includes("наверх")) return "monopoly_square_title_top";
  if (lower.includes("снизу") || lower.includes("вниз")) return "monopoly_square_title_bottom";
  if (lower.includes("персонаж по центру") || lower.includes("по центру")) return "monopoly_square_character_center";
  if (lower.includes("стикер") || lower.includes("оверлей")) return "monopoly_sticker_style";
  if (lower.includes("другая") || lower.includes("другую") || lower.includes("компози")) return "next";
  return undefined;
}

function detectFormat(lower: string): OutputFormat | undefined {
  if (lower.includes("сторис") || lower.includes("story")) return "story";
  if (/(^|[^a-z0-9а-я])a4($|[^a-z0-9а-я])|(^|[^a-z0-9а-я])а4($|[^a-z0-9а-я])/iu.test(lower)) return "print_a4";
  if (/(^|[^a-z0-9а-я])a5($|[^a-z0-9а-я])|(^|[^a-z0-9а-я])а5($|[^a-z0-9а-я])/iu.test(lower)) return "print_a5";
  if (lower.includes("vk") || lower.includes("вк")) return "vk_post";
  if (lower.includes("square") || lower.includes("квадрат")) return "square";
  return undefined;
}
