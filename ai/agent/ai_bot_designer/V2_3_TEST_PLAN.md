# Visual Production Bot v2.3 test plan

## A. CLI still works

Run:

```bash
npm run visual:validate
```

Expected:

- All example jobs build.
- PNG outputs exist.
- No external API calls are made.

## B. API local test

Start local app:

```bash
npm run dev
```

Call:

```bash
npm run visual:api:test
```

Expected:

- `status=200`
- `ok = true`
- `output_url` exists
- file exists under `public/generated/visual/`

Manual curl:

```bash
curl -X POST http://localhost:3000/api/visual/compose ^
  -H "Content-Type: application/json" ^
  -d @ai/agent/visual_composer/examples/requests/monopoly-compose.request.json
```

## C. API security

With `VISUAL_COMPOSER_API_KEY` set in app env:

- no auth -> `401`
- wrong auth -> `401`
- `Authorization: Bearer <VISUAL_COMPOSER_API_KEY>` -> `200`

When the env var is empty in local dev, unauthenticated local calls are allowed.

## D. n8n preparation

Checks:

- Workflow JSON parses.
- New nodes exist:
  - `Compose Visual`
  - `Build Telegram Visual Response`
  - `Telegram API Send Visual Photo`
- No real Telegram tokens are present.
- Credentials ids are unchanged.
- `Build Visual Job Payload` routes to `Compose Visual`.

Manual n8n UI check:

- Verify `Compose Visual` raw JSON body sends `visual_job` as an object, not a quoted string.
- Verify `DNK_VISUAL_COMPOSER_URL`, `DNK_PUBLIC_BASE_URL`, `VISUAL_COMPOSER_API_KEY`, `TELEGRAM_BOT_TOKEN` are configured.

## E. Telegram-ready URL

Expected:

- API response gives relative `output_url`.
- n8n builds absolute URL using:

```text
DNK_PUBLIC_BASE_URL + output_url
```

- Telegram can send the URL as photo.

For print layouts, later switch to `sendDocument`.
