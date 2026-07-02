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
