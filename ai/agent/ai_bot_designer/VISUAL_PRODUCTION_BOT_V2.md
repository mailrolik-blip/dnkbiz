# Visual Production Bot v2 architecture

## v2.1 workflow implementation

The current n8n export now contains the first implementation layer for Visual Production Bot v2.1.

Implemented nodes:

- `Normalize Incoming Command`: normalizes text, voice transcription and photo caption payloads into `chat_id`, `user_id`, `username`, `source_type`, `raw_text`, `has_photo`, `photo_file_id`.
- `Visual Request Classifier`: rule-based classifier for visual requests, project key, mode, output format and layer needs.
- `Visual Request Route`: sends visual requests into the v2 visual path and non-visual requests into the legacy post draft path.
- `Project Profile Loader`: embeds the repository project profiles directly in the workflow because n8n cloud cannot read local repository files.
- `Build Visual Job Payload`: creates the first `visual_job` object with separate `text_layer`, `illustration_layer`, `background_layer`, `layout`, profile rules and revision capabilities.

Current behavior:

- `monopoly` and `monopoly_pay` route to `composer` and create a composer-prep payload.
- `casper` routes to `style_generation`.
- `gorilla_hockey` routes to `hockey_generated_poster`, `hockey_photo_template` or `hockey_print_layout` depending on wording and photo presence.
- The real composer is still a stub: `Build Visual Job Payload` prepares the structure, then the workflow temporarily uses the existing `Build Image Payload` -> `OpenAI Image` preview path.

Important limitation:

The v2.1 workflow does not yet guarantee pixel-perfect layer composition. It creates the correct state/payload foundation so the next stage can replace the temporary image preview with a local composer API/script.

## v2.2 local composer MVP

The repository now includes a local composer module:

```text
ai/agent/visual_composer/
```

It accepts `VisualJob` JSON and writes real PNG files locally using `sharp`. It does not call external APIs.

Available commands:

```bash
npm run visual:compose -- --job ai/agent/visual_composer/examples/jobs/monopoly.story-acquaintance.job.json
npm run visual:validate
```

Ready renderers:

- `monopoly` / `composer`: square layer composition with background, illustration, title and logo placeholder.
- `monopoly_pay` / `composer`: square payment-style composition with text, illustration and payment chips.
- `gorilla_hockey` / `hockey_generated_poster`: 1080x1350 sports poster.
- `gorilla_hockey` / `hockey_print_layout`: A4 high-res PNG at 2480x3508.
- `casper` / `style_generation`: simple overlay fallback if a generated image asset is available; otherwise placeholder.

The v2.2 composer is the first real replacement layer for the old one-prompt image generation approach. It preserves separate text, illustration, background and layout inputs so later revisions can change only one layer.

The n8n integration contract is documented in:

```text
ai/agent/ai_bot_designer/N8N_TO_COMPOSER_INTEGRATION.md
```

## v2.3 API integration

The composer is now exposed through the DNK Next.js app:

```text
POST /api/visual/compose
```

Request body:

```json
{
  "visual_job": {},
  "options": {
    "return_mode": "json",
    "save_output": true
  }
}
```

Response:

```json
{
  "ok": true,
  "job_id": "...",
  "project_key": "monopoly",
  "visual_mode": "composer",
  "layout_variant": "title_top_character_bottom",
  "output_format": "square",
  "width": 1080,
  "height": 1080,
  "output_path": "...",
  "output_url": "/generated/visual/....png",
  "warnings": []
}
```

Outputs are written to:

```text
public/generated/visual/
```

The n8n workflow export now includes starter composer-route nodes. n8n cloud still needs a public DNK app URL or tunnel; it cannot call a developer machine `localhost`.

## v2.4 production pipeline

v2.4 adds the command-to-image pipeline:

```text
command_text
-> detect project
-> detect visual mode
-> resolve assets
-> build text layer
-> build illustration/background layer refs
-> build VisualJob
-> compose PNG
-> return output_url/output_path
```

New endpoint:

```text
POST /api/visual/produce
```

This endpoint accepts normal user commands:

```json
{
  "command_text": "сделай картинку для монополии история знакомства",
  "uploaded_assets": [],
  "options": {
    "enable_ai": false,
    "return_mode": "json",
    "save_output": true
  }
}
```

`enable_ai=false` uses deterministic local generation and placeholders. No external AI calls are required for validation.

The recommended n8n MVP path is now `/api/visual/produce`. `/api/visual/compose` remains available when n8n already has a complete `visual_job`.

## v2.5 stateful revision pipeline

v2.5 adds persistence and layer-specific revisions.

Produce:

```text
POST /api/visual/produce
-> build visual_job
-> compose PNG
-> save .storage/visual_jobs/<job_id>.json
-> return job_id + version 1
```

Revise:

```text
POST /api/visual/revise
-> load job record
-> change only requested target layer
-> compose PNG
-> append output version
-> append history entry
-> return new version/output_url
```

Supported revision targets:

- `text`
- `illustration`
- `background`
- `layout`
- `format`

Stored jobs live in:

```text
.storage/visual_jobs/
```

This directory is ignored by git.

## Product focus

Visual Production Bot v2 is a project-aware image production bot. Its primary job is not publishing and not a universal assistant. It receives a text or voice task, detects the project and visual mode, loads a project profile, builds missing layers, composes the final image, sends the finished file, and supports targeted revisions.

Target projects:

- `monopoly`
- `monopoly_pay`
- `casper`
- `gorilla_hockey`

## Core entities

### Project profiles

Project profiles are JSON configs stored in `ai/agent/ai_bot_designer/profiles/`.

Each profile defines:

- `project_key`
- `project_name`
- `default_mode`
- `allowed_modes`
- `text_style_rules`
- `image_style_rules`
- `composition_rules`
- `negative_rules`
- `asset_rules`
- `output_formats`
- `revision_commands`

Profiles are loaded after project/mode detection and passed to all prompt builders and composer payload builders.

### Asset library

Asset library stores reusable brand and production assets:

- backgrounds
- textures
- logos
- badges
- character references
- typography rules
- safe-area masks
- photo overlays
- print marks later if needed

Recommended structure:

```text
ai/agent/ai_bot_designer/assets/
  monopoly/
  monopoly_pay/
  casper/
  gorilla_hockey/
```

n8n should store only asset ids/paths in job state. Binary transformations should be done by a local script/service.

### Template library

Template library stores composition presets:

- square post `1080x1080`
- vertical feed `1080x1350`
- story `1080x1920`
- A4
- A5
- hockey poster variants
- photo overlay variants

Recommended structure:

```text
ai/agent/ai_bot_designer/templates/
  monopoly/composer_square.json
  monopoly_pay/composer_square.json
  gorilla_hockey/photo_template_square.json
  gorilla_hockey/print_a4.json
```

Templates should define layer slots, safe areas, font constraints, logo positions and allowed layout variants.

### Visual job state

Every visual task should create/update a durable state object:

```json
{
  "visual_job_id": "",
  "chat_id": "",
  "user_id": "",
  "project_key": "",
  "mode": "",
  "source_task": "",
  "profile_version": "",
  "text_layer": {
    "headline": "",
    "subheadline": "",
    "caption": "",
    "status": "draft"
  },
  "illustration_layer": {
    "prompt": "",
    "asset_id": "",
    "status": "draft"
  },
  "background_layer": {
    "asset_id": "",
    "prompt": "",
    "status": "draft"
  },
  "composition": {
    "template_id": "",
    "layout_variant": "",
    "output_format": "1080x1080"
  },
  "final_image": {
    "file_path": "",
    "telegram_file_id": "",
    "status": "preview"
  },
  "revision_target": "",
  "history": []
}
```

For n8n Data Table MVP, store this as JSON text plus indexed columns: `chat_id`, `visual_job_id`, `project_key`, `mode`, `revision_target`, `status`.

## Modes

### `monopoly`

Default mode: `composer`.

Pipeline:

1. Generate/choose text layer.
2. Generate illustration layer in Monopoly style.
3. Select background/template from profile/assets.
4. Compose final banner.
5. Allow isolated revisions: text, illustration, background, composition.

Do not generate the final image with one prompt.

### `monopoly_pay`

Default mode: `composer`.

Same composer pipeline as `monopoly`, but profile and copy focus on payments, payment methods, banks, conversion and advertising visual style for Monopoly Pay.

Do not use generic `pay`; use canonical `monopoly_pay`.

### `casper`

Default mode: `style_generation`.

Can generate a visual directly from style profile/references. If Russian text is required on the image, keep it as a separate text layer and compose it over the generated visual to protect readability.

### `gorilla_hockey`

Allowed modes:

- `hockey_generated_poster`
- `hockey_photo_template`
- `hockey_print_layout`

`hockey_generated_poster`: fast club-style generated image/poster.

`hockey_photo_template`: user uploads a photo; bot keeps the photo intact and overlays logos, plaques and text.

`hockey_print_layout`: user uploads a background/photo and text; bot creates a high-resolution flyer/poster. Output formats: PNG high-res first, later PDF. Sizes: `1080x1080`, `1080x1350`, `1080x1920`, `A4`, `A5`.

## Pipelines

### Composer

Used by `monopoly` and `monopoly_pay`.

Payload:

```json
{
  "project_key": "monopoly",
  "mode": "composer",
  "text_layer": {
    "headline": "",
    "subheadline": "",
    "caption": ""
  },
  "illustration_layer": {
    "prompt": "",
    "source_asset": ""
  },
  "background_layer": {
    "asset_id": "",
    "prompt": ""
  },
  "layout_variant": "default",
  "output_format": "1080x1080"
}
```

Steps:

1. Visual Router detects project/mode.
2. Project Profile Loader loads profile.
3. Text Layer Builder creates headline/subheadline/caption.
4. Illustration Prompt Builder creates prompt and calls image generation only for illustration if needed.
5. Background Resolver picks profile asset or creates background.
6. Composer Payload Builder sends layer payload to local composer.
7. Send Final Image returns PNG to Telegram.

### Style generation

Used by `casper` and optionally hockey generated posters.

Steps:

1. Load project profile.
2. Build style prompt from profile + task.
3. Generate base image.
4. If text is needed, compose text layer separately.
5. Send final PNG.

### Photo template

Used by `gorilla_hockey`.

Steps:

1. Receive text/photo message.
2. Download Telegram photo as source asset.
3. Detect template type and output format.
4. Load hockey profile and selected template.
5. Compose overlays without altering the photo.
6. Send final PNG.

### Print layout

Used by `gorilla_hockey`.

Steps:

1. Receive source photo/background and text.
2. Select size: `A4`, `A5`, `1080x1080`, `1080x1350`, `1080x1920`.
3. Normalize text into title/date/location/CTA fields.
4. Compose high-resolution PNG.
5. Later add PDF export.

## Voice and text handling

Text:

1. Telegram Trigger receives text.
2. State Router checks whether user is answering a revision prompt.
3. If no pending revision, Visual Router detects new task.
4. If pending revision, Command Parser detects target: text, illustration, background, composition, format.

Voice:

1. Telegram Trigger receives voice.
2. Telegram node downloads file.
3. OpenAI transcribes.
4. Transcribed text goes through the same Visual Router or revision parser as normal text.

Photo:

1. Telegram Trigger receives photo with optional caption.
2. Photo Asset Normalizer saves photo metadata/file id.
3. Router chooses `hockey_photo_template` or `hockey_print_layout` when project is `gorilla_hockey`.

## Required n8n nodes

Keep in n8n:

- Telegram Trigger
- Message Type Router
- Voice File Download
- Transcription
- Visual Router
- Command Parser
- Project Profile Loader
- Visual Job State Get/Upsert
- Text Layer Builder
- Illustration Prompt Builder
- Background Resolver
- Composer Payload Builder
- HTTP Request to local composer
- Send Final Image
- Revision Button Router

Add/replace over stages:

- `Visual Router` Set/Code node or model-backed classifier.
- `Project Profile Loader` Code node reading static JSON, or HTTP call to local profile service.
- `Visual Job State` Data Table with explicit `keyName/keyValue` filters.
- `Composer Payload Builder` Set/Code node.
- `Local Composer HTTP Request` when service exists.

## What stays in n8n vs local service

n8n should orchestrate:

- Telegram IO
- OpenAI calls
- route decisions
- profile loading
- state updates
- small JSON payload assembly
- final message buttons

Local service/script should handle:

- image layer composition
- font rendering
- text fitting
- safe areas
- image resizing/cropping
- logo overlays
- high-resolution output
- print layout generation
- future PDF export

Recommended local service contract:

```http
POST /compose
Content-Type: application/json
```

Input: project profile, template id, text layer, illustration asset, background asset, output format.

Output:

```json
{
  "status": "ok",
  "file_path": "",
  "width": 1080,
  "height": 1080,
  "warnings": []
}
```

## Revision model

Buttons should map to explicit targets:

- `revise_text_layer`
- `regenerate_text_layer`
- `revise_illustration_layer`
- `regenerate_illustration_layer`
- `revise_background_layer`
- `change_composition`
- `change_output_format`
- `approve_final`

When user sends a revision text, only the selected target is changed. Other layer ids and values remain fixed in `visual_job_state`.
# Current production status

v1.1 moves the bot from placeholder-only output to project-aware production fallback:

- Monopoly and Monopoly Pay use composer pipelines with text, illustration, background and layout layers.
- Casper uses styled base generation/fallback with readable overlay text.
- Gorilla Hockey supports generated poster, uploaded photo template and print A4/A5 layouts.
- Profiles are loaded from `profiles/*.profile.json` and drive layouts, prompt rules, asset rules and quality checks.
- AI remains optional. With AI disabled or unavailable, the composer renders safe styled fallbacks.
- v1.3 connects OpenAI text/image provider behind `VISUAL_BOT_ENABLE_AI=true`, with usage guard and fallback on provider errors.
- Real client assets should be placed only under `ai/agent/visual_assets/manual_project_packs/` and indexed with `npm run visual:assets:index`.

n8n remains as an optional integration layer, not the primary path.
# DNK MVP 1.47 layered visual pipeline note

For Monopoly and Monopoly Pay, the production path is now Photoshop-like:

```text
background_layer -> character_layer -> title_image_layer -> logo_layer -> decor_layer -> final_composite
```

Telegram can send a compressed preview plus original PNG as document, and can export a ZIP layer pack for manual Photoshop editing.
