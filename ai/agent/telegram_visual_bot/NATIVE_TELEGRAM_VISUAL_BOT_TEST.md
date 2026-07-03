# Native Telegram Visual Bot Test

Практический тест без n8n.

## 1. Локальная проверка

```bash
npm run visual:validate
npm run telegram:visual:smoke
npx tsc --noEmit --pretty false
```

`telegram:visual:smoke` не вызывает Telegram API. Он использует mock client, создаёт visual job, PNG и state.

## 2. Запуск DNK

```bash
npm run dev
```

Если Windows ловит EPERM по `.next`:

- закрыть dev server;
- закрыть процессы `node`;
- удалить `.next` вручную;
- запустить `npm run dev` снова.

## 3. Поднять публичный URL

Для Telegram webhook нужен публичный HTTPS URL.

Пример:

```bash
cloudflared tunnel --url http://localhost:3000
```

Можно использовать staging/public domain или ngrok.

## 4. Env

DNK app:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=любая_строка_или_пусто
VISUAL_BOT_ENABLED=true
VISUAL_BOT_ALLOWED_USER_IDS=
VISUAL_BOT_ENABLE_AI=false
NEXT_PUBLIC_APP_URL=https://xxxxx.trycloudflare.com
```

Если `VISUAL_BOT_ALLOWED_USER_IDS` пустой, локально разрешены все пользователи.

## 5. Поставить webhook

```bash
npm run telegram:visual:set-webhook -- --url https://xxxxx.trycloudflare.com
```

Проверить:

```bash
npm run telegram:visual:get-webhook
```

## 6. Проверить команды

Написать боту:

```text
/start
```

Ожидаемо:

```text
Привет. Я visual bot. Напиши: сделай картинку для монополии история знакомства
```

Потом:

```text
/health
```

Ожидаемо:

```text
Visual bot работает.
```

## 7. Первый visual test

Написать:

```text
сделай картинку для монополии история знакомства
```

Ожидаемо:

- бот отвечает `Принял, собираю картинку...`;
- бот присылает PNG;
- создаётся `.storage/visual_jobs/<job_id>.json`;
- создаётся `public/generated/visual/*.png`;
- создаётся `.storage/telegram_visual_bot/<chat_id>.json`;
- у фото есть кнопки правок.

## 8. Правка текста

1. Нажать `✏️ Текст`.
2. Написать:

```text
поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ
```

Ожидаемо:

- бот отвечает `Принял правку, пересобираю картинку...`;
- бот присылает новую PNG-версию;
- `job_id` остаётся тем же;
- версия увеличивается;
- фон/иллюстрация/композиция не пересоздаются случайно.

## 9. Статус и отмена

```text
/status
```

Показывает `mode`, `active_job_id`, `revision_target`.

```text
/cancel
```

Сбрасывает ожидание правки.

## 10. Отключить webhook

```bash
npm run telegram:visual:delete-webhook
```

## Частые ошибки

- Старый n8n webhook всё ещё назначен на этого Telegram bot token.
- Tunnel выключен или поменял URL.
- `TELEGRAM_BOT_TOKEN` не задан.
- `VISUAL_BOT_ENABLED=false`.
- `TELEGRAM_WEBHOOK_SECRET` в env не совпадает с Telegram webhook secret.
- Windows держит lock на `.next`.
- `sendPhoto` не видит файл: проверить `output_path` и права на `public/generated/visual`.
# v1.1 update

Use `V1_1_PRODUCTION_VISUAL_TEST_PLAN.md` for the current production visual scenarios across Monopoly, Monopoly Pay, Casper and Gorilla Hockey. v1.1 adds uploaded photo handling, post text callback, new variant callback and project-aware fallback visuals.

# v1.2 update

Asset intake:

```text
/asset_help
asset monopoly background tags: orange,promo,contest
/asset_index
/asset_status
```

Debug active job:

```text
/debug_job
```

AI mode remains opt-in:

```env
VISUAL_BOT_ENABLE_AI=true
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=
OPENAI_TEXT_MODEL=
```

For visual review:

```bash
npm run visual:project-smoke
npm run visual:contact-sheet
```

# v1.3 update

AI manual checks:

```bash
npm run visual:ai-smoke
npm run visual:ai-smoke -- --image --project monopoly
```

Telegram commands:

```text
/ai_status
/ai_on
/ai_off
/debug_job
```

Full plan: `V1_3_AI_TEST_PLAN.md`.

# v1.4 update

Style pack checks:

```text
/asset_help
/asset_project monopoly
asset monopoly character role: main_character tags: ded,main lock: locked
/asset_index
/asset_status monopoly
сделай новую картинку для монополии история знакомства
/debug_job
```

Expected: `/debug_job` shows `main_character`, `locked_assets`, selected assets by role, AI usage, fallback reasons and warnings. Full plan: `V1_4_STYLE_PACK_TEST_PLAN.md`.
# v1.5 asset/debug checks

Use this flow when a real uploaded asset is not visible in the final image:

```text
/asset_index
/asset_status monopoly
generate image
/debug_job
```

Check `/debug_job` in this order:

```text
manifest_backgrounds: ...
selection_background: ... selected=... path=...
background: ...
composer: composer_usage background=asset ...
AI skipped reason: daily_limit|missing_key|asset_locked|provider_error|disabled|-
```

For local AI usage:

```text
/ai_usage
```

For local development reset only:

```bash
npm run visual:ai-usage:reset -- --yes
```

# v1.5.1 debug hardening

Use `/debug_job` for the compact summary. Use `/debug_job_full` only when resolver logs, compose logs and AI logs are needed.

If Telegram is stuck retrying an old failing debug update:

```bash
npm run telegram:visual:drop-pending
npm run telegram:visual:set-webhook -- --url <url> --drop-pending
```

Run the no-network debug chunking smoke:

```bash
npm run telegram:visual:debug-smoke
```

# v1.5 visual quality pass

Manual quality plan:

```text
ai/agent/telegram_visual_bot/V1_5_VISUAL_QUALITY_TEST_PLAN.md
```

Generate local Monopoly/Pay quality sheet:

```bash
npm run visual:quality-sheet
```

# v1.47 layered pipeline

Manual plan:

```text
ai/agent/telegram_visual_bot/V1_6_LAYERED_PIPELINE_TEST_PLAN.md
```

Check original delivery buttons:

```text
PNG без сжатия
Слои ZIP
```
