# Visual Production Bot v2.4 test plan

## A. CLI

Run:

```bash
npm run visual:validate
npm run visual:build-job -- --request ai/agent/visual_composer/examples/requests/produce-monopoly.request.json
```

Expected:

- Old example jobs build.
- Produce requests build visual jobs and PNG outputs.
- Built job JSON appears under `ai/agent/visual_composer/examples/outputs/jobs/`.
- No external API calls are made with `enable_ai=false`.

## B. API

Start app:

```bash
npm run dev
```

Call:

```bash
npm run visual:produce:test
```

Expected:

- `status=200`
- `ok=true`
- `detected.project_key=monopoly`
- `output_url` exists
- PNG exists under `public/generated/visual/`

## C. Expected produce cases

- `produce-monopoly.request.json` -> square PNG.
- `produce-monopoly-pay.request.json` -> square PNG.
- `produce-casper.request.json` -> square PNG.
- `produce-gorilla-hockey.request.json` -> 1080x1350 PNG.
- `produce-gorilla-print.request.json` -> high-res A4 PNG.

## D. Security

With `VISUAL_COMPOSER_API_KEY` set:

- no auth -> `401`
- wrong auth -> `401`
- correct bearer token -> `200`

With empty key in local dev:

- unauthenticated local request is allowed.

## E. n8n

Checks:

- Workflow JSON parses.
- `Produce Visual` node exists.
- Old OpenAI image route is not deleted.
- No real Telegram tokens exist.
- Manual n8n UI check confirms raw JSON body is sent as object.

Required n8n env:

- `DNK_VISUAL_COMPOSER_URL`
- `DNK_PUBLIC_BASE_URL`
- `VISUAL_COMPOSER_API_KEY`
- `TELEGRAM_BOT_TOKEN`
