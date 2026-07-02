# DNK Visual Bot v2.6 manual Telegram test

## A. What We Test

```text
Telegram message
-> n8n
-> DNK /api/visual/produce
-> PNG in public/generated/visual
-> Telegram sendPhoto
```

Success means the bot sends a PNG from the local composer back to Telegram.

## B. Start DNK Locally

Run:

```bash
npm run visual:validate
npm run dev
```

If Windows catches `.next` `EPERM` locks:

1. Stop the dev server.
2. Close extra `node` processes.
3. Delete `.next` manually if Windows allows it.
4. Run `npm run dev` again.

Do not use destructive git cleanup commands.

## C. Check API Without n8n

Windows curl:

```bash
curl -X POST http://localhost:3000/api/visual/produce ^
  -H "Content-Type: application/json" ^
  -d @ai/agent/visual_composer/examples/requests/produce-monopoly.request.json
```

Expected response:

```json
{
  "ok": true,
  "job_id": "...",
  "output_url": "/generated/visual/....png"
}
```

The file should appear in:

```text
public/generated/visual/
```

The job record should appear in:

```text
.storage/visual_jobs/
```

## D. n8n Cloud Cannot See Localhost

If n8n is in cloud, `http://localhost:3000` points to the n8n server, not your computer.

Use one option:

- staging/public DNK URL;
- Cloudflare Tunnel;
- ngrok;
- local self-hosted n8n on the same machine.

## E. Required n8n ENV

```text
DNK_VISUAL_COMPOSER_URL=https://my-domain.com
DNK_PUBLIC_BASE_URL=https://my-domain.com
VISUAL_COMPOSER_API_KEY=
TELEGRAM_BOT_TOKEN=
```

Tunnel example:

```text
DNK_VISUAL_COMPOSER_URL=https://xxxx.trycloudflare.com
DNK_PUBLIC_BASE_URL=https://xxxx.trycloudflare.com
```

If `VISUAL_COMPOSER_API_KEY` is empty in DNK app, the Authorization header can be empty for local test. If the key is set, it must match in DNK and n8n.

## F. Check In n8n UI

- Import `ai/agent/ai_bot_designer/DNK Visual Bot Manual Test.workflow.json`.
- `Produce Visual` body must be JSON object, not a quoted string.
- `photo` in Telegram `sendPhoto` must be an absolute public URL.
- Telegram token must use `{{$env.TELEGRAM_BOT_TOKEN}}`, not a hardcoded token.
- Workflow must import cleanly.

## G. First Telegram Test

Send to bot:

```text
сделай картинку для монополии история знакомства
```

Expected:

- bot sends a PNG image;
- PNG appears in `public/generated/visual`;
- job record appears in `.storage/visual_jobs`;
- Telegram chat receives the photo.

## H. Second Test

Send:

```text
сделай картинку для pay яндекс-яндекс новый метод
```

Expected:

- bot sends square Monopoly Pay visual.

## I. Third Test

Send:

```text
сделай хоккейную афишу набор детей на тренировку
```

Expected:

- bot sends vertical hockey poster.

## J. What Counts As Success

Success:

- Telegram bot sends a PNG from composer.
- Placeholder assets are acceptable.
- Final style quality is not the goal of this test.
- The important contour is working:

```text
Telegram -> n8n -> /api/visual/produce -> PNG -> Telegram
```
