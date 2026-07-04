# DNK Visual Bot v1.6 Layered Pipeline Test Plan

This plan covers the DNK MVP 1.47 Photoshop-like workflow.

## Layer Model

For Monopoly and Monopoly Pay the bot now builds:

```text
background_layer
character_layer
title_image_layer
logo_layer
decor_layer
final_composite
```

The old `text_layer` remains for fallback/debug and for projects that do not use title image layers.

## Aspect Ratios

Defaults:

- `monopoly`: `wide_1920x1080`
- `monopoly_pay`: `wide_1920x1080`
- `casper`: `wide_1920x1080`
- `gorilla_hockey`: `square_1024x1024`

Explicit phrases:

```text
1920x1080
1024x1024
1080x1080
1080x1920
квадрат
сторис
A4
A5
```

## Monopoly Manual Test

```text
сделай 1920x1080 картинку для монополии история знакомства
/debug_job
```

Expected:

- `resolved_size: 1920x1080`
- `character_layer` points to the locked ded asset
- `title_image_layer: source=composer_fallback` unless a title PNG is supplied
- `composer_usage background=asset character=asset title=composer_fallback`

## Pay Manual Test

```text
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
/debug_job
```

Expected:

- `resolved_size: 1920x1080`
- Pay background/logo/character are used
- title is preserved as `ЯНДЕКС-ЯНДЕКС`

## Original PNG

After generation press:

```text
PNG без сжатия
```

Expected: Telegram sends the current output as a document, without regenerating.

## Layer Pack

After generation press:

```text
Слои ZIP
```

Expected ZIP contents:

```text
final.png
background.png
character.png
title.png if a title asset exists
logo.png if a logo exists
visual_job.json
manifest.json
```

Layer packs are written under `.storage/visual_layer_packs/` and must not be committed.

## Revisions

- Text button updates `title_image_layer` / fallback text only.
- Character button targets `character_layer`.
- Background button targets `background_layer`.
- Layout button changes placement only.
- New variant preserves selected background, locked character and title text.

If a user asks for a new ded pose while the character is locked and image reference/edit flow is unavailable, the bot should warn that the locked character is preserved.

## Local Smokes

```bash
npm run visual:layered-smoke
npm run visual:layer-pack-smoke
npm run visual:quality-sheet
```

## v1.48 Addendum

For reference/edit and title-image production tests, use `V1_8_REFERENCE_EDIT_TEST_PLAN.md`.

Layer packs now include `prompt_log.txt` and `README.txt`; `title.png` is exported even when the title is composer fallback.

## v1.48 Art Direction Addendum

Layered pipeline now has production placement presets, manual title/character movement commands, title preprocessing and `placement.json` in layer packs. See `V1_8_ART_DIRECTION_TEST_PLAN.md`.
