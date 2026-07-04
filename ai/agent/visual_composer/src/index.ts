import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { VisualJob } from "./types";

interface CliOptions {
  job?: string;
  request?: string;
  jobId?: string;
  target?: string;
  instruction?: string;
  validate?: boolean;
  buildJob?: boolean;
  revise?: boolean;
  indexAssets?: boolean;
  projectSmoke?: boolean;
  qualityCheck?: boolean;
  contactSheet?: boolean;
  aiSmoke?: boolean;
  stylePackSmoke?: boolean;
  assetSelectionSmoke?: boolean;
  qualitySheet?: boolean;
  layeredSmoke?: boolean;
  layerPackSmoke?: boolean;
  titleLayerSmoke?: boolean;
  referenceFlowSmoke?: boolean;
  placementSmoke?: boolean;
  titlePreprocessSmoke?: boolean;
  referenceProviderCheck?: boolean;
  titleExtractionSmoke?: boolean;
  titleFitSmoke?: boolean;
  aiUsage?: boolean;
  aiUsageReset?: boolean;
  yes?: boolean;
  image?: boolean;
  project?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--job") options.job = argv[index + 1];
    if (arg === "--request") options.request = argv[index + 1];
    if (arg === "--job-id") options.jobId = argv[index + 1];
    if (arg === "--target") options.target = argv[index + 1];
    if (arg === "--instruction") options.instruction = argv[index + 1];
    if (arg === "--validate") options.validate = true;
    if (arg === "--build-job") options.buildJob = true;
    if (arg === "--revise") options.revise = true;
    if (arg === "--index-assets") options.indexAssets = true;
    if (arg === "--project-smoke") options.projectSmoke = true;
    if (arg === "--quality-check") options.qualityCheck = true;
    if (arg === "--contact-sheet") options.contactSheet = true;
    if (arg === "--ai-smoke") options.aiSmoke = true;
    if (arg === "--style-pack-smoke") options.stylePackSmoke = true;
    if (arg === "--asset-selection-smoke") options.assetSelectionSmoke = true;
    if (arg === "--quality-sheet") options.qualitySheet = true;
    if (arg === "--layered-smoke") options.layeredSmoke = true;
    if (arg === "--layer-pack-smoke") options.layerPackSmoke = true;
    if (arg === "--title-layer-smoke") options.titleLayerSmoke = true;
    if (arg === "--reference-flow-smoke") options.referenceFlowSmoke = true;
    if (arg === "--placement-smoke") options.placementSmoke = true;
    if (arg === "--title-preprocess-smoke") options.titlePreprocessSmoke = true;
    if (arg === "--reference-provider-check") options.referenceProviderCheck = true;
    if (arg === "--title-extraction-smoke") options.titleExtractionSmoke = true;
    if (arg === "--title-fit-smoke") options.titleFitSmoke = true;
    if (arg === "--ai-usage") options.aiUsage = true;
    if (arg === "--ai-usage-reset") options.aiUsageReset = true;
    if (arg === "--yes") options.yes = true;
    if (arg === "--image") options.image = true;
    if (arg === "--project") options.project = argv[index + 1];
  }
  return options;
}

async function readJob(jobPath: string): Promise<VisualJob> {
  const composeModule: typeof import("./compose") = await import("./compose");
  const resolved = path.resolve(jobPath);
  const raw = await fs.readFile(resolved, "utf8");
  const job = JSON.parse(raw) as unknown;
  composeModule.validateVisualJob(job);
  return job;
}

async function validateExamples(): Promise<void> {
  const { composeVisualJob, getComposerRoot } = await import("./compose");
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { FileVisualJobStore, createVisualJobRecord, nextOutputVersion } = await import("./store");
  const { reviseVisualJob } = await import("./revision");
  const composerRoot = getComposerRoot();
  const jobsDir = path.join(composerRoot, "examples", "jobs");
  const entries = (await fs.readdir(jobsDir)).filter((entry) => entry.endsWith(".job.json"));
  if (!entries.length) throw new Error(`No example jobs found in ${jobsDir}`);

  const built: string[] = [];
  for (const entry of entries) {
    const jobPath = path.join(jobsDir, entry);
    const job = await readJob(jobPath);
    const result = await composeVisualJob(job);
    built.push(result.output_path);
    if (!result.ok) throw new Error(`Compose failed for ${entry}`);
    const stat = await fs.stat(result.output_path);
    if (!stat.isFile() || stat.size <= 0) throw new Error(`Output file is missing or empty: ${result.output_path}`);
    const warningText = result.warnings.length ? ` warnings=${JSON.stringify(result.warnings)}` : "";
    console.log(`OK ${entry} -> ${result.output_path}${warningText}`);
  }
  const requestsDir = path.join(composerRoot, "examples", "requests");
  const requestEntries = (await fs.readdir(requestsDir))
    .filter((entry) => entry.startsWith("produce-") && entry.endsWith(".request.json"));

  for (const entry of requestEntries) {
    const request = JSON.parse(await fs.readFile(path.join(requestsDir, entry), "utf8")) as Record<string, unknown>;
    const result = await buildVisualJobFromCommand({
      command_text: String(request.command_text || ""),
      project_key: typeof request.project_key === "string" ? request.project_key as never : "",
      visual_mode: typeof request.visual_mode === "string" ? request.visual_mode as never : "",
      output_format: typeof request.output_format === "string" ? request.output_format as never : "",
      uploaded_assets: Array.isArray(request.uploaded_assets) ? request.uploaded_assets as never : [],
      options: {
        enable_ai: false,
        layout_variant: "auto",
      },
    });
    const composeResult = await composeVisualJob(result.visual_job);
    built.push(composeResult.output_path);
    console.log(`OK ${entry} -> ${composeResult.output_path} detected=${JSON.stringify(result.detected)}`);
  }

  const firstRequest = JSON.parse(await fs.readFile(path.join(requestsDir, "produce-monopoly.request.json"), "utf8")) as Record<string, unknown>;
  const firstBuild = await buildVisualJobFromCommand({ command_text: String(firstRequest.command_text || ""), options: { enable_ai: false } });
  const firstCompose = await composeVisualJob(firstBuild.visual_job);
  const store = new FileVisualJobStore(path.join(composerRoot, "examples", "outputs", "jobs", "validate-store"));
  const record = createVisualJobRecord({
    job_id: `validate-${Date.now()}`,
    command_text: String(firstRequest.command_text || ""),
    detected: firstBuild.detected,
    visual_job: firstBuild.visual_job,
    output: {
      version: 1,
      output_path: firstCompose.output_path,
      output_url: "/generated/visual/validate.png",
      width: firstCompose.width,
      height: firstCompose.height,
      created_at: new Date().toISOString(),
    },
  });
  await store.save({ record });
  const textRevision = await reviseVisualJob({ visual_job: record.visual_job, target: "text", instruction: "поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ" });
  const version2 = nextOutputVersion(record);
  if (version2 !== 2) throw new Error("Expected revision version 2.");
  if (textRevision.visual_job.illustration_layer?.asset_path !== record.visual_job.illustration_layer?.asset_path) {
    throw new Error("Text revision changed illustration layer.");
  }
  const layoutRevision = await reviseVisualJob({ visual_job: textRevision.visual_job, target: "layout", instruction: "сделай другую композицию" });
  if (layoutRevision.visual_job.layout.variant === textRevision.visual_job.layout.variant) {
    throw new Error("Layout revision did not change layout variant.");
  }
  console.log("OK store/revision validation -> version 2 text, version 3 layout");

  console.log(`Validated ${built.length} visual composer jobs/requests.`);
}

async function buildJobFromRequest(requestPath: string): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { getComposerRoot } = await import("./compose");
  const { safeFilename } = await import("./utils/safeFilename");
  const body = JSON.parse(await fs.readFile(path.resolve(requestPath), "utf8")) as Record<string, unknown>;
  const result = await buildVisualJobFromCommand({
    command_text: String(body.command_text || ""),
    project_key: typeof body.project_key === "string" ? body.project_key as never : "",
    visual_mode: typeof body.visual_mode === "string" ? body.visual_mode as never : "",
    output_format: typeof body.output_format === "string" ? body.output_format as never : "",
    uploaded_assets: Array.isArray(body.uploaded_assets) ? body.uploaded_assets as never : [],
    options: {
      enable_ai: Boolean((body.options as { enable_ai?: boolean } | undefined)?.enable_ai),
      layout_variant: String((body.options as { layout_variant?: string } | undefined)?.layout_variant || "auto"),
    },
  });
  const jobsDir = path.join(getComposerRoot(), "examples", "outputs", "jobs");
  await fs.mkdir(jobsDir, { recursive: true });
  const outputPath = path.join(
    jobsDir,
    `${safeFilename(result.detected.project_key)}.${safeFilename(result.detected.visual_mode)}.${Date.now()}.built-job.json`,
  );
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(outputPath);
}

async function reviseStoredJob(options: CliOptions): Promise<void> {
  if (!options.jobId || !options.target || !options.instruction) {
    throw new Error("Usage: npm run visual:revise -- --job-id <job_id> --target text --instruction \"...\"");
  }
  const { FileVisualJobStore, nextOutputVersion } = await import("./store");
  const { reviseVisualJob } = await import("./revision");
  const { composeVisualJob } = await import("./compose");
  const store = new FileVisualJobStore();
  const record = await store.get(options.jobId);
  if (!record) throw new Error(`Visual job not found: ${options.jobId}`);
  const version = nextOutputVersion(record);
  const revision = await reviseVisualJob({
    visual_job: record.visual_job,
    target: options.target as never,
    instruction: options.instruction,
  });
  const outputPath = path.join(process.cwd(), "public", "generated", "visual", `${Date.now()}-${options.jobId}-v${version}-${options.target}.png`);
  const composed = await composeVisualJob({ ...revision.visual_job, output_path: outputPath });
  const now = new Date().toISOString();
  record.visual_job = { ...revision.visual_job, output_path: outputPath };
  record.outputs.push({
    version,
    output_path: composed.output_path,
    output_url: `/generated/visual/${path.basename(outputPath)}`,
    width: composed.width,
    height: composed.height,
    created_at: now,
  });
  record.history.push({ type: "revised", message: `${options.target}: ${options.instruction}`, created_at: now });
  await store.update(record);
  console.log(JSON.stringify({ ok: true, job_id: options.jobId, version, output_path: composed.output_path, output_url: `/generated/visual/${path.basename(outputPath)}` }, null, 2));
}

async function indexAssets(): Promise<void> {
  const { indexVisualAssets } = await import("./assets/indexAssets");
  const manifest = await indexVisualAssets();
  const outputPath = path.join(process.cwd(), "ai", "agent", "visual_assets", "manifest.local.json");
  await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(outputPath);
}

async function runProjectSmoke(): Promise<void> {
  const { produceVisualFromCommand } = await import("./production");
  const { safeFilename } = await import("./utils/safeFilename");
  const { getComposerRoot } = await import("./compose");
  const outputDir = path.join(getComposerRoot(), "examples", "outputs", "project-smoke");
  const { loadDefaultAssetManifest } = await import("./assets/assetResolver");
  const manifest = loadDefaultAssetManifest();
  await fs.mkdir(outputDir, { recursive: true });
  const scenarios = [
    { name: "monopoly story acquaintance", command_text: "сделай новую картинку для монополии история знакомства" },
    { name: "monopoly_pay yandex-yandex", command_text: "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс" },
    { name: "casper contest", command_text: "сделай новую задачу для каспера конкурс на 3000 пользователей" },
    { name: "gorilla hockey training", command_text: "задача для хоккея набор детей на тренировку" },
    { name: "gorilla hockey print A4", command_text: "хоккей печать A4 набор детей 2016-2018" },
    {
      name: "hockey with placeholder uploaded photo",
      command_text: "сделай хоккейную афишу набор детей",
      uploaded_assets: [{ type: "photo" as const, asset_path: "", id: "placeholder-photo" }],
    },
  ];
  const normalizedScenarios = scenarios.map((scenario) => ({
    ...scenario,
    command_text: smokeCommandByName[scenario.name] || scenario.command_text,
  }));
  for (const scenario of normalizedScenarios) {
    const result = await produceVisualFromCommand({
      command_text: scenario.command_text,
      uploaded_assets: scenario.uploaded_assets || [],
      options: { enable_ai: false },
    });
    const copiedPath = path.join(outputDir, `${safeFilename(scenario.name)}.${result.detected.project_key}.${result.detected.visual_mode}.png`);
    await fs.copyFile(result.output_path, copiedPath);
    console.log(`OK ${scenario.name} -> ${result.detected.project_key}/${result.detected.visual_mode} ${copiedPath}`);
  }
}

const smokeCommandByName: Record<string, string> = {
  "monopoly story acquaintance": "сделай новую картинку для монополии история знакомства",
  "monopoly_pay yandex-yandex": "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс",
  "casper contest": "сделай новую задачу для каспера конкурс на 3000 пользователей",
  "gorilla hockey training": "задача для хоккея набор детей на тренировку",
  "gorilla hockey print A4": "хоккей печать A4 набор детей 2016-2018",
  "hockey with placeholder uploaded photo": "сделай хоккейную афишу набор детей",
};

async function runContactSheet(): Promise<void> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const { getComposerRoot } = await import("./compose");
  const { loadDefaultAssetManifest } = await import("./assets/assetResolver");
  const manifest = loadDefaultAssetManifest();
  const outputDir = path.join(getComposerRoot(), "examples", "outputs", "project-smoke");
  const entries = (await fs.readdir(outputDir).catch(() => []))
    .filter((entry) => entry.endsWith(".png") && entry !== "contact-sheet.png")
    .sort();
  if (!entries.length) throw new Error(`No project-smoke PNG outputs found in ${outputDir}. Run npm run visual:project-smoke first.`);
  const thumbWidth = 360;
  const thumbHeight = 450;
  const gap = 24;
  const columns = 3;
  const rows = Math.ceil(entries.length / columns);
  const width = columns * thumbWidth + (columns + 1) * gap;
  const height = rows * thumbHeight + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < entries.length; index += 1) {
    const filePath = path.join(outputDir, entries[index]);
    const left = gap + (index % columns) * (thumbWidth + gap);
    const top = gap + Math.floor(index / columns) * (thumbHeight + gap);
    const parts = entries[index].replace(/\.png$/, "").split(".");
    const project = parts[1] || "project";
    const hasBackground = manifest.assets.some((asset) => asset.project_key === project && asset.type === "background");
    const hasCharacter = manifest.assets.some((asset) => asset.project_key === project && asset.type === "character");
    const hasLogo = manifest.assets.some((asset) => asset.project_key === project && asset.type === "logo");
    const label = `${project} / ${parts[2] || "mode"} / bg:${hasBackground ? "asset" : "fallback"} char:${hasCharacter ? "asset" : "fallback"} logo:${hasLogo ? "asset" : "fallback"}`;
    composites.push({
      input: await sharp(filePath)
        .resize(thumbWidth, thumbHeight, { fit: "contain", background: "#101820" })
        .composite([{ input: Buffer.from(`<svg width="${thumbWidth}" height="56" xmlns="http://www.w3.org/2000/svg"><rect width="${thumbWidth}" height="56" fill="#000000" opacity="0.72"/><text x="14" y="24" font-family="Arial" font-size="18" font-weight="800" fill="#ffffff">${escapeXml(label)}</text><text x="14" y="46" font-family="Arial" font-size="14" fill="#A7F3D0">${escapeXml(parts[0] || entries[index])}</text></svg>`), left: 0, top: thumbHeight - 56 }])
        .png()
        .toBuffer(),
      left,
      top,
    });
  }
  const outputPath = path.join(outputDir, "contact-sheet.png");
  await sharp({ create: { width, height, channels: 4, background: "#0B1117" } }).composite(composites).png().toFile(outputPath);
  console.log(outputPath);
}

async function runQualitySheet(): Promise<void> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob, getComposerRoot } = await import("./compose");
  const { safeFilename } = await import("./utils/safeFilename");
  const outputDir = path.join(getComposerRoot(), "examples", "outputs", "quality-sheet");
  await fs.mkdir(outputDir, { recursive: true });
  const scenarios = [
    { project: "monopoly", title: "ИСТОРИЯ ЗНАКОМСТВА", command_text: "сделай новую картинку для монополии история знакомства", variants: ["monopoly_banner_like_reference", "monopoly_hero_title_left_character_right"] },
    { project: "monopoly", title: "РЕЗУЛЬТАТЫ КОНКУРСА", command_text: "сделай новую картинку для монополии результаты конкурса", variants: ["monopoly_big_title_center_character_right"] },
    { project: "monopoly_pay", title: "ЯНДЕКС-ЯНДЕКС", command_text: "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс", variants: ["pay_method_title_center_character_right"] },
    { project: "monopoly_pay", title: "НОВЫЕ ТРИГГЕРЫ БАНКОВ", command_text: "сделай новую картинку для пэй новые триггеры банков", variants: ["pay_alert_title_big_icons_bottom"] },
    { project: "casper", title: "КОНКУРС НА 3000", command_text: "для каспера конкурс на 3000 пользователей", variants: ["casper_contest_square"] },
    { project: "gorilla_hockey", title: "ТРЕНИРОВКА ЗАВТРА", command_text: "завтра тренировка для детей", variants: ["hockey_training_recruitment"] },
  ];
  const entries: Array<{ filePath: string; label: string; warnings: number }> = [];
  for (const scenario of scenarios) {
    for (const variant of scenario.variants) {
      const built = await buildVisualJobFromCommand({
        command_text: scenario.command_text,
        options: { enable_ai: false, layout_variant: variant },
      });
      const outputPath = path.join(outputDir, `${safeFilename(scenario.project)}.${safeFilename(variant)}.${safeFilename(scenario.title)}.png`);
      const composed = await composeVisualJob({ ...built.visual_job, output_path: outputPath });
      const usage = composed.warnings.find((warning) => warning.startsWith("composer_usage")) || "";
      const background = usage.includes("background=asset") ? "asset" : "fallback";
      const character = usage.includes("character=asset") ? "asset" : usage.includes("character=illustration_asset") ? "asset" : "fallback";
      const title = usage.includes("title=asset") ? "asset" : "fallback";
      const preset = composed.warnings.find((warning) => warning.startsWith("placement_preset="))?.replace("placement_preset=", "") || variant;
      const extracted = built.visual_job.title_extraction?.normalized_title || built.visual_job.text_layer?.text || scenario.title;
      const titleFitWarnings = composed.warnings.filter((warning) => warning.startsWith("title_")).length;
      entries.push({ filePath: outputPath, label: `${scenario.project} / ${preset} / ${composed.width}x${composed.height} / ${extracted} / title:${title} fit:${titleFitWarnings}`, warnings: composed.warnings.filter((warning) => warning.includes("quality_warning") || warning.includes("_too_small") || warning.includes("_missing")).length });
    }
  }
  const thumbWidth = 360;
  const thumbHeight = 450;
  const gap = 24;
  const columns = 3;
  const rows = Math.ceil(entries.length / columns);
  const width = columns * thumbWidth + (columns + 1) * gap;
  const height = rows * thumbHeight + (rows + 1) * gap;
  const composites = [];
  for (let index = 0; index < entries.length; index += 1) {
    const left = gap + (index % columns) * (thumbWidth + gap);
    const top = gap + Math.floor(index / columns) * (thumbHeight + gap);
    const label = `${entries[index].label} / warn:${entries[index].warnings}`;
    composites.push({
      input: await sharp(entries[index].filePath)
        .resize(thumbWidth, thumbHeight, { fit: "contain", background: "#101820" })
        .composite([{ input: Buffer.from(`<svg width="${thumbWidth}" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="${thumbWidth}" height="64" fill="#000000" opacity="0.76"/><text x="12" y="24" font-family="Arial" font-size="15" font-weight="800" fill="#ffffff">${escapeXml(label.slice(0, 54))}</text><text x="12" y="48" font-family="Arial" font-size="13" fill="#A7F3D0">${escapeXml(label.slice(54, 108))}</text></svg>`), left: 0, top: thumbHeight - 64 }])
        .png()
        .toBuffer(),
      left,
      top,
    });
  }
  const sheetPath = path.join(outputDir, "contact-sheet.png");
  await sharp({ create: { width, height, channels: 4, background: "#0B1117" } }).composite(composites).png().toFile(sheetPath);
  console.log(sheetPath);
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[char] || char);
}

async function runAiSmoke(options: CliOptions): Promise<void> {
  if (process.env.VISUAL_BOT_ENABLE_AI !== "true") {
    console.log("AI smoke skipped: VISUAL_BOT_ENABLE_AI is not true.");
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log("AI smoke skipped: OPENAI_API_KEY is missing.");
    return;
  }
  const { getVisualAiProvider } = await import("./ai");
  const { loadProjectProfile } = await import("./profiles/profileLoader");
  const project = (options.project || "monopoly") as import("./types").VisualProjectKey;
  const profile = loadProjectProfile(project);
  const provider = getVisualAiProvider(true);
  const input = {
    command_text: "AI smoke test: новая промо картинка без текста внутри изображения",
    project_key: project,
    visual_mode: project === "casper" ? "style_generation" as const : project === "gorilla_hockey" ? "hockey_generated_poster" as const : "composer" as const,
    profile,
    enable_ai: true,
  };
  const text = await provider.generateTextLayer(input);
  console.log(JSON.stringify({ ok: true, type: "text", title: text.text, post_caption: text.post_caption, warnings: text.warnings || [] }, null, 2));
  if (options.image) {
    const image = await provider.generateIllustrationLayer(input);
    console.log(JSON.stringify({ ok: true, type: "image", asset_path: image.asset_path, model: image.model, warnings: image.warnings || [] }, null, 2));
  } else {
    console.log("Image generation skipped. Run with: npm run visual:ai-smoke -- --image --project monopoly");
  }
}

async function runStylePackSmoke(): Promise<void> {
  const { loadDefaultAssetManifest } = await import("./assets/assetResolver");
  const manifest = loadDefaultAssetManifest();
  const projects = ["monopoly", "monopoly_pay", "casper", "gorilla_hockey"];
  for (const project of projects) {
    const assets = manifest.assets.filter((asset) => asset.project_key === project);
    const count = (type: string) => assets.filter((asset) => asset.type === type).length;
    const locked = assets.filter((asset) => asset.lock_policy === "locked");
    const required = project === "monopoly"
      ? assets.find((asset) => asset.type === "character" && asset.role === "main_character" && asset.lock_policy === "locked")
      : project === "gorilla_hockey"
        ? assets.find((asset) => asset.type === "logo" && asset.lock_policy === "locked")
        : assets.find((asset) => asset.type === "logo" && asset.lock_policy === "locked") || assets.find((asset) => asset.type === "reference");
    console.log([
      `PROJECT ${project}`,
      `  required_locked: ${required ? `found ${required.path}` : "missing"}`,
      `  backgrounds=${count("background")} characters=${count("character")} references=${count("reference")} logos=${count("logo")} templates=${count("template")}`,
      `  safe=${assets.filter((asset) => asset.safe_for_auto_use).length} locked=${locked.length}`,
    ].join("\n"));
  }
}

async function runQualityCheck(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const { qualityCheckVisual } = await import("./quality");
  {
    const result = await buildVisualJobFromCommand({ command_text: "задача для хоккея набор детей на тренировку", options: { enable_ai: false } });
    const composed = await composeVisualJob(result.visual_job);
    const quality = qualityCheckVisual({ visual_job: result.visual_job, compose_result: composed, expected: result.detected });
    if (!quality.ok) throw new Error(`Quality check failed: ${quality.critical.join("; ")}`);
    console.log(JSON.stringify({ ok: true, warnings: quality.warnings, output_path: composed.output_path }, null, 2));
    return;
  }
  const result = await buildVisualJobFromCommand({ command_text: "задача для хоккея набор детей на тренировку", options: { enable_ai: false } });
  const composed = await composeVisualJob(result.visual_job);
  const quality = qualityCheckVisual({ visual_job: result.visual_job, compose_result: composed, expected: result.detected });
  if (!quality.ok) throw new Error(`Quality check failed: ${quality.critical.join("; ")}`);
  console.log(JSON.stringify({ ok: true, warnings: quality.warnings, output_path: composed.output_path }, null, 2));
}

async function runAssetSelectionSmoke(): Promise<void> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const root = path.join(process.cwd(), ".storage", "visual_asset_selection_smoke");
  await fs.mkdir(root, { recursive: true });

  async function asset(fileName: string, color: string): Promise<string> {
    const filePath = path.join(root, fileName);
    await sharp({ create: { width: 320, height: 320, channels: 4, background: color } }).png().toFile(filePath);
    return filePath;
  }

  const monopolyCharacter = await asset("monopoly-ded.png", "#f6c453");
  const monopolyBackground = await asset("monopoly-bg.png", "#f97316");
  const monopolyReference = await asset("monopoly-ref.png", "#facc15");
  const payLogo = await asset("pay-logo.png", "#18d47b");
  const payCharacter = await asset("pay-character.png", "#38bdf8");
  const payBackground = await asset("pay-bg.png", "#0f172a");
  const payIcon = await asset("pay-icon.png", "#006dff");
  const manifest = {
    version: "asset-selection-smoke",
    assets: [
      fakeAsset("monopoly-character", "monopoly", "character", monopolyCharacter, "main_character", "locked", ["ded", "main"], 100),
      fakeAsset("monopoly-background", "monopoly", "background", monopolyBackground, "background", "replaceable", ["orange", "promo", "contest"], 50),
      fakeAsset("monopoly-reference", "monopoly", "reference", monopolyReference, "style_reference", "reference_only", ["promo", "style"], 20),
      fakeAsset("pay-logo", "monopoly_pay", "logo", payLogo, "brand_logo", "locked", ["main", "pay"], 100),
      fakeAsset("pay-character", "monopoly_pay", "character", payCharacter, "main_character", "locked", ["main", "pay"], 100),
      fakeAsset("pay-background", "monopoly_pay", "background", payBackground, "background", "replaceable", ["pay", "fintech"], 50),
      fakeAsset("pay-icon", "monopoly_pay", "icon", payIcon, undefined, "optional", ["bank", "card", "pay"], 20),
    ],
  } as const;

  const monopoly = await buildVisualJobFromCommand({
    command_text: "сделай новую картинку для монополии история знакомства",
    asset_manifest: manifest as never,
    options: { enable_ai: false },
  });
  assertEqual(monopoly.visual_job.illustration_layer?.asset_path, monopolyCharacter, "Monopoly character selected");
  assertEqual(monopoly.visual_job.background_layer?.asset_path, monopolyBackground, "Monopoly background selected");
  assertEqual(monopoly.visual_job.style_assets?.reference, monopolyReference, "Monopoly reference selected");
  const monopolyCompose = await composeVisualJob(monopoly.visual_job);
  assertIncludes(monopolyCompose.warnings.join("; "), "composer_usage background=asset character=asset", "Monopoly composer used background/character assets");

  const pay = await buildVisualJobFromCommand({
    command_text: "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс",
    asset_manifest: manifest as never,
    options: { enable_ai: false },
  });
  assertEqual(pay.visual_job.brand?.logo_path, payLogo, "Pay logo selected");
  assertEqual(pay.visual_job.illustration_layer?.asset_path, payCharacter, "Pay character selected");
  assertEqual(pay.visual_job.background_layer?.asset_path, payBackground, "Pay background selected");
  assertEqual(pay.visual_job.style_assets?.icon, payIcon, "Pay icon selected");
  const payCompose = await composeVisualJob(pay.visual_job);
  assertIncludes(payCompose.warnings.join("; "), "composer_usage background=asset character=asset title=composer_fallback logo=asset icon=asset", "Pay composer used assets");

  console.log([
    "ASSET SELECTION SMOKE OK",
    `Monopoly background: ${monopoly.visual_job.background_layer?.asset_path}`,
    `Monopoly character: ${monopoly.visual_job.illustration_layer?.asset_path}`,
    `Monopoly reference: ${monopoly.visual_job.style_assets?.reference}`,
    `Pay logo: ${pay.visual_job.brand?.logo_path}`,
    `Pay character: ${pay.visual_job.illustration_layer?.asset_path}`,
    `Pay background: ${pay.visual_job.background_layer?.asset_path}`,
    `Pay icon: ${pay.visual_job.style_assets?.icon}`,
  ].join("\n"));
}

async function createLayeredSmokeManifest(root: string) {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  await fs.mkdir(root, { recursive: true });
  async function asset(fileName: string, color: string): Promise<string> {
    const filePath = path.join(root, fileName);
    await sharp({ create: { width: 480, height: 480, channels: 4, background: color } }).png().toFile(filePath);
    return filePath;
  }
  return {
    version: "layered-smoke",
    assets: [
      fakeAsset("monopoly-character", "monopoly", "character", await asset("monopoly-ded.png", "#f6c453"), "main_character", "locked", ["ded", "main"], 100),
      fakeAsset("monopoly-background", "monopoly", "background", await asset("monopoly-bg.png", "#f97316"), "background", "replaceable", ["wide", "promo"], 50),
      fakeAsset("monopoly-title", "monopoly", "reference", await asset("monopoly-ref.png", "#facc15"), "style_reference", "reference_only", ["promo", "style"], 20),
      fakeAsset("monopoly-title-style", "monopoly", "reference", await asset("monopoly-title-ref.png", "#fbbf24"), "title_style_reference", "reference_only", ["title", "text", "3d"], 30),
      fakeAsset("pay-logo", "monopoly_pay", "logo", await asset("pay-logo.png", "#18d47b"), "brand_logo", "locked", ["main", "pay"], 100),
      fakeAsset("pay-character", "monopoly_pay", "character", await asset("pay-character.png", "#38bdf8"), "main_character", "locked", ["main", "pay"], 100),
      fakeAsset("pay-background", "monopoly_pay", "background", await asset("pay-bg.png", "#0f172a"), "background", "replaceable", ["wide", "pay"], 50),
      fakeAsset("pay-title-style", "monopoly_pay", "reference", await asset("pay-title-ref.png", "#0ea5e9"), "title_style_reference", "reference_only", ["title", "text", "3d", "pay"], 30),
    ],
  };
}

async function runLayeredSmoke(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const manifest = await createLayeredSmokeManifest(path.join(process.cwd(), ".storage", "visual_layered_smoke"));
  const monopoly = await buildVisualJobFromCommand({ command_text: "сделай 1920x1080 картинку для монополии история знакомства", asset_manifest: manifest as never, options: { enable_ai: false } });
  if (monopoly.visual_job.layout.width !== 1920 || monopoly.visual_job.layout.height !== 1080) throw new Error("Monopoly layered smoke expected 1920x1080.");
  if (!monopoly.visual_job.character_layer?.asset_path || !monopoly.visual_job.background_layer?.asset_path) throw new Error("Monopoly layered smoke missing background/character layer.");
  if (!monopoly.visual_job.title_image_layer?.enabled) throw new Error("Monopoly title_image_layer missing.");
  const monopolyOut = await composeVisualJob(monopoly.visual_job);
  if (monopolyOut.width !== 1920 || monopolyOut.height !== 1080) throw new Error("Monopoly final output expected 1920x1080.");

  const pay = await buildVisualJobFromCommand({ command_text: "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс", asset_manifest: manifest as never, options: { enable_ai: false } });
  const payOut = await composeVisualJob(pay.visual_job);
  if (payOut.width !== 1920 || payOut.height !== 1080) throw new Error("Pay final output expected 1920x1080.");
  if (!pay.visual_job.character_layer?.asset_path || !pay.visual_job.logo_layer?.asset_path) throw new Error("Pay layered smoke missing character/logo layer.");

  const hockey = await buildVisualJobFromCommand({ command_text: "задача для хоккея набор детей", options: { enable_ai: false } });
  if (hockey.visual_job.layout.width !== 1024 || hockey.visual_job.layout.height !== 1024) throw new Error(`Hockey default expected 1024x1024, got ${hockey.visual_job.layout.width}x${hockey.visual_job.layout.height}.`);
  console.log(JSON.stringify({ ok: true, monopoly: `${monopolyOut.width}x${monopolyOut.height}`, pay: `${payOut.width}x${payOut.height}`, hockey: `${hockey.visual_job.layout.width}x${hockey.visual_job.layout.height}` }, null, 2));
}

async function runLayerPackSmoke(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const { exportLayerPack } = await import("./layerPack/exportLayerPack");
  const manifest = await createLayeredSmokeManifest(path.join(process.cwd(), ".storage", "visual_layer_pack_smoke"));
  const built = await buildVisualJobFromCommand({ command_text: "сделай картинку для монополии история знакомства", asset_manifest: manifest as never, options: { enable_ai: false } });
  const composed = await composeVisualJob(built.visual_job);
  const pack = await exportLayerPack({ job_id: "layer-pack-smoke", visual_job: built.visual_job, final_output_path: composed.output_path, manifest });
  const finalExists = await fs.stat(path.join(pack.folder_path, "final.png")).then((stat) => stat.isFile()).catch(() => false);
  const jobExists = await fs.stat(path.join(pack.folder_path, "visual_job.json")).then((stat) => stat.isFile()).catch(() => false);
  const titleExists = await fs.stat(path.join(pack.folder_path, "title.png")).then((stat) => stat.isFile()).catch(() => false);
  const promptLogExists = await fs.stat(path.join(pack.folder_path, "prompt_log.txt")).then((stat) => stat.isFile()).catch(() => false);
  const placementExists = await fs.stat(path.join(pack.folder_path, "placement.json")).then((stat) => stat.isFile()).catch(() => false);
  const zipExists = await fs.stat(pack.zip_path).then((stat) => stat.isFile() && stat.size > 0).catch(() => false);
  if (!finalExists || !jobExists || !titleExists || !promptLogExists || !placementExists || !zipExists) throw new Error("Layer pack smoke missing final.png, title.png, prompt_log.txt, placement.json, visual_job.json or zip.");
  console.log(JSON.stringify({ ok: true, folder_path: pack.folder_path, zip_path: pack.zip_path }, null, 2));
}

async function runTitleLayerSmoke(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const { exportLayerPack } = await import("./layerPack/exportLayerPack");
  const manifest = await createLayeredSmokeManifest(path.join(process.cwd(), ".storage", "visual_title_layer_smoke"));
  const built = await buildVisualJobFromCommand({ command_text: "сделай новую картинку для монополии результаты конкурса 1920x1080", asset_manifest: manifest as never, options: { enable_ai: false } });
  if (!built.visual_job.title_image_layer?.enabled) throw new Error("title_image_layer missing.");
  if (built.visual_job.title_image_layer.source !== "composer_fallback") throw new Error(`Expected composer_fallback title source, got ${built.visual_job.title_image_layer.source || "-"}.`);
  const composed = await composeVisualJob(built.visual_job);
  if (composed.width !== 1920 || composed.height !== 1080) throw new Error("Title layer smoke expected final 1920x1080.");
  const pack = await exportLayerPack({ job_id: "title-layer-smoke", visual_job: built.visual_job, final_output_path: composed.output_path, manifest });
  const titleExists = await fs.stat(path.join(pack.folder_path, "title.png")).then((stat) => stat.isFile() && stat.size > 0).catch(() => false);
  if (!titleExists) throw new Error("Title layer smoke expected title.png in layer pack.");
  console.log(JSON.stringify({ ok: true, title_source: built.visual_job.title_image_layer.source, output: `${composed.width}x${composed.height}`, layer_pack: pack.zip_path }, null, 2));
}

async function runReferenceFlowSmoke(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const { createVisualJobRecord, FileVisualJobStore } = await import("./store");
  const { reviseProducedVisual } = await import("./production/reviseVisual");
  const manifest = await createLayeredSmokeManifest(path.join(process.cwd(), ".storage", "visual_reference_flow_smoke"));
  const built = await buildVisualJobFromCommand({ command_text: "сделай новую картинку для монополии история знакомства", asset_manifest: manifest as never, options: { enable_ai: false } });
  const composed = await composeVisualJob(built.visual_job);
  const store = new FileVisualJobStore();
  const record = createVisualJobRecord({
    job_id: "reference-flow-smoke",
    command_text: "сделай новую картинку для монополии история знакомства",
    detected: built.detected,
    visual_job: { ...built.visual_job, output_path: composed.output_path },
    output: { version: 1, output_path: composed.output_path, output_url: "/generated/visual/reference-flow-smoke.png", width: composed.width, height: composed.height, created_at: new Date().toISOString() },
  });
  await store.save({ record });
  const revised = await reviseProducedVisual({ job_id: "reference-flow-smoke", target: "character", instruction: "дед держит кубок", options: { enable_ai: true } });
  const warningText = revised.warnings.join("; ");
  assertIncludes(warningText, "image reference/edit not available", "Reference flow smoke expected provider capability warning");
  if (revised.visual_job.character_layer?.asset_path !== built.visual_job.character_layer?.asset_path) throw new Error("Reference flow smoke changed locked character asset unexpectedly.");
  console.log(JSON.stringify({ ok: true, warning: "image reference/edit not available", character_preserved: true }, null, 2));
}

async function runPlacementSmoke(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { reviseVisualJob } = await import("./revision");
  const { composeVisualJob } = await import("./compose");
  const manifest = await createLayeredSmokeManifest(path.join(process.cwd(), ".storage", "visual_placement_smoke"));
  const built = await buildVisualJobFromCommand({ command_text: "сделай новую картинку для монополии история знакомства 1920x1080", asset_manifest: manifest as never, options: { enable_ai: false } });
  const titleMoved = await reviseVisualJob({ visual_job: built.visual_job, target: "text", instruction: "увеличь текст" });
  assertIncludes(titleMoved.warnings.join("; "), "title placement updated", "Title placement command");
  const characterMoved = await reviseVisualJob({ visual_job: titleMoved.visual_job, target: "character", instruction: "увеличь деда" });
  assertIncludes(characterMoved.warnings.join("; "), "character placement updated", "Character placement command");
  const layoutMoved = await reviseVisualJob({ visual_job: characterMoved.visual_job, target: "layout", instruction: "дед справа, текст слева как в примере" });
  assertEqual(layoutMoved.visual_job.layout.variant, "monopoly_banner_like_reference", "Composition preset mapping");
  const composed = await composeVisualJob(layoutMoved.visual_job);
  assertIncludes(composed.warnings.join("; "), "placement_preset=monopoly_banner_like_reference", "Composer placement preset warning");
  console.log(JSON.stringify({ ok: true, preset: layoutMoved.visual_job.layout.variant, output: `${composed.width}x${composed.height}` }, null, 2));
}

async function runTitlePreprocessSmoke(): Promise<void> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const { preprocessTitleImage, renderBrandTitleImage } = await import("./titleImage/renderBrandTitleImage");
  const raw = await sharp({ create: { width: 1000, height: 320, channels: 4, background: "#00000000" } })
    .composite([{ input: await renderBrandTitleImage({ text: "РЕЗУЛЬТАТЫ КОНКУРСА", project_key: "monopoly", width: 760, height: 210 }), left: 120, top: 50 }])
    .png()
    .toBuffer();
  const processed = await preprocessTitleImage(raw, { width: 1200, height: 360 }, true);
  if (!processed.buffer.length) throw new Error("Title preprocess returned empty buffer.");
  if (!processed.warnings.includes("title_image_trimmed")) throw new Error(`Expected title_image_trimmed warning, got ${processed.warnings.join(",")}`);
  console.log(JSON.stringify({ ok: true, warnings: processed.warnings, transparent: processed.metadata.transparent }, null, 2));
}

async function runReferenceProviderCheck(): Promise<void> {
  const { describeOpenAiImageCapabilities } = await import("./ai/openaiProvider");
  console.log(JSON.stringify(describeOpenAiImageCapabilities(), null, 2));
}

async function runTitleExtractionSmoke(): Promise<void> {
  const { extractTitleForProject } = await import("./jobBuilder/titleExtractor");
  const cases = [
    ["monopoly", "сделай новую картинку для монополии история знакомства", "ИСТОРИЯ ЗНАКОМСТВА"],
    ["monopoly", "для монополии результаты конкурса", "РЕЗУЛЬТАТЫ КОНКУРСА"],
    ["monopoly", "монополия новый конкурс", "НОВЫЙ КОНКУРС"],
    ["monopoly", "монополия 2000 пользователей", "2000 ПОЛЬЗОВАТЕЛЕЙ"],
    ["monopoly_pay", "для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс", "ЯНДЕКС-ЯНДЕКС"],
    ["monopoly_pay", "сделай новую картинку для пэй новые триггеры банков", "НОВЫЕ ТРИГГЕРЫ БАНКОВ"],
    ["monopoly_pay", "оплата по ссылке", "ОПЛАТА ПО ССЫЛКЕ"],
    ["casper", "для каспера конкурс на 3000 пользователей", "КОНКУРС НА 3000"],
    ["gorilla_hockey", "завтра тренировка для детей", "ТРЕНИРОВКА ЗАВТРА"],
  ] as const;
  for (const [project, command, expected] of cases) {
    const result = extractTitleForProject(command, project as never);
    assertEqual(result.normalized_title, expected, `Title extraction ${command}`);
  }
  console.log(JSON.stringify({ ok: true, cases: cases.length }, null, 2));
}

async function runTitleFitSmoke(): Promise<void> {
  const { renderBrandTitleImageLayer, preprocessTitleImage } = await import("./titleImage/renderBrandTitleImage");
  const titles = ["ИСТОРИЯ ЗНАКОМСТВА", "РЕЗУЛЬТАТЫ КОНКУРСА", "НОВЫЕ ТРИГГЕРЫ БАНКОВ", "ЯНДЕКС-ЯНДЕКС"];
  for (const title of titles) {
    const rendered = await renderBrandTitleImageLayer({ text: title, project_key: title.includes("ТРИГГЕР") || title.includes("ЯНДЕКС") ? "monopoly_pay" : "monopoly", width: 1280, height: 420, maxLines: 2 });
    if (!rendered.buffer.length) throw new Error(`Empty title render for ${title}`);
    if (rendered.metadata.final_font_size < 36) throw new Error(`Title font too small for ${title}`);
    const processed = await preprocessTitleImage(rendered.buffer, { width: 1280, height: 420 }, true);
    if (processed.warnings.includes("title_fit_failed")) throw new Error(`Title fit failed for ${title}`);
  }
  console.log(JSON.stringify({ ok: true, titles: titles.length }, null, 2));
}

function fakeAsset(
  id: string,
  projectKey: string,
  type: string,
  filePath: string,
  role: string | undefined,
  lockPolicy: string,
  tags: string[],
  priority: number,
) {
  return {
    id,
    project_key: projectKey,
    type,
    role,
    path: filePath,
    tags,
    usage: type,
    description: "Safe generated smoke fixture",
    safe_for_auto_use: true,
    priority,
    lock_policy: lockPolicy,
    recommended_modes: [],
    created_at: new Date().toISOString(),
  };
}

function assertEqual(actual: string | undefined, expected: string, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual || "-"}`);
}

function assertIncludes(actual: string, expected: string, message: string): void {
  if (!actual.includes(expected)) throw new Error(`${message}: expected to include "${expected}", got "${actual}"`);
}

async function runAiUsage(options: CliOptions): Promise<void> {
  const { getUsageSummary, resetLocalUsageForToday } = await import("./ai/usageGuard");
  if (options.aiUsageReset) {
    if (!options.yes) throw new Error("Usage reset is local-dev only. Re-run with: npm run visual:ai-usage:reset -- --yes");
    await resetLocalUsageForToday();
    console.log("Local AI usage for today reset.");
  }
  const usage = await getUsageSummary();
  console.log(JSON.stringify(usage, null, 2));
}

async function main(): Promise<void> {
  const composerRoot = path.resolve(__dirname, "..");
  const cacheRoot = path.join(composerRoot, ".cache");
  fsSync.mkdirSync(cacheRoot, { recursive: true });
  process.env.XDG_CACHE_HOME = process.env.XDG_CACHE_HOME || cacheRoot;
  const fontsConfPath = path.join(cacheRoot, "fonts.conf");
  const cacheXmlPath = cacheRoot.replace(/\\/g, "/");
  if (!fsSync.existsSync(fontsConfPath)) {
    fsSync.writeFileSync(
      fontsConfPath,
      `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>C:/Windows/Fonts</dir>
  <cachedir>${cacheXmlPath}</cachedir>
</fontconfig>
`,
      "utf8",
    );
  }
  process.env.FONTCONFIG_FILE = process.env.FONTCONFIG_FILE || fontsConfPath;

  const options = parseArgs(process.argv.slice(2));

  if (options.validate) {
    await validateExamples();
    return;
  }

  if (options.indexAssets) {
    await indexAssets();
    return;
  }

  if (options.projectSmoke) {
    await runProjectSmoke();
    return;
  }

  if (options.qualityCheck) {
    await runQualityCheck();
    return;
  }

  if (options.contactSheet) {
    await runContactSheet();
    return;
  }

  if (options.qualitySheet) {
    await runQualitySheet();
    return;
  }

  if (options.aiSmoke) {
    await runAiSmoke(options);
    return;
  }

  if (options.stylePackSmoke) {
    await runStylePackSmoke();
    return;
  }

  if (options.assetSelectionSmoke) {
    await runAssetSelectionSmoke();
    return;
  }

  if (options.layeredSmoke) {
    await runLayeredSmoke();
    return;
  }

  if (options.layerPackSmoke) {
    await runLayerPackSmoke();
    return;
  }

  if (options.titleLayerSmoke) {
    await runTitleLayerSmoke();
    return;
  }

  if (options.referenceFlowSmoke) {
    await runReferenceFlowSmoke();
    return;
  }

  if (options.placementSmoke) {
    await runPlacementSmoke();
    return;
  }

  if (options.titlePreprocessSmoke) {
    await runTitlePreprocessSmoke();
    return;
  }

  if (options.referenceProviderCheck) {
    await runReferenceProviderCheck();
    return;
  }

  if (options.titleExtractionSmoke) {
    await runTitleExtractionSmoke();
    return;
  }

  if (options.titleFitSmoke) {
    await runTitleFitSmoke();
    return;
  }

  if (options.aiUsage || options.aiUsageReset) {
    await runAiUsage(options);
    return;
  }

  if (options.buildJob) {
    if (!options.request) throw new Error("Usage: npm run visual:build-job -- --request ai/agent/visual_composer/examples/requests/produce-monopoly.request.json");
    await buildJobFromRequest(options.request);
    return;
  }

  if (options.revise) {
    await reviseStoredJob(options);
    return;
  }

  if (!options.job) {
    throw new Error("Usage: npm run visual:compose -- --job ai/agent/visual_composer/examples/jobs/monopoly.story-acquaintance.job.json");
  }

  const job = await readJob(options.job);
  const { composeVisualJob } = await import("./compose");
  const result = await composeVisualJob(job);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
