# V1.52 Hybrid Visual Engine Test Plan

Run offline only. Do not call OpenAI, BFL, YandexART, Telegram API, or n8n.

```bash
npm run visual:validate
npm run visual:assets:index
npm run visual:recipe-smoke
npm run visual:hybrid-economy-smoke
npm run visual:one-call-budget-smoke
npm run visual:idempotency-smoke
npm run visual:local-title-renderer-smoke
npm run visual:provider-routing-smoke
npm run visual:cost-ledger-smoke
npm run visual:pilot-report-smoke
npm run visual:production-plan-smoke
npm run visual:multi-pass-smoke
npm run visual:title-extraction-smoke
npm run visual:title-fit-smoke
npm run visual:visual-qa-smoke
npm run visual:layered-smoke
npm run visual:layer-pack-smoke
npm run telegram:visual:smoke
npm run telegram:visual:debug-smoke
npx tsc --noEmit --pretty false
```

Critical assertions:

- Normal Monopoly command with no new pose: `AI image calls = 0`.
- Monopoly command with new pose: `AI image calls <= 1`.
- Pay title generation: local title PNG exists, `AI image calls = 0`.
- Pay new character pose: `AI image calls <= 1`.
- Casper one-shot: `AI image calls <= 1`.
- Hockey existing photo/template: `AI image calls = 0`.
- Duplicate Telegram update: second trigger filtered, no second engine run.
- Service commands do not create visual jobs.
- Automatic AI retry is not allowed in `hybrid_economy`.
- Explicit new AI variant is a separate authorized paid action.
- Telegram and `/admin/visual` both call `VisualProductionEngine`.
