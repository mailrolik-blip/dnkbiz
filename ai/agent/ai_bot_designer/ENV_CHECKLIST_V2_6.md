# ENV checklist for v2.6 manual Telegram test

## DNK app

- `VISUAL_COMPOSER_API_KEY` — optional for local dev. If set, n8n must send the same value as bearer token.
- `NEXT_PUBLIC_APP_URL` — optional app public URL.

## n8n

- `DNK_VISUAL_COMPOSER_URL` — where n8n sends API requests, for example `https://my-domain.com`.
- `DNK_PUBLIC_BASE_URL` — where Telegram downloads generated PNG files, usually the same as `DNK_VISUAL_COMPOSER_URL`.
- `VISUAL_COMPOSER_API_KEY` — must match DNK app env if the app key is set.
- `TELEGRAM_BOT_TOKEN` — Telegram bot token; keep it in env, never hardcode it in workflow URLs.

## Examples

Staging/public domain:

```text
DNK_VISUAL_COMPOSER_URL=https://my-domain.com
DNK_PUBLIC_BASE_URL=https://my-domain.com
```

Tunnel:

```text
DNK_VISUAL_COMPOSER_URL=https://xxxx.trycloudflare.com
DNK_PUBLIC_BASE_URL=https://xxxx.trycloudflare.com
```

If `VISUAL_COMPOSER_API_KEY` is empty in DNK app, remove/leave empty the Authorization header for local testing. If it is set, DNK and n8n values must match.
