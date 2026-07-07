# DNK Visual Composer MVP

## DNK MVP 1.47 layered pipeline

Monopoly and Monopoly Pay now use a Photoshop-like layer model:

```text
background_layer -> character_layer -> title_image_layer -> logo_layer -> decor_layer -> final_composite
```

Default output presets:

- Monopoly / Monopoly Pay / Casper: `wide_1920x1080`
- Gorilla Hockey: `square_1024x1024`

Layer pack export writes local ZIP files under `.storage/visual_layer_packs/`.

Local checks:

```bash
npm run visual:layered-smoke
npm run visual:layer-pack-smoke
npm run visual:quality-sheet
```

Local backend composer for Visual Production Bot v2.2.

It accepts a `visual_job` JSON, assembles image layers with `sharp`, and writes a PNG. It does not call external APIs, n8n, Telegram, or image generation services.

## Run

Build one job:

```bash
npm run visual:compose -- --job ai/agent/visual_composer/examples/jobs/monopoly.story-acquaintance.job.json
```

Validate and build all examples:

```bash
npm run visual:validate
```

Outputs are written to:

```text
ai/agent/visual_composer/examples/outputs/
```

## API Endpoint

The DNK Next.js app exposes the composer at:

```text
POST /api/visual/compose
```

Start the local app:

```bash
npm run dev
```

Then call the endpoint:

```bash
curl -X POST http://localhost:3000/api/visual/compose ^
  -H "Content-Type: application/json" ^
  -d @ai/agent/visual_composer/examples/requests/monopoly-compose.request.json
```

Or use the helper script while the server is already running:

```bash
npm run visual:api:test
```

If `VISUAL_COMPOSER_API_KEY` is set, include:

```text
Authorization: Bearer <VISUAL_COMPOSER_API_KEY>
```

If `VISUAL_COMPOSER_API_KEY` is empty in local dev, the endpoint allows unauthenticated local calls. Do not leave it empty on staging or production.

API outputs are written to:

```text
public/generated/visual/
```

The response includes `output_url`, for example:

```json
{
  "ok": true,
  "output_url": "/generated/visual/..."
}
```

For n8n cloud, the app must be available through a public staging URL or tunnel. n8n cannot call your local `localhost` directly.

## Produce From User Command

v2.4 adds a production endpoint that builds the `visual_job` from a user command and then composes the PNG:

```text
POST /api/visual/produce
```

Example request:

```bash
curl -X POST http://localhost:3000/api/visual/produce ^
  -H "Content-Type: application/json" ^
  -d @ai/agent/visual_composer/examples/requests/produce-monopoly.request.json
```

Helper script, with the dev server already running:

```bash
npm run visual:produce:test
```

Build only the job JSON without calling the API:

```bash
npm run visual:build-job -- --request ai/agent/visual_composer/examples/requests/produce-monopoly.request.json
```

Local smoke test without n8n or Next dev server:

```bash
npm run visual:produce:local
```

This writes a PNG to `public/generated/visual/` and a job record to `.storage/visual_jobs/`.

## Manual Telegram bot test

1. Run `npm run visual:validate`.
2. Run `npm run dev`.
3. Check `/api/visual/produce` with curl from `MANUAL_TELEGRAM_TEST_V2_6.md`.
4. Expose DNK app through staging, Cloudflare Tunnel, ngrok, or use local self-hosted n8n.
5. Set n8n env from `ENV_CHECKLIST_V2_6.md`.
6. Import `ai/agent/ai_bot_designer/DNK Visual Bot Manual Test.workflow.json`.
7. Send to Telegram bot: `СЃРґРµР»Р°Р№ РєР°СЂС‚РёРЅРєСѓ РґР»СЏ РјРѕРЅРѕРїРѕР»РёРё РёСЃС‚РѕСЂРёСЏ Р·РЅР°РєРѕРјСЃС‚РІР°`.

Built job JSON files are written to:

```text
ai/agent/visual_composer/examples/outputs/jobs/
```

Generated PNG files remain ignored by git.

## Stateful Jobs And Revisions

v2.5 stores produced jobs in a local file store:

```text
.storage/visual_jobs/
```

This folder is ignored by git.

Revision API:

```text
POST /api/visual/revise
```

Example body:

```json
{
  "job_id": "from-produce-response",
  "target": "text",
  "instruction": "РїРѕРјРµРЅСЏР№ С‚РµРєСЃС‚ РЅР° РќРћР’Р«Р™ РЎРџРћРЎРћР‘ РћРџР›РђРўР«",
  "uploaded_assets": [],
  "options": {
    "enable_ai": false,
    "return_mode": "json",
    "save_output": true
  }
}
```

Local CLI revision:

```bash
npm run visual:revise -- --job-id <job_id> --target text --instruction "РїРѕРјРµРЅСЏР№ С‚РµРєСЃС‚ РЅР° РќРћР’Р«Р™ РЎРџРћРЎРћР‘ РћРџР›РђРўР«"
```

On Windows shells with non-UTF-8 argument handling, prefer API/request JSON for Cyrillic revision instructions.

Fetch stored job:

```text
GET /api/visual/jobs/<job_id>
```

Index local assets:

```bash
npm run visual:assets:index
```

This writes:

```text
ai/agent/visual_assets/manifest.local.json
```

`manifest.local.json` is ignored by git because it may contain local/client asset paths.

If `npm run dev` or `npm run build` fails on Windows with `.next` `EPERM` locks, close any running dev server/editor preview, delete `.next` manually if Windows allows it, then retry. Do not use destructive git cleanup commands for this.

## Job JSON

The composer expects:

- `job_type = visual_production`
- `project_key`
- `visual_mode`
- `output_format`
- `layout.variant`
- optional `background_layer.asset_path`
- optional `illustration_layer.asset_path`
- optional `text_layer`
- optional `brand`

If an asset path is empty or missing, the composer generates a neutral placeholder and returns a warning. This keeps examples runnable without committing client assets.

## Asset Paths

Supported:

- absolute local paths;
- paths relative to repository root;
- paths under `examples/...`, resolved relative to `ai/agent/visual_composer/`.

Example:

```json
{
  "background_layer": {
    "enabled": true,
    "asset_path": "ai/agent/visual_composer/examples/assets/real-bg.png"
  }
}
```

or:

```json
{
  "background_layer": {
    "enabled": true,
    "asset_path": "examples/assets/real-bg.png"
  }
}
```

## Ready Layouts

- `monopoly` / `composer`:
  - `title_top_character_bottom`
  - `title_bottom_character_center`
  - `title_overlay_sticker`
- `monopoly_pay` / `composer`:
  - `pay_square_v1`
- `gorilla_hockey`:
  - `hockey_poster_v1`
  - `gorilla_print_a4_v1`
- `casper`:
  - `simple_overlay`

## Current Limits

- No PDF export yet.
- No external image generation.
- No font files are committed; SVG text uses system/browser font fallback.
- Typography is robust enough for MVP, not final brand typography.
- The composer writes local PNG files; HTTP service integration is documented separately.
- On some Windows environments `sharp`/fontconfig can print cache-directory warnings to stderr while still producing valid PNG files.

## TODO

- Add real asset library and template registry.
- Add dedicated layout JSON schema.
- Add QR asset support from real file or generated content.
- Add PDF export for print.
- Replace mock AI provider with a real provider behind `enable_ai=true`.
# Current production status

v1.1 visual composer supports project-aware production fallback for `monopoly`, `monopoly_pay`, `casper` and `gorilla_hockey`.

Works now:

- project detection and profile loading from `ai/agent/ai_bot_designer/profiles/`;
- separate text / illustration / background / layout layers;
- layer-aware revisions;
- manual asset manifest indexing with `npm run visual:assets:index`;
- safe fallback rendering when AI or assets are missing;
- quality warnings via `src/quality/`.

Still requires real production inputs:

- approved client assets in `ai/agent/visual_assets/manual_project_packs/`;
- `VISUAL_BOT_ENABLE_AI=true` plus provider setup for generated illustration/background assets;
- final brand logos, QR and contact data for Hockey print layouts.

Project smoke outputs are copied to:

```text
ai/agent/visual_composer/examples/outputs/project-smoke/
```

Run a contact sheet:

```bash
npm run visual:contact-sheet
```

AI mode is disabled by default. Enable it with `VISUAL_BOT_ENABLE_AI=true` and `OPENAI_API_KEY`, with model names supplied through `OPENAI_IMAGE_MODEL` and `OPENAI_TEXT_MODEL`. The adapter is safe-fallback first and composer renders Cyrillic text itself.

v1.3 OpenAI provider:

- text generation uses a structured JSON response path;
- image generation saves assets to `.storage/visual_generated_assets/<project>/<date>/`;
- image prompts explicitly request no text/letters/watermarks;
- `VISUAL_AI_COST_GUARD=true` and `VISUAL_AI_DAILY_LIMIT` protect image spend;
- `npm run visual:ai-smoke` is text-only unless `-- --image` is passed.

# v1.4 style packs

The production path now treats `ai/agent/visual_assets/manual_project_packs/` as project style packs. Real client files remain gitignored; only README, `.gitkeep` and safe `*.example.json` templates are allowed in git.

Use:

```bash
npm run visual:assets:index
npm run visual:style-pack-smoke
```

Composer-owned layers:

- text/title/sticker/CTA are always rendered by composer;
- locked character/logo/photo assets stay as real layers;
- AI image generation is used only for missing illustration/background layers;
- selected reference assets are passed into the provider input and logged, but current OpenAI image generation is still prompt-only and emits a warning when references were selected.
# v1.5 asset selection verification

Asset tags are now a preference signal, not a hard rejection filter. If a project has a safe background in `manifest.local.json`, resolver should still select it even when it lacks optional tags such as `square`.

Use:

```bash
npm run visual:asset-selection-smoke
npm run visual:ai-usage
npm run visual:ai-usage:reset -- --yes
```

`visual:asset-selection-smoke` creates safe dummy PNG files under `.storage/visual_asset_selection_smoke/` and asserts that Monopoly background/character/reference and Pay logo/character/background/icon are selected and used by composer.

The reset command is local-dev only. It deletes today's local usage file under `.storage/visual_ai_usage/`; do not use it in production to bypass cost guard.

## DNK MVP 1.48 Reference/Edit And Title Layers

Monopoly and Monopoly Pay now expose production layer workflows for character and title revisions:

- `character_layer` is revised separately from background/title/logo.
- Locked character assets are preserved unless the user explicitly writes `можно заменить персонажа`, `замени персонажа` or `сгенерируй нового деда`.
- The provider exposes capability diagnostics for image generation, image references, image edit and transparent background.
- Current OpenAI image reference/edit capability is gated as unavailable in this provider path; the bot logs `image reference/edit not available in current provider` and keeps the locked character instead of silently replacing it.
- `title_image_layer` can be generated as an AI image layer when AI image generation is available, otherwise it falls back to composer-rendered text.
- `title_style_reference` assets can be uploaded with: `asset monopoly reference role: title_style_reference tags: orange,3d,text lock: reference_only`.
- Layer packs now include `prompt_log.txt` and `README.txt`; `title.png` is exported even for composer fallback so it can be replaced manually in Photoshop.

Useful local checks:

```bash
npm run visual:title-layer-smoke
npm run visual:reference-flow-smoke
npm run visual:layer-pack-smoke
```

Manual test plan: `ai/agent/telegram_visual_bot/V1_8_REFERENCE_EDIT_TEST_PLAN.md`.

## DNK MVP 1.48 Art Direction

Current recommended commit message:

```text
DNK MVP 1.48: improve layered visual art direction
```

Before suggesting the next MVP commit message, check `ai/agent/ai_bot_designer/MVP_VERSION_LOG.md`.

Production layered layouts now use explicit placement presets for Monopoly and Monopoly Pay. `/debug_job` shows compact placement metadata: preset, title box and character box.

Manual placement commands:

- `увеличь текст`, `текст левее`, `текст ниже`, `растяни заголовок`
- `увеличь деда`, `деда вправо`, `деда вниз`, `поставь деда справа`
- composition examples such as `дед справа, текст слева как в примере`

Local checks:

```bash
npm run visual:placement-smoke
npm run visual:title-preprocess-smoke
npm run visual:reference-provider-check
```

Manual test plan: `ai/agent/telegram_visual_bot/V1_8_ART_DIRECTION_TEST_PLAN.md`.

## DNK MVP 1.49 Title Layer Fit

Recommended commit message:

```text
DNK MVP 1.49: improve title layer fit and reference-edit readiness
```

Title extraction is now deterministic before AI text generation. Service phrases such as `сделай новую картинку для монополии` are removed, so `сделай новую картинку для монополии история знакомства` becomes `ИСТОРИЯ ЗНАКОМСТВА`.

Default title image policy:

```bash
VISUAL_TITLE_IMAGE_PROVIDER=composer
```

Allowed values: `composer`, `ai`, `asset`. Composer is the safe default for Cyrillic title layers.

New checks:

```bash
npm run visual:title-extraction-smoke
npm run visual:title-fit-smoke
```

## DNK MVP 1.50 Production Visual QA

Recommended commit message:

```text
DNK MVP 1.50: production visual QA and reference-edit integration
```

The production compose path now runs a lightweight visual QA pass after composing and can repair critical title bounds issues once or twice before returning the final output.

QA checks include:

- title box inside safe canvas bounds;
- real `title.png` path for `title_image_layer`;
- output dimensions;
- character/logo bounds;
- Hockey default `1024x1024`;
- Monopoly/Pay wide output expectations.

New local checks:

```bash
npm run visual:visual-qa-smoke
npm run visual:quality-gate
npm run visual:reference-live-smoke -- --project monopoly --image <path>
```

Reference/edit env flags:

```bash
VISUAL_IMAGE_REFERENCE_PROVIDER=disabled
VISUAL_IMAGE_EDIT_PROVIDER=disabled
VISUAL_ENABLE_LIVE_REFERENCE_TEST=false
```

Use `openai` values only for manual integration work. Automated checks must not call OpenAI.

## DNK MVP 1.51 Approved Asset-First Pipeline

Recommended commit message:

```text
DNK MVP 1.51: add approved visual asset packs for Monopoly and Pay
```

For Monopoly and Pay, build now selects approved production layers first:

- `title_image` exact match by normalized `text`;
- `character_pose` match by requested pose/tags such as `phone`, `cup`, `receipt`;
- normal background/logo/icon assets;
- AI/fallback only when approved assets are missing.

Production toggle:

```bash
VISUAL_PRODUCTION_ASSET_FIRST=true
```

Set it to `false` only for experiments. Local smoke:

```bash
npm run visual:asset-first-smoke
```

## DNK MVP 1.51 Autonomous Multi-Pass Pipeline

Recommended commit message:

```text
DNK MVP 1.51: add autonomous multi-pass AI visual pipeline
```

Default layer policy is now:

```bash
VISUAL_LAYER_SOURCE_POLICY=generate_first
```

For Monopoly and Pay, one command creates a production plan and runs separate layer phases:

1. title layer generation/verification;
2. character pose reference/edit generation and consistency review;
3. project background reuse or generation when explicitly needed;
4. layered compose;
5. visual QA/final critic;
6. selective repair of only the weak layer.

Approved assets remain as cache, exact reuse, manual override and fallback. Users do not need to know future post topics or upload future title/pose assets in advance.

Offline checks:

```bash
npm run visual:production-plan-smoke
npm run visual:multi-pass-smoke
npm run visual:title-verification-smoke
npm run visual:character-critic-smoke
```

Live-gated checks:

```bash
VISUAL_ENABLE_LIVE_REFERENCE_TEST=true npm run visual:openai-edit-smoke -- --image <path> --prompt "same character holding a cup"
VISUAL_ENABLE_LIVE_PRODUCTION_TEST=true npm run visual:production-live-smoke -- --project monopoly_pay --command "РЅРѕРІС‹Рµ С‚СЂРёРіРіРµСЂС‹ Р±Р°РЅРєРѕРІ, РґРµРґ РїСЂРѕС…РѕРґРёС‚ РјРµР¶РґСѓ Р»СѓС‡Р°РјРё СЃРёРіРЅР°Р»РёР·Р°С†РёРё"
```

### DNK MVP 1.51 live image edit input handling

`images.edit` inputs are normalized before upload:

- source file MIME is detected by magic bytes first, extension second;
- supported formats are PNG, JPEG and WEBP;
- every reference is copied to `.storage/visual_reference_inputs/<job_id>/reference-XX.png`;
- OpenAI receives the normalized PNG stream with explicit `type: image/png`;
- user-facing diagnostics show only basenames, detected format, normalized dimensions and byte size.

New offline checks:

```bash
npm run visual:image-mime-smoke
npm run visual:reference-normalization-smoke
npm run visual:cli-path-smoke
```

`visual:openai-edit-smoke` prints `OUTPUT PNG: <path>` after a live edit. `visual:production-live-smoke` prints `FINAL PNG: <path>` after composing the E2E output.

### DNK MVP 1.51 model-aware image edit parameters

`images.edit` request options are model-aware. For `gpt-image-2`, the provider omits `input_fidelity` because the live API rejects that parameter for this model.

Offline diagnostics:

```bash
npm run visual:reference-provider-check
npm run visual:image-edit-params-smoke
```

Expected diagnostic for `gpt-image-2`:

```text
applied_optional_parameters: []
skipped_optional_parameters: { input_fidelity: "unsupported_for_model" }
```

The production planner uses a locked `character` / `main_character` asset as the primary identity reference. Approved `character_pose` assets are secondary references or fallbacks in `generate_first` mode.

## DNK MVP 1.52 Visual Recipe Engine

Default production mode is now:

```env
VISUAL_PIPELINE_MODE=hybrid_economy
VISUAL_MAX_AI_IMAGE_CALLS_PER_JOB=1
```

`hybrid_economy` runs channel-independent `VisualProductionEngine`:

```text
command -> VisualRecipe -> local title renderer -> approved/fixed assets -> optional one AI variable-layer call -> local compose -> local QA -> PNG
```

The previous autonomous multi-pass R&D pipeline is preserved behind:

```env
VISUAL_PIPELINE_MODE=experimental_multipass
```

Recipes:

- `monopoly_social_wide_v1`: 0 AI calls for normal title/compose, max 1 reference edit for explicit new pose.
- `monopoly_pay_social_wide_v1`: local Pay title PNG, palette/background assets, max 1 reference edit for explicit new pose.
- `casper_one_shot_v1`: one-shot AI visual, max 1 call, optional local title overlay.
- `gorilla_hockey_photo_template_v1`: existing photo/template is 0 AI calls, explicit new player/uniform is max 1 call.

New local checks:

```bash
npm run visual:recipe-smoke
npm run visual:hybrid-economy-smoke
npm run visual:one-call-budget-smoke
npm run visual:idempotency-smoke
npm run visual:local-title-renderer-smoke
npm run visual:provider-routing-smoke
npm run visual:cost-ledger-smoke
npm run visual:pilot-report-smoke
```

Cost reports:

```bash
npm run visual:cost-report
npm run visual:pilot-report
```

Provider adapters are registered for `openai`, `bfl`, and `yandexart`. Live calls are gated by `VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS=true`; offline smoke defaults to the local mock provider.
