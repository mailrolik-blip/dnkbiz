# DNK MVP 1.48 Art Direction Test Plan

Use this plan for manual Telegram validation of production layered layouts.

## 1. Monopoly Production Layout

Send:

```text
сделай новую картинку для монополии история знакомства
```

Expected:

- Output is 1920x1080.
- Background covers the full canvas.
- Title is large and dominates the left/center area.
- Ded/character is large on the right.
- `/debug_job` shows `preset`, `title_box`, `character_box`.
- Preview caption says to use `PNG без сжатия` for quality.

## 2. Text Placement

Press `✏️ Текст`, then send:

```text
увеличь текст
```

Expected:

- Same title text.
- No title regeneration.
- `title_image_layer.placement` changes.
- Final image recomposes with a bigger title.

Other commands:

```text
сделай текст меньше
текст левее
текст вправо
текст выше
текст ниже
растяни заголовок
сделай как в примере крупно
```

## 3. Character Placement

Press `Дед/персонаж`, then send:

```text
увеличь деда
```

Expected:

- Same ded asset.
- No AI generation.
- `character_layer.placement` changes.
- Character is larger in the final composite.

Other commands:

```text
сделай деда меньше
деда вправо
деда левее
деда вниз
деда наверх
поставь деда справа
поставь деда слева
```

## 4. Composition Preset

Press `Композиция`, then send:

```text
дед справа, текст слева как в примере
```

Expected:

- Preset switches to `monopoly_banner_like_reference` or the closest production preset.
- Assets are not regenerated.
- `/debug_job` shows new preset and boxes.

## 5. Pay Wide Layout

Send:

```text
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
```

Expected:

- Output is 1920x1080.
- Title is large.
- Pay character/logo/background are used if uploaded.
- Pay chips/icons remain readable.

## 6. Original PNG

Press:

```text
PNG без сжатия
```

Expected:

- Latest final PNG is sent as a Telegram document.

## 7. Layer ZIP

Press:

```text
Слои ZIP
```

Expected ZIP contents:

- `final.png`
- `background.png` if present
- `character.png` if present
- `title.png`
- `logo.png` if present
- `visual_job.json`
- `placement.json`
- `manifest.json`
- `prompt_log.txt`
- `README.txt`

## 8. Provider Check

Local command:

```bash
npm run visual:reference-provider-check
```

Expected without live mode:

- No external OpenAI call.
- Prints current support flags and reason if reference/edit is unavailable.

## DNK MVP 1.49 Title Fit Addendum

The title layer now uses deterministic command-title extraction, composer-safe Cyrillic title rendering, title fit metadata and the manual crop repair command `текст обрезается`.

See `V1_9_TITLE_LAYER_TEST_PLAN.md`.
