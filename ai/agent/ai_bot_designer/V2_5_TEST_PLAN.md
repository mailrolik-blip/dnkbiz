# Visual Production Bot v2.5 test plan

## A. Produce

Run local app:

```bash
npm run dev
```

Call:

```bash
npm run visual:produce:test
```

Expected:

- response `ok=true`
- `job_id` exists
- `version=1`
- output PNG exists
- job record exists in `.storage/visual_jobs/`

## B. Revise

Use `job_id` from produce response.

Text revision:

```bash
npm run visual:revise -- --job-id <job_id> --target text --instruction "поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ"
```

Expected:

- version 2
- text layer changes
- illustration/background asset refs stay unchanged

Layout revision:

```bash
npm run visual:revise -- --job-id <job_id> --target layout --instruction "сделай другую композицию"
```

Expected:

- version 3
- layout variant changes
- text/background/illustration stay unchanged

For Windows shells with Cyrillic issues, use API JSON request files instead of CLI string args.

## C. Asset Index

Run:

```bash
npm run visual:assets:index
```

Expected:

- `ai/agent/visual_assets/manifest.local.json` is created.
- It is ignored by git.
- Empty asset folders produce valid manifest with empty `assets`.

## D. API

Endpoints:

- `POST /api/visual/produce`
- `GET /api/visual/jobs/<job_id>`
- `POST /api/visual/revise`

Expected:

- optional bearer auth works with `VISUAL_COMPOSER_API_KEY`
- no external API calls with `enable_ai=false`

## E. n8n

Checks:

- Workflow JSON parses.
- `Produce Visual` exists.
- `Revise Visual` starter node exists.
- No real Telegram tokens.
- Old route not destroyed.

Before wiring revision flow, add Data Table columns:

- `visual_job_id`
- `revision_target`
- `output_url`
