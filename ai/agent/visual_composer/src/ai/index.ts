import { mockAiProvider } from "./mockProvider";
import { createOpenAiProvider } from "./openaiProvider";
import type { VisualAiProvider } from "./types";

export function getVisualAiProvider(enableAi: boolean): VisualAiProvider {
  if (enableAi && process.env.OPENAI_API_KEY) {
    return createOpenAiProvider();
  }

  return mockAiProvider;
}

export type { VisualAiProvider } from "./types";
