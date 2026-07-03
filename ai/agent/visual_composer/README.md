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
7. Send to Telegram bot: `сделай картинку для монополии история знакомства`.

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
  "instruction": "поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ",
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
npm run visual:revise -- --job-id <job_id> --target text --instruction "поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ"
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
