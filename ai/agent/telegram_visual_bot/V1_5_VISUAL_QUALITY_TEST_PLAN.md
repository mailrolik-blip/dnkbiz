# DNK Visual Bot v1.5 Visual Quality Test Plan

Focus: Monopoly and Monopoly Pay production visual quality.

## Preconditions

1. Upload and index approved assets:

```text
/asset_index
/asset_status monopoly
/asset_status pay
```

2. Confirm `/debug_job` shows `composer_usage ...=asset` for the expected layers.

## A. Monopoly Story

Command:

```text
сделай новую картинку для монополии история знакомства
```

Expected:

- title is `ИСТОРИЯ ЗНАКОМСТВА`;
- locked ded character is visible and not cropped;
- uploaded background is used;
- title is not cropped;
- no placeholder text or fake logo is rendered.

## B. Monopoly Results

Command:

```text
сделай новую картинку для монополии результаты конкурса
```

Expected:

- title is `РЕЗУЛЬТАТЫ КОНКУРСА`;
- no unnecessary `МОНОПОЛИЯ:` prefix;
- title and character do not overlap badly.

## C. Pay Yandex

Command:

```text
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
```

Expected:

- title is `ЯНДЕКС-ЯНДЕКС`;
- Pay character/logo/background are used;
- title is not cropped;
- Pay logo is visible but not dominant.

## D. Pay Bank Triggers

Command:

```text
сделай новую картинку для пэй новые триггеры банков
```

Expected:

- title is `НОВЫЕ ТРИГГЕРЫ БАНКОВ`;
- layout is readable;
- payment pills or uploaded icon are visible and clean.

## E. New Variant

Press `Новый вариант`.

Expected:

- `project_key` is preserved;
- title is preserved;
- locked character is preserved;
- background asset is preserved;
- layout changes to the next production variant;
- `/debug_job_full` includes `regenerate changed layout from X to Y`.

## F. Debug

Commands:

```text
/debug_job
/debug_job_full
```

Expected:

- short summary works;
- full debug is chunked if long;
- `composer_usage` shows asset layers.

## Local Quality Sheet

```bash
npm run visual:quality-sheet
```

Output:

```text
ai/agent/visual_composer/examples/outputs/quality-sheet/contact-sheet.png
```
