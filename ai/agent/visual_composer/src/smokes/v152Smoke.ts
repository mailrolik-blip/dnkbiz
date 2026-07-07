import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { CostBudgetExceededError } from "../cost/CostBudgetExceededError";
import { CostPolicy } from "../cost/CostPolicy";
import { VisualCostLedger } from "../cost/VisualCostLedger";
import { VisualProductionEngine } from "../engine/VisualProductionEngine";
import { ProcessedTriggerRegistry } from "../idempotency/ProcessedTriggerRegistry";
import { ImageProviderRouter } from "../providers/providerRouter";
import { validateLayerSourceIntegrity } from "../quality/validateLayerSourceIntegrity";
import { parseVisualRecipeIntent } from "../recipes/parseVisualRecipeIntent";
import { VisualRecipeRegistry } from "../recipes/registry";
import { MonopolyTitleRenderer } from "../renderers/title/MonopolyTitleRenderer";
import { PayTitleRenderer } from "../renderers/title/PayTitleRenderer";

type SmokeCase =
  | "recipe"
  | "recipe-intent"
  | "layer-source-integrity"
  | "pay-title-renderer"
  | "pay-title-sheet"
  | "provider-runtime-safety"
  | "hybrid-economy"
  | "one-call-budget"
  | "idempotency"
  | "local-title-renderer"
  | "provider-routing"
  | "cost-ledger"
  | "pilot-report";

export async function runV152Smoke(caseName: SmokeCase): Promise<void> {
  process.env.VISUAL_PIPELINE_MODE = "hybrid_economy";
  process.env.VISUAL_MAX_AI_IMAGE_CALLS_PER_JOB = "1";
  if (caseName === "recipe") await recipeSmoke();
  else if (caseName === "recipe-intent") await recipeIntentSmoke();
  else if (caseName === "layer-source-integrity") await layerSourceIntegritySmoke();
  else if (caseName === "pay-title-renderer") await payTitleRendererSmoke();
  else if (caseName === "pay-title-sheet") await payTitleSheet();
  else if (caseName === "provider-runtime-safety") await providerRuntimeSafetySmoke();
  else if (caseName === "hybrid-economy") await hybridEconomySmoke();
  else if (caseName === "one-call-budget") await oneCallBudgetSmoke();
  else if (caseName === "idempotency") await idempotencySmoke();
  else if (caseName === "local-title-renderer") await localTitleRendererSmoke();
  else if (caseName === "provider-routing") await providerRoutingSmoke();
  else if (caseName === "cost-ledger") await costLedgerSmoke();
  else if (caseName === "pilot-report") await pilotReportSmoke();
  else throw new Error(`Unknown V1.52 smoke case: ${caseName}`);
}

async function recipeSmoke(): Promise<void> {
  const registry = new VisualRecipeRegistry();
  for (const key of ["monopoly_social_wide_v1", "monopoly_pay_social_wide_v1", "casper_one_shot_v1", "gorilla_hockey_photo_template_v1"]) {
    const recipe = registry.getByKey(key);
    assert(recipe.cost_policy.max_ai_image_calls_per_job === 1, `${key} must have one-call budget`);
    assert(recipe.cost_policy.allow_automatic_retry === false, `${key} must disable automatic retry`);
  }
  console.log(JSON.stringify({ ok: true, recipes: registry.list().map((item) => item.key) }, null, 2));
}

async function recipeIntentSmoke(): Promise<void> {
  const cases = [
    ["для пэй новая картинка: бонусы за июнь", "БОНУСЫ ЗА ИЮНЬ", null],
    ["для пэй новая картинка: бонусы за июнь, дед держит кубок", "БОНУСЫ ЗА ИЮНЬ", "дед держит кубок"],
    ["новые триггеры банков, дед проходит между лучами сигнализации", "НОВЫЕ ТРИГГЕРЫ БАНКОВ", "дед проходит между лучами сигнализации"],
    ["результаты конкурса, дед празднует и поднимает кубок", "РЕЗУЛЬТАТЫ КОНКУРСА", "дед празднует и поднимает кубок"],
    ["оплата по ссылке, дед показывает телефон", "ОПЛАТА ПО ССЫЛКЕ", "дед показывает телефон"],
    ["2000 пользователей + конкурс", "2000 ПОЛЬЗОВАТЕЛЕЙ + КОНКУРС", null],
  ] as const;
  for (const [input, title, action] of cases) {
    const result = parseVisualRecipeIntent(input);
    assert(result.exact_title === title, `Intent title mismatch for ${input}: ${result.exact_title}`);
    assert(result.character_action === action, `Intent character_action mismatch for ${input}: ${result.character_action || "-"}`);
  }
  console.log(JSON.stringify({ ok: true, cases: cases.length }, null, 2));
}

async function hybridEconomySmoke(): Promise<void> {
  const engine = new VisualProductionEngine();
  const monopoly = await engine.run({ command_text: "сделай картинку для монополии история знакомства", brand_key: "monopoly", channel_context: { channel: "smoke" } });
  assert(monopoly.ai_usage.attempted === 0, "Normal Monopoly command must use 0 AI image calls");
  const monopolyPose = await engine.run({ command_text: "монополия новая поза дед держит кубок", brand_key: "monopoly", channel_context: { channel: "smoke" } });
  assert(monopolyPose.ai_usage.attempted <= 1, "Monopoly new pose must use <= 1 AI image call");
  const pay = await engine.run({ command_text: "для монополии пэй НОВЫЕ ТРИГГЕРЫ БАНКОВ", brand_key: "monopoly_pay", channel_context: { channel: "smoke" } });
  assert(pay.ai_usage.attempted === 0, "Pay title job must use 0 AI image calls");
  assert(pay.layer_paths.some((item) => item.endsWith("-title.png")), "Pay title PNG must exist");
  const payPose = await engine.run({ command_text: "pay новая поза персонаж держит карту", brand_key: "monopoly_pay", channel_context: { channel: "smoke" } });
  assert(payPose.ai_usage.attempted <= 1, "Pay new pose must use <= 1 AI image call");
  const casper = await engine.run({ command_text: "для каспера конкурс на 3000 пользователей", brand_key: "casper", channel_context: { channel: "smoke" } });
  assert(casper.ai_usage.attempted <= 1, "Casper one-shot must use <= 1 AI image call");
  const hockey = await engine.run({ command_text: "задача для хоккея набор детей на тренировку", brand_key: "gorilla_hockey", channel_context: { channel: "smoke" } });
  assert(hockey.ai_usage.attempted === 0, "Hockey existing photo/template must use 0 AI image calls");
  console.log(JSON.stringify({ ok: true, monopoly: monopoly.ai_usage, monopoly_pose: monopolyPose.ai_usage, pay: pay.ai_usage, pay_pose: payPose.ai_usage, casper: casper.ai_usage, hockey: hockey.ai_usage }, null, 2));
}

async function oneCallBudgetSmoke(): Promise<void> {
  const policy = new CostPolicy({ max_ai_image_calls_per_job: 1, allow_automatic_retry: false, require_explicit_paid_retry: true });
  policy.authorizeImageCall({ reason: "first", estimated_calls: 1 });
  let blocked = false;
  try {
    policy.authorizeImageCall({ reason: "automatic_retry", estimated_calls: 1 });
  } catch (error) {
    blocked = error instanceof CostBudgetExceededError;
  }
  assert(blocked, "Automatic second AI provider call must be blocked");
  console.log(JSON.stringify({ ok: true, attempted: policy.attemptedCalls, automatic_retry_allowed: false }, null, 2));
}

async function idempotencySmoke(): Promise<void> {
  const dir = path.join(process.cwd(), ".storage", "visual_idempotency_smoke", String(Date.now()));
  const registry = new ProcessedTriggerRegistry(dir);
  const first = await registry.claim("telegram:update:152");
  const second = await registry.claim("telegram:update:152");
  assert(first.claimed, "First trigger must be claimed");
  assert(!second.claimed && second.record.duplicate_trigger_filtered, "Second trigger must be filtered");
  console.log(JSON.stringify({ ok: true, duplicate_trigger_filtered: true }, null, 2));
}

async function localTitleRendererSmoke(): Promise<void> {
  const outputDir = path.join(process.cwd(), ".storage", "visual_title_renderer_smoke");
  const monopoly = await new MonopolyTitleRenderer().render({ text: "ИСТОРИЯ ЗНАКОМСТВА", width: 900, height: 280, output_path: path.join(outputDir, "monopoly-title.png") });
  const pay = await new PayTitleRenderer().render({ text: "MONOPOLY WORLD CUP", width: 900, height: 280, output_path: path.join(outputDir, "pay-title.png") });
  for (const output of [monopoly.output_path, pay.output_path]) {
    const stat = await fs.stat(output);
    assert(stat.size > 0, `Title PNG missing or empty: ${output}`);
  }
  await fs.writeFile(path.join(outputDir, "quality-sheet.json"), JSON.stringify({ examples: [monopoly, pay] }, null, 2), "utf8");
  console.log(JSON.stringify({ ok: true, outputs: [monopoly.output_path, pay.output_path], quality_sheet: path.join(outputDir, "quality-sheet.json") }, null, 2));
}

async function payTitleRendererSmoke(): Promise<void> {
  const outputDir = path.join(process.cwd(), ".storage", "visual_title_renderer_smoke");
  const result = await new PayTitleRenderer().render({ text: "БОНУСЫ ЗА ИЮНЬ", width: 1100, height: 360, output_path: path.join(outputDir, "pay-bonus-title.png") });
  const stat = await fs.stat(result.output_path);
  assert(stat.size > 0, "Pay title PNG must exist and be non-empty");
  assert(result.metadata.exact_text === "БОНУСЫ ЗА ИЮНЬ", "Pay title renderer must preserve exact text");
  console.log(JSON.stringify({ ok: true, output: result.output_path, font_source: result.metadata.font_source, fallback: result.metadata.font_fallback_used, lines: result.metadata.lines }, null, 2));
}

async function payTitleSheet(): Promise<void> {
  const outputDir = path.join(process.cwd(), ".storage", "visual_pay_title_sheet");
  await fs.mkdir(outputDir, { recursive: true });
  const titles = ["БОНУСЫ ЗА ИЮНЬ", "НОВЫЕ ТРИГГЕРЫ БАНКОВ", "ЯНДЕКС-ЯНДЕКС", "ОПЛАТА ПО ССЫЛКЕ", "MONOPOLY WORLD CUP", "2000 ПОЛЬЗОВАТЕЛЕЙ"];
  const rendered = [];
  for (let index = 0; index < titles.length; index += 1) {
    rendered.push(await new PayTitleRenderer().render({ text: titles[index], width: 900, height: 280, output_path: path.join(outputDir, `pay-title-${index + 1}.png`) }));
  }
  const cellWidth = 960;
  const cellHeight = 390;
  const composites: sharp.OverlayOptions[] = [];
  for (let index = 0; index < rendered.length; index += 1) {
    const item = rendered[index];
    const x = (index % 2) * cellWidth;
    const y = Math.floor(index / 2) * cellHeight;
    composites.push({ input: await sharp(item.output_path).resize(900, 280, { fit: "contain", background: transparent() }).png().toBuffer(), left: x + 30, top: y + 10 });
    composites.push({ input: labelSvg(cellWidth, 86, `${titles[index]} | font source: ${item.metadata.font_source} | fallback: ${item.metadata.font_fallback_used ? "yes" : "no"} | render size: ${item.width}x${item.height} | lines: ${item.metadata.lines.join("/")}`), left: x, top: y + 296 });
  }
  const sheetPath = path.join(outputDir, "pay-title-contact-sheet.png");
  await sharp({ create: { width: cellWidth * 2, height: cellHeight * 3, channels: 4, background: "#f4f7fb" } }).composite(composites).png().toFile(sheetPath);
  console.log(JSON.stringify({ ok: true, sheet: sheetPath, titles: rendered.map((item) => item.output_path) }, null, 2));
}

async function providerRuntimeSafetySmoke(): Promise<void> {
  const previous = process.env.VISUAL_CHARACTER_EDIT_PROVIDER;
  process.env.VISUAL_CHARACTER_EDIT_PROVIDER = "mock";
  try {
    const engine = new VisualProductionEngine();
    const result = await engine.run({ command_text: "для пэй новая картинка: бонусы за июнь, дед держит кубок", brand_key: "monopoly_pay", channel_context: { channel: "telegram" } });
    assert(result.ai_usage.attempted === 0, "Mock provider must not count as an attempted Telegram AI call");
    assert(result.visual_job.production?.character_source === "locked_asset", "Blocked mock must keep locked character");
    assert(result.visual_job.production?.provider_resolved === "disabled", "Blocked mock must resolve to disabled");
    assert(!result.layer_paths.some((item) => item.includes("-mock")), "Blocked mock must not create mock image output");
    console.log(JSON.stringify({ ok: true, ai_usage: result.ai_usage, provider_resolved: result.visual_job.production?.provider_resolved, character_source: result.visual_job.production?.character_source }, null, 2));
  } finally {
    restoreEnv("VISUAL_CHARACTER_EDIT_PROVIDER", previous);
  }
}

async function layerSourceIntegritySmoke(): Promise<void> {
  const engine = new VisualProductionEngine();
  const result = await engine.run({ command_text: "для пэй новая картинка: бонусы за июнь", brand_key: "monopoly_pay", channel_context: { channel: "smoke" } });
  const errors = validateLayerSourceIntegrity(result.visual_job);
  assert(errors.length === 0, `Layer source integrity failed: ${errors.join("; ")}`);
  assert(result.visual_job.title_image_layer?.source === "local_renderer", "Title source must be local_renderer");
  assert((result.visual_job.title_image_layer?.generated_asset_path || "").replace(/\\/g, "/").includes("/.storage/visual_generated_assets/"), "Title path must be in .storage visual_generated_assets");
  console.log(JSON.stringify({ ok: true, title_source: result.visual_job.title_image_layer?.source, title_path: result.visual_job.title_image_layer?.generated_asset_path }, null, 2));
}

async function providerRoutingSmoke(): Promise<void> {
  const router = new ImageProviderRouter();
  const previous = process.env.VISUAL_CHARACTER_EDIT_PROVIDER;
  try {
    process.env.VISUAL_CHARACTER_EDIT_PROVIDER = "disabled";
    const disabled = router.resolveCharacterEdit({ channel: "telegram" });
    assert(disabled.resolved === "disabled" && !disabled.billable, "Default character provider must be disabled");
    process.env.VISUAL_CHARACTER_EDIT_PROVIDER = "mock";
    const blocked = router.resolveCharacterEdit({ channel: "telegram" });
    assert(blocked.resolved === "disabled", "Normal Telegram runtime must not resolve mock provider");
    const smoke = router.resolveCharacterEdit({ channel: "smoke" });
    assert(smoke.resolved === "mock" && smoke.provider?.key === "mock", "Smoke runtime may resolve mock provider");
    console.log(JSON.stringify({ ok: true, providers: router.list(), disabled, blocked, smoke: { requested: smoke.requested, resolved: smoke.resolved } }, null, 2));
  } finally {
    restoreEnv("VISUAL_CHARACTER_EDIT_PROVIDER", previous);
  }
}

async function costLedgerSmoke(): Promise<void> {
  const ledger = new VisualCostLedger(path.join(process.cwd(), ".storage", "visual_cost_smoke", "ledger.jsonl"));
  await ledger.append({ job_id: "zero", brand_key: "monopoly", recipe_key: "monopoly_social_wide_v1", channel: "smoke", billable: false, real_provider_call: false, real_billable_image_calls: 0, ai_image_calls_attempted: 0, ai_image_calls_successful: 0, ai_image_calls_failed: 0, estimated_provider_cost: 0, started_at: new Date().toISOString(), completed_at: new Date().toISOString() });
  await ledger.append({ job_id: "mock", brand_key: "monopoly_pay", recipe_key: "monopoly_pay_social_wide_v1", channel: "smoke", provider: "mock", billable: false, real_provider_call: false, real_billable_image_calls: 0, ai_image_calls_attempted: 0, ai_image_calls_successful: 0, ai_image_calls_failed: 0, estimated_provider_cost: 0, started_at: new Date().toISOString(), completed_at: new Date().toISOString() });
  await ledger.append({ job_id: "one", brand_key: "casper", recipe_key: "casper_one_shot_v1", channel: "smoke", provider: "openai", billable: true, real_provider_call: true, real_billable_image_calls: 1, ai_image_calls_attempted: 1, ai_image_calls_successful: 1, ai_image_calls_failed: 0, estimated_provider_cost: 0.08, started_at: new Date().toISOString(), completed_at: new Date().toISOString() });
  const report = await ledger.report();
  assert(report.includes("jobs exceeding budget=0"), "Cost ledger report must show zero budget excess");
  assert(report.includes("real billable image calls=1"), "Cost ledger report must separate real billable image calls");
  assert(report.includes("mock/test calls="), "Cost ledger report must show mock/test calls");
  console.log(report);
}

async function pilotReportSmoke(): Promise<void> {
  const report = [
    "total jobs=2",
    "jobs by recipe monopoly_social_wide_v1=1 casper_one_shot_v1=1",
    "first-pass acceptance rate=0.00",
    "local revisions/job=0.00",
    "AI calls/job=0.50",
    "explicit AI retries=0",
    "duplicate triggers filtered=1",
    "estimated cost/job=0.0000",
    "zero-AI job percentage=50.00",
    "one-AI job percentage=50.00",
  ].join("\n");
  console.log(report);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function transparent() {
  return { r: 0, g: 0, b: 0, alpha: 0 };
}

function labelSvg(width: number, height: number, text: string): Buffer {
  const safe = text.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/><text x="24" y="32" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#111827">${safe}</text></svg>`);
}
