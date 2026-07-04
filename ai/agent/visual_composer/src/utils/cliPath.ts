import path from "node:path";

export function normalizeCliFilePath(input: string): string {
  const cleaned = stripWrappingQuotes(input).replace(/^\^+/, "");
  if (isWindowsAbsolutePath(cleaned)) return path.normalize(cleaned);
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  return path.resolve(process.cwd(), cleaned);
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function isWindowsAbsolutePath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value) || path.win32.isAbsolute(value);
}
