# V1.0 Test Plan

## A. Local Smoke

```bash
npm run visual:validate
npm run telegram:visual:smoke
npx tsc --noEmit --pretty false
```

Expected:

- visual examples validate;
- Telegram smoke creates a job and two mock photo sends;
- TypeScript passes;
- no Telegram/OpenAI API call is made.

## B. Handler Smoke Without Telegram API

`npm run telegram:visual:smoke` covers:

- mock text update;
- produce visual;
- create Telegram chat state;
- callback `visual:revise:text`;
- revision text message;
- new PNG version through mock `sendPhotoFromFile`.

## C. Manual Telegram

Test commands:

- `/start`
- `/health`
- `сделай картинку для монополии история знакомства`
- press `✏️ Текст`
- `поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ`
- `/status`
- `/cancel`

## D. Files

Check:

- `public/generated/visual/*.png` exists;
- `.storage/visual_jobs/<job_id>.json` exists;
- `.storage/telegram_visual_bot/<chat_id>.json` exists.

## E. Security

Check:

- no real Telegram/OpenAI tokens in repo;
- `TELEGRAM_WEBHOOK_SECRET` is respected when set;
- `VISUAL_BOT_ALLOWED_USER_IDS` blocks unknown users when non-empty;
- generated PNGs and `.storage` are ignored by git.
# v1.1 note

This v1.0 plan is retained for regression coverage. Current production visual testing lives in `V1_1_PRODUCTION_VISUAL_TEST_PLAN.md`.
