# Visual Production Bot v2 implementation plan

## v2.1 status

Completed in workflow export:

- Stage 1 stabilization started:
  - Data Table filters fixed.
  - `revise_text`, `revise_image`, `regenerate_text`, `regenerate_image` routing repaired at graph level.
  - `Text State Router` outputs now map to the intended branches.
  - `Build Image Payload` is the common entry point for image generation.
- Stage 2 Visual Router added:
  - `Normalize Incoming Command`
  - `Visual Request Classifier`
  - `Visual Request Route`
- Stage 3 Project Profile Loader added:
  - profiles embedded in workflow Code node for n8n cloud compatibility.
- Stage 4 Composer MVP payload added:
  - `Build Visual Job Payload` creates `visual_job`, `text_layer`, `illustration_layer`, `background_layer`, `layout`, `profile`, `revision_state`.

Not completed yet:

- Real composer service.
- Dedicated `revision_target` state column.
- Durable `visual_job_json` persistence in Data Table.
- Photo-safe hockey template renderer.
- Print layout renderer/PDF export.

## v2.2 status

Completed:

- Stage 5 local image composer MVP started and working as CLI.
- Added `composeVisualJob(job)` dispatcher.
- Added layer-aware renderers for:
  - Monopoly square composer preview.
  - Monopoly Pay square composer preview.
  - Gorilla Hockey poster.
  - Gorilla Hockey A4 print PNG.
  - Casper simple overlay fallback.
- Added placeholder asset generation, so examples work without real client assets.
- Added example job JSON files and validation command.
- Added n8n integration document with future `POST /api/visual/compose` contract.

Still pending:

- Real HTTP service or Next.js local API route.
- n8n workflow call to composer.
- Durable visual job persistence with `visual_job_json` and `revision_target`.
- Real brand asset library and template registry.
- PDF export for print.

## v2.3 status

Completed:

- Added `POST /api/visual/compose` in the Next.js App Router.
- Added API key protection via `VISUAL_COMPOSER_API_KEY`.
- Added public output storage in `public/generated/visual/`.
- Added example request JSON and local API test script.
- Prepared n8n workflow with `Compose Visual`, `Build Telegram Visual Response`, and `Telegram API Send Visual Photo` nodes.
- Updated n8n integration contract with concrete node settings.

Still pending:

- Manual n8n UI verification of the HTTP Request JSON body.
- Staging/public deployment URL for n8n cloud.
- State table expansion for output URL and layer-specific revision target.
- Telegram `sendDocument` branch for print-quality PNG/PDF.

## v2.4 status

Completed:

- Added Visual Asset Library skeleton and manifest model.
- Added asset resolver with deterministic placeholder fallback.
- Added rule-based Visual Job Builder from user command.
- Added AI provider interface and mock provider.
- Added `POST /api/visual/produce`.
- Added CLI job builder and produce request examples.
- Expanded validation to cover command -> visual_job -> composer.
- Updated n8n workflow starter route to call `Produce Visual`.

Still pending:

- Real asset manifest with approved project assets.
- Real AI layer generation behind `enable_ai=true`.
- Uploaded Telegram photo download and asset handoff into `uploaded_assets`.
- Persistent visual job state for layer-specific revisions.
- Manual n8n UI verification of raw JSON body.

## v2.5 status

Completed:

- File-based visual job persistence.
- Produce endpoint now creates job record version 1.
- Revision endpoint creates new output versions while changing only target layer.
- GET endpoint returns stored job record.
- Local asset indexer.
- Local revision CLI.
- Validation covers store and revision behavior.
- n8n starter `Revise Visual` node added as TODO until state table is expanded.

Still pending:

- Add `visual_job_id`, `revision_target`, `output_url` columns to n8n Data Table.
- Wire callback buttons to `awaiting_visual_revision` state.
- Download Telegram file assets and map them to local asset paths.
- Add URL downloader with allowlist/safety checks.
- Real AI provider for layer generation.

## Stage 1: stabilize current workflow

- Fix Data Table conditions to use explicit `keyName` and `keyValue`.
- Normalize callback names and route every button to a handled branch.
- Fix `Normalize Callback` assignment `=chat_id` -> `chat_id`.
- Fix `Build Image Payload` fallbacks for callback vs message input.
- Fix `revise_text`: save `awaiting_text_revision`, connect `Text State Router` text output to text revision prompt.
- Fix `regenerate_text`: do not read `Telegram Trigger.message.text` during callback.
- Fix `revise_image`: save `awaiting_image_revision`, route replies to image prompt builder.
- Fix `regenerate_image`: preserve project/profile context.
- Fix stale state reset before a new task and after final preview/approval.
- Remove mojibake parsing by making model output machine-readable JSON or by parsing stable ASCII section markers.

## Stage 2: add Visual Router

- Add project detection.
- Add mode detection.
- Add command parsing for new tasks vs revisions.
- Canonical project keys: `monopoly`, `monopoly_pay`, `casper`, `gorilla_hockey`.
- Canonical modes: `composer`, `style_generation`, `hockey_generated_poster`, `hockey_photo_template`, `hockey_print_layout`.
- Route text, voice transcription and photo captions through the same router.

## Stage 3: add Project Profile Loader

- Load profile by `project_key`.
- Validate `default_mode` and `allowed_modes`.
- Pass `text_style_rules`, `image_style_rules`, `composition_rules`, `negative_rules`, `asset_rules`, `output_formats` to downstream builders.
- Store `profile_version` or checksum in `visual_job_state`.

## Stage 4: add Composer MVP

- Build structured payload without a complex external service yet.
- Payload fields:
  - `text_layer`
  - `illustration_layer`
  - `background_layer`
  - `layout_variant`
  - `output_format`
- For MVP, image generation may still create a base image, but the workflow must preserve separate layer state.
- Add buttons for revising text, illustration, background and composition separately.

## Stage 5: add external image composer

- Create separate local script/service for final PNG assembly.
- Input: background, illustration, text, layout, output format.
- Output: final PNG path plus warnings.
- n8n calls composer through HTTP or Execute Command depending on deployment constraints.
- Move font rendering, text fitting, safe areas and high-res resizing out of n8n.

## Stage 6: add hockey photo/template mode

- Accept user-uploaded photo.
- Save Telegram file id/path in state.
- Select hockey photo template.
- Overlay logo, plaques, headline and supporting text.
- Keep source photo intact: no generative transformation unless explicitly requested.
- Return final PNG.

## Stage 7: add print layout mode

- Support `1080x1080`, `1080x1350`, `1080x1920`, `A4`, `A5`.
- Parse text into layout fields.
- Generate high-resolution PNG.
- Add PDF export later after PNG pipeline is stable.
- Add template validation for safe areas, bleed/margins and font overflow.
# v1.1 production visual block

Implemented in this sprint:

- project profiles expanded to the production schema;
- project detection fixed for Hockey phrases such as `задача для хоккея`;
- asset resolver/indexer connected to manual project packs;
- AI provider interface made safe behind `VISUAL_BOT_ENABLE_AI`;
- composer layouts added/normalized for Monopoly, Pay, Casper and Hockey;
- Telegram UX updated with revision buttons, new variant, post text and uploaded photo flow;
- quality checks and smoke commands added.

Next production work:

- add approved real assets per project;
- run manual OpenAI staging checks with `npm run visual:ai-smoke` and one image generation;
- add PDF/sendDocument path for large print outputs;
- add visual regression snapshots for final client templates.

v1.3 AI implementation:

- OpenAI text/image provider is connected behind env flags.
- Usage guard prevents accidental image spend.
- Revisions can regenerate illustration/background layers when AI is enabled.
- Production composer still owns Russian text rendering.
# DNK MVP 1.47 layered visual pipeline note

Native Telegram visual bot now treats Monopoly and Monopoly Pay as layered production jobs:

- background layer;
- character/ded layer;
- title image layer;
- logo layer;
- decor layer;
- final composite.

Original PNG delivery uses Telegram `sendDocument`; layer packs are exported as ZIP files under `.storage/visual_layer_packs/`.

## DNK MVP 1.48 Art Direction Rule

Before suggesting the next MVP commit message, check `MVP_VERSION_LOG.md`.

The current recommended commit message is:

```text
DNK MVP 1.48: improve layered visual art direction
```

The visual bot roadmap now treats Monopoly/Pay output as production layer art direction: preset-based placement, manual layer movement, title preprocessing and explicit provider capability reporting for reference/edit.

## DNK MVP 1.51 Autonomous Multi-Pass Pipeline

The visual bot production direction moves from asset-first reuse toward autonomous layer generation:

- command creates a production plan;
- title image is generated as a layer and verified;
- character pose is generated from reference/edit where live provider is enabled;
- project background is reused by default;
- final composite runs QA and records critic/repair diagnostics.

Approved asset packs remain in the plan as cache/reference/manual override/fallback.
