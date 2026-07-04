# DNK MVP 1.49 Title Layer Test Plan

## 1. Monopoly Story Title

Send:

```text
сделай новую картинку для монополии история знакомства
```

Expected:

- title is `ИСТОРИЯ ЗНАКОМСТВА`.
- title does not include `НОВУЮ КАРТИНКУ ДЛЯ МОНОПОЛИИ`.
- title is not cropped.
- `/debug_job` shows `title_extraction_method`, `extracted_title`, `title_box`, `title_fit`.

## 2. Monopoly Contest Results

Send:

```text
сделай новую картинку для монополии результаты конкурса
```

Expected title:

```text
РЕЗУЛЬТАТЫ КОНКУРСА
```

## 3. Pay Yandex

Send:

```text
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
```

Expected title:

```text
ЯНДЕКС-ЯНДЕКС
```

## 4. Pay Bank Triggers

Send:

```text
сделай новую картинку для пэй новые триггеры банков
```

Expected title:

```text
НОВЫЕ ТРИГГЕРЫ БАНКОВ
```

## 5. Crop Repair Command

Press `✏️ Текст`, then send:

```text
текст обрезается
```

Expected:

- title content stays the same.
- no AI regeneration.
- title placement/scale is adjusted.
- history/debug includes crop repair / placement update warning.

## 6. Debug

Run:

```text
/debug_job
```

Expected:

- `title_extraction_method` is not empty.
- `extracted_title` is the short title.
- `title_raw` differs from title for long commands.
- `title_fit` shows font/lines/warnings.
- `title_image_policy provider=composer` by default.

## v1.50 Carry-Forward

After v1.50, this same plan should also confirm:

- `title_image_layer.path` is present for composer fallback title layers.
- `title_box` is clamped inside canvas safe area.
- Pay layouts never produce negative title x/y.
- `/debug_job` includes QA and repair summary lines.
