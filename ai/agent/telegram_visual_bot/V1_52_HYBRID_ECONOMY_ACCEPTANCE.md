# DNK MVP 1.52 Hybrid Economy Acceptance

Recommended commit message:

```text
DNK MVP 1.52: add cost-controlled Visual Recipe engine
```

Production route:

```env
VISUAL_PIPELINE_MODE=hybrid_economy
VISUAL_MAX_AI_IMAGE_CALLS_PER_JOB=1
VISUAL_CHARACTER_EDIT_PROVIDER=disabled
```

Character edit provider precedence:

```text
VISUAL_CHARACTER_EDIT_PROVIDER -> legacy VISUAL_IMAGE_EDIT_PROVIDER -> disabled
```

Normal Telegram and `/admin/visual` runtime must not resolve the mock image provider. Mock is allowed only in smoke, test, or explicit fixture contexts.

Manual Telegram commands after restart:

```text
для пэй новая картинка: бонусы за июнь
для монополии новая картинка: результаты конкурса
```

Expected: 0 billable AI calls, local title PNG in `.storage/visual_generated_assets/<project>/<date>/<job_id>-title.png`, `title_source=local_renderer`.

For the real one-call Pay pose test configure:

```env
VISUAL_CHARACTER_EDIT_PROVIDER=openai
VISUAL_ENABLE_LIVE_IMAGE_PROVIDERS=true
OPENAI_API_KEY=<set outside repo>
```

Then run:

```text
для пэй новая картинка: бонусы за июнь, дед держит кубок
/debug_job
npm run visual:cost-report
```

Expected:

```text
recipe_title=БОНУСЫ ЗА ИЮНЬ
recipe_character_action=дед держит кубок
character_source=reference_edit
real_billable=1
```

If the provider is disabled or unavailable, expected fallback is `character_source=locked_asset`, `real_billable=0`, and no mock image output.

