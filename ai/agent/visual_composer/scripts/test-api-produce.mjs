import fs from "node:fs/promises";
import path from "node:path";

async function main() {
  const baseUrl = process.env.VISUAL_COMPOSER_TEST_URL || "http://localhost:3000";
  const requestPath =
    process.argv[2] ||
    path.join("ai", "agent", "visual_composer", "examples", "requests", "produce-monopoly.request.json");
  const body = await fs.readFile(path.resolve(requestPath), "utf8");
  const headers = {
    "Content-Type": "application/json",
  };
  if (process.env.VISUAL_COMPOSER_API_KEY) {
    headers.Authorization = `Bearer ${process.env.VISUAL_COMPOSER_API_KEY}`;
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/visual/produce`, {
    method: "POST",
    headers,
    body,
  });
  const text = await response.text();
  console.log(`status=${response.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log(text);
  }
  if (!response.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
