import { BflImageProvider } from "./bflImageProvider";
import { MockImageProvider } from "./mockImageProvider";
import { OpenAiImageProvider } from "./openAiImageProvider";
import type { ImageGenerationProvider } from "./types";
import { YandexArtImageProvider } from "./yandexArtImageProvider";

export interface ProviderResolution {
  requested: string;
  resolved: string;
  runtime_available: boolean;
  billable: boolean;
  provider?: ImageGenerationProvider;
  warning?: string;
}

export class ImageProviderRouter {
  private readonly providers: Record<string, ImageGenerationProvider>;

  constructor(providers: ImageGenerationProvider[] = [new MockImageProvider(), new OpenAiImageProvider(), new BflImageProvider(), new YandexArtImageProvider()]) {
    this.providers = Object.fromEntries(providers.map((provider) => [provider.key, provider]));
  }

  resolve(routeKey?: string): ImageGenerationProvider {
    const configured = providerKeyForRoute(routeKey);
    const provider = this.providers[configured];
    if (!provider) throw new Error(`Image provider not found for route ${routeKey || "-"}`);
    return provider;
  }

  resolveCharacterEdit(context: { channel?: string; allowMock?: boolean } = {}): ProviderResolution {
    const requested = characterEditProviderKey();
    if (requested === "disabled") {
      return { requested, resolved: "disabled", runtime_available: false, billable: false, warning: "character_ai_provider_unavailable" };
    }
    if (requested === "mock" && !isMockAllowed(context)) {
      return { requested, resolved: "disabled", runtime_available: false, billable: false, warning: "mock_provider_blocked_in_runtime" };
    }
    const provider = this.providers[requested];
    if (!provider) return { requested, resolved: "disabled", runtime_available: false, billable: false, warning: `unknown_character_ai_provider=${requested}` };
    const available = providerRuntimeAvailable(requested, provider);
    return {
      requested,
      resolved: requested,
      runtime_available: available,
      billable: requested !== "mock",
      provider: available ? provider : undefined,
      warning: available ? undefined : "character_ai_provider_unavailable",
    };
  }

  list(): string[] {
    return Object.keys(this.providers);
  }
}

function providerKeyForRoute(routeKey?: string): string {
  const envKey = routeKey ? `VISUAL_PROVIDER_ROUTE_${routeKey.toUpperCase()}` : "VISUAL_PROVIDER_DEFAULT";
  if (process.env[envKey]) return String(process.env[envKey]);
  const defaults: Record<string, string> = {
    monopoly_character: "disabled",
    pay_character: "disabled",
    casper_one_shot: "disabled",
    hockey_edit: "disabled",
  };
  return defaults[routeKey || ""] || process.env.VISUAL_PROVIDER_DEFAULT || "disabled";
}

function characterEditProviderKey(): string {
  const value = process.env.VISUAL_CHARACTER_EDIT_PROVIDER || process.env.VISUAL_IMAGE_EDIT_PROVIDER || "disabled";
  const normalized = value.trim().toLowerCase();
  return ["openai", "bfl", "disabled", "mock"].includes(normalized) ? normalized : "disabled";
}

function providerRuntimeAvailable(key: string, provider: ImageGenerationProvider): boolean {
  if (key === "mock") return true;
  if (key === "openai") return process.env.VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS === "true" && Boolean(process.env.OPENAI_API_KEY);
  if (key === "bfl") return process.env.VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS === "true" && Boolean(process.env.BFL_API_KEY) && provider.supportsReferenceImages();
  return false;
}

function isMockAllowed(context: { channel?: string; allowMock?: boolean }): boolean {
  return Boolean(context.allowMock || process.env.VISUAL_ALLOW_MOCK_IMAGE_PROVIDER === "true" || /^(smoke|test|fixture)$/i.test(context.channel || ""));
}
