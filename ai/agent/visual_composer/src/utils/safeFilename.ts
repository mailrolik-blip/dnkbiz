export function safeFilename(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/giu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.+/g, ".");

  return normalized || "visual-job";
}
