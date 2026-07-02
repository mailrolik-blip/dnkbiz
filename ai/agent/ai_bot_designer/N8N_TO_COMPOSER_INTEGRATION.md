# n8n to Visual Composer integration

## Goal

Replace the temporary v2.1 path:

```text
Build Visual Job Payload -> Build Image Payload -> OpenAI Image
```

with:

```text
Build Visual Job Payload -> Local Composer -> Telegram Send Document/Photo
```

The local composer accepts `visual_job`, assembles layers locally, and returns a PNG path or URL.

## Recommended v2.4 Flow

For MVP, n8n should call `/api/visual/produce`, not `/api/visual/compose`. Produce accepts the user's command text, detects project/mode, builds the layer-aware `visual_job`, calls composer, and returns Telegram-ready output metadata.

```text
Telegram/Voice
-> Normalize Incoming Command
-> Visual Request Classifier
-> HTTP Request: Produce Visual
-> Build Telegram Produced Visual Response
-> Telegram API Send Visual Photo
```

Node: `Produce Visual`

- Method: `POST`
- URL:

```text
={{ ($env.DNK_VISUAL_COMPOSER_URL || "").replace(/\/$/, "") + "/api/visual/produce" }}
```

- Headers:

```text
Authorization: ={{ "Bearer " + ($env.VISUAL_COMPOSER_API_KEY || "") }}
Content-Type: application/json
```

- Raw JSON body:

```js
{{ JSON.stringify({
  command_text: $json.raw_text || $json.text || "",
  project_key: $json.project_key || "",
  visual_mode: $json.visual_mode || "",
  output_format: $json.output_format || "",
  uploaded_assets: [],
  options: {
    enable_ai: false,
    return_mode: "json",
    save_output: true
  }
}) }}
```

Later, set `enable_ai=true` only after the AI provider is configured and tested.

## v2.5 Stateful Revisions

Primary generation now returns `job_id` and version `1`. n8n should save this metadata for later layer revisions.

Recommended Data Table columns for `content_bot_state`:

- `chat_id`
- `mode`
- `final_post`
- `image_prompt`
- `photo_file_id`
- `visual_job_id`
- `revision_target`
- `output_url`

Initial generation:

```text
Telegram command
-> Produce Visual
-> Send photo
-> Save visual_job_id/output_url in content_bot_state
```

Layer revision:

```text
callback change_visual_text / change_illustration / change_background / change_layout
-> set mode = awaiting_visual_revision
-> save revision_target
-> next user message
-> POST /api/visual/revise
-> send new photo
```

Revision endpoint:

```text
POST {{ $env.DNK_VISUAL_COMPOSER_URL }}/api/visual/revise
```

Body:

```js
{{ JSON.stringify({
  job_id: $json.visual_job_id,
  target: $json.revision_target,
  instruction: $json.raw_text || $json.text || "",
  uploaded_assets: [],
  options: {
    enable_ai: false,
    return_mode: "json",
    save_output: true
  }
}) }}
```

The workflow export includes a starter `Revise Visual` node, but it is not wired into the live Data Table flow because the current table may not have `visual_job_id` and `revision_target` columns yet.

## Endpoint

Implemented in the DNK Next.js app:

```http
POST /api/visual/compose
Content-Type: application/json
```

## Request Body

```json
{
  "visual_job": {
    "job_type": "visual_production",
    "project_key": "monopoly",
    "visual_mode": "composer",
    "source_text": "история знакомства",
    "output_format": "square",
    "text_layer": {
      "enabled": true,
      "text": "ИСТОРИЯ ЗНАКОМСТВА",
      "position": "top",
      "locked": false
    },
    "illustration_layer": {
      "enabled": true,
      "asset_path": "local/path/to/illustration.png",
      "position": "bottom",
      "locked": false
    },
    "background_layer": {
      "enabled": true,
      "asset_path": "local/path/to/background.png",
      "locked": false
    },
    "layout": {
      "variant": "title_top_character_bottom",
      "width": 1080,
      "height": 1080,
      "safe_area": 64
    },
    "brand": {
      "logo_path": "",
      "colors": {
        "primary": "#FFD000",
        "accent": "#FF4A00",
        "dark": "#121A20"
      }
    }
  }
}
```

## Response Body

```json
{
  "ok": true,
  "output_url": "https://local-or-public-host/outputs/file.png",
  "output_path": "C:/Gorilla/dnkbiz/ai/agent/visual_composer/examples/outputs/file.png",
  "width": 1080,
  "height": 1080,
  "project_key": "monopoly",
  "visual_mode": "composer",
  "layout_variant": "title_top_character_bottom",
  "warnings": []
}
```

## n8n Changes

1. Keep `Visual Request Classifier`.
2. Keep `Project Profile Loader`.
3. Keep `Build Visual Job Payload`.
4. Use `HTTP Request: Compose Visual`.
5. Send `{{$json.visual_job}}` as request body.
6. Store response in visual job state:
   - `output_path`
   - `output_url`
   - `width`
   - `height`
   - `layout_variant`
   - `warnings`
7. Telegram send step:
   - If composer service exposes `output_url`, use Telegram `sendPhoto` by URL.
   - If n8n can access local file path, send binary file from `output_path`.
   - For print layouts, prefer `sendDocument` to avoid compression.

## Concrete n8n Node Settings

Node: `Compose Visual`

- Method: `POST`
- URL:

```text
={{ ($env.DNK_VISUAL_COMPOSER_URL || "").replace(/\/$/, "") + "/api/visual/compose" }}
```

- Headers:

```text
Authorization: ={{ "Bearer " + ($env.VISUAL_COMPOSER_API_KEY || "") }}
Content-Type: application/json
```

- JSON body:

```json
{
  "visual_job": "={{ $json.visual_job }}",
  "options": {
    "return_mode": "json",
    "save_output": true
  }
}
```

The v2.3 workflow export includes this node as a starter implementation. If n8n imports the nested JSON expression as a string instead of an object, manually switch the node to raw JSON body and use:

```js
{{ JSON.stringify({ visual_job: $json.visual_job, options: { return_mode: "json", save_output: true } }) }}
```

Node: `Build Telegram Visual Response`

Build:

- `chat_id`
- `output_url`
- `photo_url`
- `caption`
- `project_key`
- `visual_mode`

If `output_url` is relative, build the public URL:

```text
{{ $env.DNK_PUBLIC_BASE_URL + $json.output_url }}
```

Node: `Telegram API Send Visual Photo`

- Method: `POST`
- URL:

```text
https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendPhoto
```

- Body:
  - `chat_id = {{$json.chat_id}}`
  - `photo = {{$json.photo_url}}`
  - `caption = {{$json.caption}}`

## Revision Flow

For layer-specific callbacks:

- `change_visual_text`: update `visual_job.text_layer`, keep illustration/background locked.
- `change_illustration`: update `visual_job.illustration_layer`, keep text/background locked.
- `change_background`: update `visual_job.background_layer`, keep text/illustration locked.
- `change_layout`: update `visual_job.layout.variant`, keep assets and text locked.

After each update, call the composer again with the full visual job.

## Current MVP

The composer is available as CLI and API:

```bash
npm run visual:compose -- --job ai/agent/visual_composer/examples/jobs/monopoly.story-acquaintance.job.json
npm run visual:api:test
```

Required n8n env:

```text
DNK_VISUAL_COMPOSER_URL=https://your-public-dnk-app.example
DNK_PUBLIC_BASE_URL=https://your-public-dnk-app.example
VISUAL_COMPOSER_API_KEY=<same value as app env>
TELEGRAM_BOT_TOKEN=<telegram bot token>
```
