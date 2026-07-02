import type { AiLayerInput } from "../types";

export interface BuiltTextPrompt {
  system: string;
  user: string;
  output_expectations: string;
}

export function buildTextPrompt(input: AiLayerInput): BuiltTextPrompt {
  return {
    system: [
      "You create short Russian production copy for a visual composer.",
      "Return JSON only. No markdown.",
      "The composer renders all final Cyrillic image text, so keep title short and readable.",
    ].join(" "),
    user: [
      `Project: ${input.profile?.project_name || input.project_key}`,
      `Mode: ${input.visual_mode}`,
      `Text style rules: ${input.profile?.text_style_rules || "-"}`,
      `Examples: ${(input.profile?.telegram_examples || []).join(" | ") || "-"}`,
      `Command: ${input.command_text}`,
      "Max title length: 36 characters when possible. Max subtitle: 48 characters.",
      "Return fields: title, subtitle, sticker, cta, post_caption, internal_prompt, warnings.",
    ].join("\n"),
    output_expectations: "{\"title\":\"...\",\"subtitle\":\"...\",\"sticker\":\"...\",\"cta\":\"...\",\"post_caption\":\"...\",\"internal_prompt\":\"...\",\"warnings\":[]}",
  };
}
