# DNK MVP 1.50 Visual QA Test Plan

## Goal

Verify that production visual generation is stable across Monopoly, Monopoly Pay, Casper and Gorilla Hockey, with special focus on Pay title crop, real title layer export and reference/edit readiness.

## 1. Pay Yandex

Send:

```text
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
```

Expected:

- title is visible and not cropped;
- `title_box.x >= 0`;
- `/debug_job` shows `qa_errors=0`;
- `title_path` points to a real title PNG;
- output is 1920x1080.

## 2. Pay Bank Triggers

Send:

```text
сделай новую картинку для пэй новые триггеры банков
```

Expected:

- title is `НОВЫЕ ТРИГГЕРЫ БАНКОВ`;
- title stays inside safe area;
- Pay background/logo/character are preserved if available.

## 3. Text Crop Repair

Press `✏️ Текст`, then send:

```text
текст обрезается
```

Expected:

- title content does not change;
- title placement/scale is repaired;
- character, background and logo do not change;
- history/debug includes `title_crop_repair_by_user_command` or repair actions.

## 4. Character Pose

Press `Дед/персонаж`, then send:

```text
дед держит кубок
```

Expected when reference/edit is unavailable:

- locked character remains unchanged;
- bot sends a short warning that image reference/edit provider is not enabled;
- debug keeps the current character layer.

If the user sends:

```text
можно заменить персонажа
```

Expected:

- prompt-only replacement may be generated if AI is enabled and usage guard allows it;
- debug warns that character identity may differ.

## 5. Original PNG

Press:

```text
PNG без сжатия
```

Expected:

- Telegram sends the current final PNG as a document;
- no regeneration happens.

## 6. Layer ZIP

Press:

```text
Слои ZIP
```

Expected ZIP contents:

- `final.png`;
- `title.png`;
- `visual_job.json`;
- `manifest.json`;
- `placement.json`;
- available `background.png`, `character.png`, `logo.png`;
- `README.txt`.

## 7. Local Checks

Run without external API calls:

```bash
npm run visual:visual-qa-smoke
npm run visual:quality-gate
npm run visual:quality-sheet
npm run visual:reference-provider-check
```
