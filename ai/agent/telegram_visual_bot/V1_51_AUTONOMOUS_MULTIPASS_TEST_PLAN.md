# DNK MVP 1.51 Autonomous Multi-Pass Test Plan

## Goal

Verify that one Telegram command can create a layered Monopoly/Pay production visual without requiring pre-made future title PNGs or pose PNGs.

## Workflow

One command runs:

```text
command -> production plan -> title layer -> character layer -> background -> compose -> visual QA -> selective repair -> final PNG/ZIP
```

Approved assets remain useful as cache/manual override/fallback, but default layer policy is:

```bash
VISUAL_LAYER_SOURCE_POLICY=generate_first
```

## Manual Pay Test

Send:

```text
для пэй новая картинка: новые триггеры банков, дед проходит между лучами сигнализации
```

Expected:

- title extracted as `НОВЫЕ ТРИГГЕРЫ БАНКОВ`;
- production plan shows `title.action=generate`;
- production plan shows `character.action=reference_edit`;
- background is reused unless a new background is explicitly requested;
- final output is 1920x1080;
- `/debug_job` shows production mode, phase, title attempts, character attempts, final critic result and image calls.

## Fast / Quality

Commands:

```text
/visual_fast
/visual_quality
/visual_mode
```

Expected:

- fast mode uses one title/character attempt;
- quality mode allows verification and retry attempts;
- `/debug_job` shows `production_mode`.

## Character Reference/Edit

For live testing only:

```bash
VISUAL_ENABLE_LIVE_REFERENCE_TEST=true npm run visual:openai-edit-smoke -- --image <path> --prompt "same character holding a cup"
```

Expected:

- input image detected as PNG/JPEG/WEBP by magic bytes or extension;
- reference image normalized to `.storage/visual_reference_inputs/<job_id>/reference-01.png`;
- OpenAI receives `image/png`, not `application/octet-stream`;
- one OpenAI `images.edit` call;
- output saved under `.storage`;
- CLI prints `OUTPUT PNG: <path>`;
- no key is printed.

## Production Live Smoke

For live testing only:

```bash
VISUAL_ENABLE_LIVE_PRODUCTION_TEST=true npm run visual:production-live-smoke -- --project monopoly_pay --command "новые триггеры банков, дед проходит между лучами сигнализации"
```

Expected:

- title and character phases call live image provider when AI/key are available;
- final job records production diagnostics;
- `character_source=reference_edit` when edit succeeds;
- final output is 1920x1080 for Pay/Monopoly;
- CLI prints `FINAL PNG: <path>`.

## Telegram Acceptance Test

Primary acceptance is Telegram, not `production-live-smoke`.

Send:

```text
для пэй новая картинка: новые триггеры банков, дед проходит между лучами сигнализации
```

Expected:

- route is `autonomous_multi_pass`;
- title layer is generated separately;
- title is verified;
- locked Pay `main_character` is the primary identity reference;
- approved pose assets can be secondary references, not the primary identity;
- `images.edit` request for `gpt-image-2` does not include `input_fidelity`;
- `character_source=reference_edit` when edit succeeds;
- background is reused from project assets;
- final output is 1920x1080 and delivered in Telegram.

If edit fails, the caption must say that a fallback character layer was used.

## Offline Checks

Run:

```bash
npm run visual:production-plan-smoke
npm run visual:multi-pass-smoke
npm run visual:image-mime-smoke
npm run visual:reference-normalization-smoke
npm run visual:cli-path-smoke
npm run visual:image-edit-params-smoke
npm run visual:title-verification-smoke
npm run visual:character-critic-smoke
```

Expected:

- planner creates separate layer actions;
- multi-pass pipeline calls title and character phases separately;
- title verification catches mismatch;
- character critic returns structured consistency fields.
- invalid local image input aborts character generation after one non-retryable attempt.
- unsupported edit parameter errors are non-retryable.
- `gpt-image-2` skips unsupported `input_fidelity`.
- Telegram smoke confirms Monopoly command route is `autonomous_multi_pass`.
- Windows absolute paths with Cyrillic/spaces are not resolved under the repo.

## Current Limitations

- Offline tests use mock verification and safe fallback rendering.
- Live title OCR/vision verification is prepared structurally but should be hardened with a real vision model before full production autonomy.
- Character consistency checking is a structured critic interface; thresholds and prompts need real client asset calibration.
