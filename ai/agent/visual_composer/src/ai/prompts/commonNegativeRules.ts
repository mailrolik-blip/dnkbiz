export const commonNegativeRules = [
  "Do not render final banner text inside the generated image.",
  "Do not generate distorted Cyrillic letters.",
  "Do not add random logos, watermarks, UI screenshots or fake brand marks.",
  "Leave clean negative space for composer-rendered title, CTA and plaques.",
].join(" ");

export function assetPromptNote(assetPaths: string[]): string {
  return assetPaths.length ? `Available reference/asset paths for metadata: ${assetPaths.join(", ")}` : "No approved reference asset selected.";
}
