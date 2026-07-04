# Changelog

## 2026-07-03

### DNK MVP 1.47 layered visual pipeline

- Added Photoshop-like layers for Monopoly/Pay: background, character, title image, logo, decor and final composite.
- Added project output presets: Monopoly/Pay/Casper default to `1920x1080`, Hockey defaults to `1024x1024`.
- Added Telegram document delivery for original PNG and layer-pack ZIP export.
- Added `visual:layered-smoke` and `visual:layer-pack-smoke`.
- Added `V1_6_LAYERED_PIPELINE_TEST_PLAN.md`.

### DNK MVP 1.45 Monopoly/Pay visual quality pass

- Added auto-fit text rendering metadata for final font size, line count, shrink and truncation.
- Reworked Monopoly layouts around locked character placement, safe title areas, real background usage and no fake logo when logo asset is absent.
- Reworked Monopoly Pay layouts around Pay character/logo/background, readable title zones, icons/pills fallback and CTA fit.
- Added production layout variants for Monopoly and Pay and updated layout revision cycling.
- Added `visual:quality-sheet` for local Monopoly/Pay manual quality review.
- Added `V1_5_VISUAL_QUALITY_TEST_PLAN.md`.

### DNK Visual Bot v1.5.1 debug/webhook hardening

- `/debug_job` now sends a compact Telegram-safe summary.
- Added `/debug_job_full` for chunked detailed diagnostics.
- Added Telegram text chunking helper and `sendLongMessage`.
- Webhook now logs runtime failures and returns `200` to Telegram after trying a short user notification, avoiding retry loops for message-send failures.
- Added `telegram:visual:drop-pending` and `--drop-pending` support for set-webhook.
- Added `telegram:visual:debug-smoke` with no external API calls.

### DNK Visual Bot v1.5 asset selection fixes

- Fixed visual asset resolver so optional tags are used for scoring instead of rejecting otherwise valid project assets.
- Added verbose resolver logs: project total, type/mode/safe/lock/role counts, selected id/path and reject summaries.
- Pay jobs now select and use Pay locked character, logo, background and icon assets.
- Monopoly jobs now include selected style references in `style_assets`.
- Composer layouts emit `composer_usage` diagnostics for background/character/logo/icon asset vs fallback usage.
- `/debug_job` now separates manifest counts, selection logs, composer usage and AI skipped reason.
- Added local `visual:asset-selection-smoke`, `visual:ai-usage` and guarded `visual:ai-usage:reset`.

## 2026-07-02

### v2.5 visual job persistence and revision engine

#### Implemented

- Added file-based visual job store under `.storage/visual_jobs/`.
- Added VisualJobRecord model with outputs, layer state and history.
- Updated `/api/visual/produce` to persist records and return:
  - `job_id`
  - `version`
  - `available_revisions`
- Added `GET /api/visual/jobs/[jobId]`.
- Added `POST /api/visual/revise`.
- Added revision engine:
  - text layer revision
  - illustration layer revision
  - background layer revision
  - layout revision
  - format revision
- Added uploaded asset JSON support for revision payloads.
- Added asset indexer:
  - `npm run visual:assets:index`
  - writes ignored `ai/agent/visual_assets/manifest.local.json`
- Added local CLI revision:
  - `npm run visual:revise -- --job-id <job_id> --target text --instruction "..."`
- Expanded `visual:validate` with store/revision checks.
- Added starter `Revise Visual` node to n8n workflow export.

#### Notes

- `Revise Visual` is not wired into live n8n state flow until `content_bot_state` has `visual_job_id` and `revision_target`.
- Uploaded URL and Telegram `file_id` download are still TODO; local asset paths are supported.
- Windows shells can pass Cyrillic CLI args incorrectly; API JSON requests are safer for revision instructions.

### v2.4 production pipeline, asset resolver and job builder

#### Implemented

- Added empty Visual Asset Library structure in `ai/agent/visual_assets/`.
- Added asset manifest example and typed asset model.
- Added `assetResolver` with placeholder fallback.
- Added Visual Job Builder:
  - project detection;
  - visual mode detection;
  - output format detection;
  - text layer extraction;
  - project-specific job builders.
- Added AI provider adapter interface:
  - deterministic mock provider;
  - OpenAI provider placeholder behind `enable_ai=true`.
- Added API endpoint: `POST /api/visual/produce`.
- Added produce request examples for Monopoly, Monopoly Pay, Casper, Gorilla Hockey poster and Gorilla A4 print.
- Added CLI:
  - `npm run visual:build-job -- --request <request.json>`
  - `npm run visual:produce:test`
- Expanded `npm run visual:validate` to validate both ready-made jobs and produce requests without external API calls.
- Updated n8n workflow with starter `Produce Visual` route.

#### Notes

- `enable_ai=false` is the default. Local validation does not call external APIs.
- Asset manifests can be empty; composer placeholders are used with warnings.
- Generated example PNG/job outputs are ignored by git.

#### Runtime caveat

- In this Windows workspace, previous v2.3 checks showed `npm run dev` can fail with Next `spawn EPERM`, and `npm run build` can fail when `.next` files are locked. This is documented in the composer README; no destructive cleanup was performed.

### v2.3 composer API and n8n integration prep

#### Implemented

- Added Next.js App Router endpoint: `POST /api/visual/compose`.
- Endpoint imports `composeVisualJob` server-side and writes PNG files to `public/generated/visual/`.
- Added JSON response with `job_id`, `output_path`, `output_url`, dimensions, project, mode and warnings.
- Added optional binary response mode for `image/png`.
- Added optional bearer auth through `VISUAL_COMPOSER_API_KEY`.
- Added generated output ignore rule for `public/generated/visual/*` with `.gitkeep`.
- Added API request example:
  - `ai/agent/visual_composer/examples/requests/monopoly-compose.request.json`
- Added local API test helper:
  - `npm run visual:api:test`
- Added n8n workflow starter nodes:
  - `Compose Visual`
  - `Build Telegram Visual Response`
  - `Telegram API Send Visual Photo`
- Routed visual requests from `Build Visual Job Payload` to `Compose Visual`.
- Kept legacy approve/regenerate image path through `Build Image Payload` -> `OpenAI Image`.

#### TODO

- Verify the `Compose Visual` HTTP Request body in n8n UI after import; nested JSON expression may need manual raw-body adjustment.
- Add durable `visual_job_json`, `output_url`, `revision_target` columns to `content_bot_state`.
- Switch print layouts to Telegram `sendDocument` instead of `sendPhoto`.
- Add staging/public URL or tunnel for n8n cloud.

### v2.2 local visual composer MVP

#### Implemented

- Added local composer module in `ai/agent/visual_composer/`.
- Added TypeScript build and CLI scripts:
  - `npm run visual:build`
  - `npm run visual:compose -- --job <path>`
  - `npm run visual:validate`
- Added `sharp` as an explicit dependency for local image composition.
- Added typed composer model:
  - `VisualJob`
  - `VisualProjectKey`
  - `VisualMode`
  - `OutputFormat`
  - `TextLayer`
  - `IllustrationLayer`
  - `BackgroundLayer`
  - `LayoutConfig`
  - `BrandElement`
  - `ComposeResult`
- Added layouts:
  - `monopolySquare`
  - `monopolyPaySquare`
  - `gorillaHockeyPoster`
  - `gorillaPrintLayout`
  - `simpleOverlayLayout` for Casper-style overlay fallback.
- Added neutral placeholder asset generation when referenced asset files are missing.
- Added example jobs for Monopoly, Monopoly Pay, Casper, Gorilla Hockey poster and Gorilla Hockey A4 print.
- Added `N8N_TO_COMPOSER_INTEGRATION.md` with future HTTP contract.
- Validated local PNG generation for all example jobs without external API calls.

#### Outputs generated

- `ai/agent/visual_composer/examples/outputs/monopoly.title_top_character_bottom.visual-job.png`
- `ai/agent/visual_composer/examples/outputs/monopoly_pay.pay_square_v1.visual-job.png`
- `ai/agent/visual_composer/examples/outputs/gorilla_hockey.hockey_poster_v1.visual-job.png`
- `ai/agent/visual_composer/examples/outputs/gorilla_hockey.gorilla_print_a4_v1.visual-job.png`
- `ai/agent/visual_composer/examples/outputs/casper.simple_overlay.visual-job.png`

#### Known limits

- The composer is CLI-only in v2.2; HTTP endpoint is documented but not implemented.
- Placeholder visuals are neutral and intentionally not client-branded.
- No PDF export yet.
- No committed font files; SVG text uses system fallback fonts.
- Some old generated output duplicates from intermediate runs could not be deleted by Windows (`Access denied`). The canonical outputs are the `*.visual-job.png` files.

### v2.1 workflow stabilization and visual router

#### Implemented

- Created a new pre-v2.1 workflow backup in `ai/agent/ai_bot_designer/backups/`.
- Added workflow nodes:
  - `Normalize Photo Task`
  - `Normalize Incoming Command`
  - `Visual Request Classifier`
  - `Visual Request Route`
  - `Project Profile Loader`
  - `Build Visual Job Payload`
  - `Save Awaiting Text Revision`
- Fixed Data Table filters to use `keyName: chat_id` and `keyValue` expressions instead of `condition: =chat_id equals ...`.
- Fixed `Reset State Before New Task` to upsert by `chat_id`, set `mode = idle`, and clear `final_post`, `image_prompt`, `photo_file_id`.
- Fixed `Text State Router`:
  - `awaiting_image_revision` -> `Normalize Image Revision`
  - `awaiting_text_revision` -> `Build Text Revision Prompt`
  - other state -> `Reset State Before New Task` -> `Edit Fields`
- Fixed `revise_text` to use `Save Awaiting Text Revision` instead of the image revision state node.
- Fixed `revise_image` to write `mode = awaiting_image_revision`.
- Kept `regenerate_image` and `approve` routed through `Build Image Payload` before `OpenAI Image`.
- Updated `Build Image Payload` so image paths do not depend on `Build Final Post`.
- Updated `Save Preview Meta` dependency model: it still reads from `Send Photo` and `Build Image Payload`, not `Build Final Post`.
- Added visual layer callback buttons:
  - `change_visual_text`
  - `change_illustration`
  - `change_background`
  - `change_layout`
- Added embedded profile map in `Project Profile Loader` based on profile JSON files in the repository.
- Added `Build Visual Job Payload` with `visual_job`, layer payloads and composer-prep `image_prompt`.

#### Still stubbed

- Real image composer service is not connected yet.
- Monopoly and Monopoly Pay now create composer-prep payloads, but final PNG is still generated through the existing `OpenAI Image` preview path.
- Visual layer callbacks are routed to existing text/image revision state flows. Dedicated `revision_target` persistence is not enabled because the current `content_bot_state` schema may not have that column.
- Photo/template and print-layout modes create routing/payload context, but actual photo-safe composition and high-resolution print rendering require a local composer service/script.

#### Manual n8n checks after import

- Confirm Code node type/version compatibility for:
  - `Normalize Incoming Command`
  - `Visual Request Classifier`
  - `Project Profile Loader`
  - `Build Visual Job Payload`
- Confirm `content_bot_state` has columns: `chat_id`, `mode`, `final_post`, `image_prompt`, `photo_file_id`.
- If adding precise visual-layer revisions, add columns later: `revision_target`, `visual_job_json`, `project_key`, `visual_mode`.
- Confirm environment variable `TELEGRAM_BOT_TOKEN` is available to n8n for HTTP Request nodes.

### Found

- Current n8n workflow is importable JSON with 28 nodes.
- Main text/voice/draft/image/preview path exists.
- Hardcoded Telegram Bot API token was present in 5 HTTP Request URLs.
- Data Table conditions are inconsistent in state reset/clear nodes.
- Revision flows are partially wired but inconsistent:
  - `revise_image` saves `awaiting_text_revision`.
  - `text_revision` output is not connected.
  - `regenerate_text` reads message text during callback.
- Project naming is not aligned with v2: `pay` vs `monopoly_pay`, `hockey` vs `gorilla_hockey`.
- Visual generation is one-shot, not layer-based.

### Fixed

- Created workflow backup in `ai/agent/ai_bot_designer/backups/`.
- Replaced hardcoded Telegram token URLs with:
  - `https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendMessage`
  - `https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendPhoto`
- Added audit document.
- Added Visual Production Bot v2 architecture document.
- Added initial project profile JSON files.
- Added staged implementation plan.

### Not touched

- Production credentials ids and names.
- Workflow `id`, `active`, `settings`, `versionId`.
- Existing node graph and working nodes.
- n8n instance/API.
- External APIs.
- Publishing channel behavior except token placeholder in HTTP URLs.

### Next step

Start Stage 1 stabilization in a separate pass: fix Data Table filters, normalize callback names, repair `revise_text`/`revise_image` routing, and switch draft output parsing to stable JSON/ASCII markers before adding the Visual Router.
# v1.1 Production Visual Layer

- Manual status note: v1.1 was checked manually in Telegram before v1.2 work. Monopoly, Monopoly Pay, Casper and Gorilla Hockey generation worked; revision buttons worked; text revision worked; project detection worked.

- Added production profile schema for Monopoly, Monopoly Pay, Casper and Gorilla Hockey.
- Fixed project detection for Hockey commands.
- Added manual project packs and asset indexing support.
- Added safe AI layer adapter and prompt metadata without automatic external calls in tests.
- Added project-aware composer fallbacks, new layout variants and post caption fields.
- Added Telegram UX callbacks for text, illustration, background, composition, new variant, post text and close.
- Added uploaded photo pending flow for Hockey photo templates.
- Added visual quality checks and smoke scripts.

# v1.2 Real Assets, AI Mode and Telegram Asset Intake

- Manual project packs now support `backgrounds`, `illustrations`, `logos`, `references`, `templates`, `icons`, `photos`, `print` and `qr`.
- Asset manifest records now support `priority`, `recommended_modes`, `notes` and mode-aware safe auto-selection.
- Telegram asset intake commands added: `/asset_help`, `/asset_status`, `/asset_index`, `/asset_mode_on`, `/asset_mode_off`.
- Telegram caption intake supports `asset <project> <type> tags: tag1,tag2`.
- Added `/debug_job` for active job diagnostics.
- Added project-specific AI prompt builders and production OpenAI provider isolation with fallback.
- Added project-smoke output copies under `examples/outputs/project-smoke/`.
- Added `visual:contact-sheet`.

# v1.3 OpenAI Provider and AI Guard

- Added file-based AI usage guard under `.storage/visual_ai_usage/`.
- Added real OpenAI text provider path through the Responses API with structured JSON output.
- Added real OpenAI image provider path for illustration/background/style-base layers.
- Added `OPENAI_IMAGE_QUALITY`, `OPENAI_IMAGE_SIZE`, `VISUAL_AI_DAILY_LIMIT` and `VISUAL_AI_COST_GUARD`.
- Integrated AI layer generation into produce and revision flows while keeping composer-rendered Cyrillic text.
- Added Telegram `/ai_status`, `/ai_on`, `/ai_off`.
- Added `npm run visual:ai-smoke` with image generation opt-in via `-- --image`.
- Added `V1_3_AI_TEST_PLAN.md`.

## DNK MVP 1.48 Reference/Edit Notes

v1.48 adds provider capability diagnostics, character-layer reference/edit workflow guards, title-image layer generation/fallback, title style references, and richer layer packs with `prompt_log.txt` and `README.txt`.

The current OpenAI image provider path supports prompt-only image generation. Image reference/edit is explicitly reported as unavailable until a real reference/edit API path is wired; locked characters are preserved by default.

## DNK MVP 1.48: improve layered visual art direction

- Added MVP version log and commit-message guard.
- Added production placement presets for Monopoly and Monopoly Pay.
- Added layer placement controls for title and character revisions without AI generation.
- Added title image preprocessing and stronger branded fallback rendering.
- Added provider capability check for image reference/edit support.
- Added `placement.json` to layer packs.

Recommended commit message:

```text
DNK MVP 1.48: improve layered visual art direction
```
