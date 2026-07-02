# DNK Native Telegram Visual Bot

Native Telegram bot MVP for the visual production pipeline.

Flow:

```text
Telegram
-> DNK /api/telegram/visual-bot/webhook
-> visual production pipeline
-> PNG
-> Telegram sendPhoto
```

The bot does not use n8n as the main path. n8n remains an optional integration layer.

## Environment

Use `.env.visual-bot.example` as a checklist.

```env
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
VISUAL_BOT_ENABLED=true
VISUAL_BOT_ALLOWED_USER_IDS=
VISUAL_BOT_ADMIN_CHAT_ID=
NEXT_PUBLIC_APP_URL=
OPENAI_API_KEY=
VISUAL_BOT_ENABLE_AI=false
```

`VISUAL_BOT_ENABLE_AI=false` keeps local tests deterministic and prevents OpenAI calls.

## Local Checks

```bash
npm run visual:validate
npm run telegram:visual:smoke
npx tsc --noEmit --pretty false
```

`telegram:visual:smoke` uses a mock Telegram client. It does not call Telegram API.

## Run

```bash
npm run dev
```

Expose local DNK through staging, Cloudflare Tunnel, or ngrok:

```bash
cloudflared tunnel --url http://localhost:3000
```

Set webhook:

```bash
npm run telegram:visual:set-webhook -- --url https://xxxxx.trycloudflare.com
```

Check webhook:

```bash
npm run telegram:visual:get-webhook
```

Delete webhook:

```bash
npm run telegram:visual:delete-webhook
```

## First Telegram Test

Send:

```text
сделай картинку для монополии история знакомства
```

Expected:

- bot replies `Принял, собираю картинку...`
- bot sends a PNG from `public/generated/visual/`
- job record appears in `.storage/visual_jobs/`
- chat state appears in `.storage/telegram_visual_bot/`
- message has inline revision buttons

## Text Revision Test

1. Press `✏️ Текст`.
2. Send:

```text
поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ
```

Expected:

- bot replies `Принял правку, пересобираю картинку...`
- bot sends a new PNG version
- only `text_layer` should change in the visual job revision

## Current Limits

- Voice transcription is disabled unless AI is explicitly enabled later.
- Photo upload stores/downloads the file when Telegram access is available, but the MVP focus is text commands.
- `Новый вариант` is a placeholder.
- Real client assets and fonts are not included.
# Current production status

Native Telegram visual bot is the main path for v1.1:

```text
Telegram -> DNK webhook -> project profile -> asset/AI layer selection -> composer -> PNG -> Telegram -> layer-aware revisions
```

n8n is optional integration only and is not required for the production visual path.

Supported UX:

- new visual from text;
- text / illustration / background / composition revisions;
- new variant;
- post text callback;
- uploaded photo flow for Hockey templates;
- safe fallback if AI/assets are missing.

Useful flags:

- `VISUAL_BOT_ENABLE_AI=false` by default;
- `VISUAL_BOT_SEND_POST_TEXT=false` by default;
- `VISUAL_ASSET_MANIFEST_PATH` can point to a custom manifest.

Run local checks:

```bash
npm run telegram:visual:smoke
npm run visual:project-smoke
```

## Asset Intake

Send a photo/document with caption:

```text
asset monopoly background tags: orange,promo,contest
asset pay icon tags: bank,pay
asset casper reference tags: warning,news
asset hockey logo tags: main
```

Then run `/asset_index` in Telegram or `npm run visual:assets:index` locally.

Diagnostics:

```text
/debug_job
```
