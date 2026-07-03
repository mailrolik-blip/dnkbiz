const { splitTelegramText } = await import("../dist/agent/telegram_visual_bot/src/index.js");

const text = Array.from({ length: 260 }, (_, index) => `debug-line-${index} ${"x".repeat(35)}`).join("\n");
if (text.length <= 9000) throw new Error("Debug smoke fixture must be longer than 9000 chars.");

const chunks = splitTelegramText(text, 3500);
if (chunks.length < 3) throw new Error(`Expected at least 3 chunks, got ${chunks.length}.`);
const oversize = chunks.find((chunk) => chunk.length > 3500);
if (oversize) throw new Error(`Chunk exceeds 3500 chars: ${oversize.length}.`);
if (chunks.join("").length > text.length) throw new Error("Chunks unexpectedly grew after splitting.");

console.log(JSON.stringify({
  ok: true,
  input_length: text.length,
  chunks: chunks.length,
  max_chunk_length: Math.max(...chunks.map((chunk) => chunk.length)),
}, null, 2));
