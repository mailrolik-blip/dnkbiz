# DNK Visual Telegram Bot v1.3 AI Test Plan

## A. Enable AI

`.env.local`:

```env
VISUAL_BOT_ENABLE_AI=true
OPENAI_API_KEY=...
OPENAI_TEXT_MODEL=
OPENAI_IMAGE_MODEL=
OPENAI_IMAGE_QUALITY=medium
OPENAI_IMAGE_SIZE=1024x1024
VISUAL_AI_MAX_IMAGES_PER_REQUEST=1
VISUAL_AI_DAILY_LIMIT=20
VISUAL_AI_COST_GUARD=true
```

If model env is empty, the provider uses safe defaults that can be overridden.

## B. Text-only Smoke

This should make a text provider call only when AI env is enabled and the key is present:

```bash
npm run visual:ai-smoke
```

## C. One Image Smoke

Run manually only:

```bash
npm run visual:ai-smoke -- --image --project monopoly
```

This can spend image-generation budget.

## D. Telegram Tests

1. `/ai_status`
2. `сделай новую картинку для монополии история знакомства`
3. `для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс`
4. `сделай новую задачу для каспера конкурс на 3000 пользователей`
5. `сделай пост для хоккея завтра тренировка для детей`
6. Press `Иллюстрация`, send `сделай другую иллюстрацию`
7. Press `Фон`, send `замени фон на более тёмный`
8. `/debug_job`

Expected:

- AI generates layer assets under `.storage/visual_generated_assets/<project>/<date>/`.
- Composer still renders Russian text.
- `/debug_job` shows model, fallback reason, prompt summary and asset paths.

## E. Cost Guard

`VISUAL_AI_DAILY_LIMIT` controls daily image generation count.

`/ai_status` shows:

- AI enabled;
- key present yes/no;
- text/image models;
- daily limit;
- usage today.

If limit is reached, bot must use fallback and not call image generation.

## F. If AI Does Not Work

Check:

- `OPENAI_API_KEY` missing;
- model env unsupported;
- account/project permissions;
- organization verification for image model;
- moderation or policy block;
- network/API error;
- daily limit reached.

Fallback should still produce PNG.

## G. v1.4 style lock note

For current production checks, use `V1_4_STYLE_PACK_TEST_PLAN.md` after this AI plan. v1.4 keeps composer-rendered text, uses locked style pack assets for characters/logos/photos, and logs a warning when selected reference assets cannot yet be sent as image input.
