import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { VisualAiProvider } from "./types";

export function createOpenAiProvider(): VisualAiProvider {
  return {
    async generateTextLayer(input) {
      return {
        locked: false,
        internal_prompt: buildPrompt(input.command_text, input.profile?.text_style_rules || ""),
        post_caption: `${input.profile?.project_name || input.project_key}: ${input.command_text}`,
      };
    },
    async generateIllustrationLayer(input) {
      return createSafeGeneratedPlaceholder(input.project_key, "illustration", buildPrompt(input.command_text, input.profile?.image_style_rules || ""));
    },
    async generateBackgroundLayer(input) {
      return createSafeGeneratedPlaceholder(input.project_key, "background", buildPrompt(input.command_text, input.profile?.composition_rules || ""));
    },
    async generateStyleBaseImage(input) {
      return createSafeGeneratedPlaceholder(input.project_key, "style_base", buildPrompt(input.command_text, input.profile?.image_style_rules || ""));
    },
  };
}

function buildPrompt(commandText: string, rules: string): string {
  return [rules, "No final Cyrillic banner text inside generated image; composer renders text separately.", commandText].filter(Boolean).join("\n");
}

async function createSafeGeneratedPlaceholder(projectKey: string, kind: string, prompt: string) {
  const dir = path.join(process.cwd(), ".storage", "visual_generated_assets", projectKey);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}-${kind}.png`);
  const label = `${projectKey} ${kind}`;
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#16202A"/><stop offset="1" stop-color="#3B82F6"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><circle cx="760" cy="240" r="180" fill="#ffffff" opacity="0.15"/><rect x="120" y="680" width="784" height="150" rx="42" fill="#ffffff" opacity="0.14"/><text x="512" y="500" text-anchor="middle" font-size="54" font-family="Arial" font-weight="800" fill="#ffffff">${escapeXml(label)}</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(filePath);
  await fs.writeFile(filePath.replace(/\.png$/, ".prompt.txt"), prompt, "utf8");
  return { enabled: true, asset_path: filePath, locked: false };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}
