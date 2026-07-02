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
  for (const scenario of scenarios) {
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

async function runContactSheet(): Promise<void> {
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;
  const { getComposerRoot } = await import("./compose");
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
    const label = `${parts[1] || "project"} / ${parts[2] || "mode"} / fallback`;
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

async function runQualityCheck(): Promise<void> {
  const { buildVisualJobFromCommand } = await import("./jobBuilder");
  const { composeVisualJob } = await import("./compose");
  const { qualityCheckVisual } = await import("./quality");
  const result = await buildVisualJobFromCommand({ command_text: "задача для хоккея набор детей на тренировку", options: { enable_ai: false } });
  const composed = await composeVisualJob(result.visual_job);
  const quality = qualityCheckVisual({ visual_job: result.visual_job, compose_result: composed, expected: result.detected });
  if (!quality.ok) throw new Error(`Quality check failed: ${quality.critical.join("; ")}`);
  console.log(JSON.stringify({ ok: true, warnings: quality.warnings, output_path: composed.output_path }, null, 2));
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

  if (options.aiSmoke) {
    await runAiSmoke(options);
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
