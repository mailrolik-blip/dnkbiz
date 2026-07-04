# DNK MVP 1.48 Reference/Edit Test Plan

This plan covers the production layer workflow for Monopoly and Monopoly Pay.

## Preconditions

- `VISUAL_BOT_ENABLE_AI=true` for manual AI tests.
- `OPENAI_API_KEY` is configured locally, but never committed.
- `VISUAL_AI_DAILY_LIMIT` is high enough for the manual session.
- Real client assets stay in `ai/agent/visual_assets/manual_project_packs/` and remain gitignored.

Automated smoke tests do not call OpenAI or Telegram APIs.

## A. Add Ded Character

Send an image with caption:

```text
asset monopoly character role: main_character tags: ded,main lock: locked
```

Then run in Telegram:

```text
/asset_index
/asset_status monopoly
```

Expected:

- `characters` is at least `1`.
- `locked_assets` is at least `1`.

## B. Add Title Style Reference

Send an image with caption:

```text
asset monopoly reference role: title_style_reference tags: orange,3d,text lock: reference_only
```

For Pay:

```text
asset pay reference role: title_style_reference tags: blue,white,3d,text lock: reference_only
```

Then run:

```text
/asset_index
/asset_status monopoly
/asset_status pay
```

Expected:

- `title_style_references` is at least `1` for the project where the asset was uploaded.

## C. Generate Monopoly Image

Send:

```text
сделай новую картинку для монополии история знакомства
```

Expected:

- Output is 1920x1080 by default.
- `character_layer` points to the locked ded asset.
- `title_image_layer` exists.
- If AI title image generation is unavailable or disabled, `title_image_layer.source=composer_fallback`.

## D. Text Revision

Press `✏️ Текст`, then send:

```text
поменяй текст на РЕЗУЛЬТАТЫ КОНКУРСА
```

Expected:

- Only `title_image_layer` / `text_layer` changes.
- Character, background and logo stay unchanged.
- `/debug_job` shows updated `title_image_layer.text`.

## E. Character Revision

Press `Дед/персонаж`, then send:

```text
дед держит кубок
```

Expected when image reference/edit is available:

- New generated character layer is saved under `.storage/visual_generated_assets/<project>/<date>/`.
- `character_layer.generated_asset_path` is set.
- Background, title and logo stay unchanged.

Expected when image reference/edit is unavailable:

- Bot preserves the locked character.
- Warnings include `image reference/edit not available in current provider`.
- No prompt-only random character silently replaces the locked ded.

## F. Explicit Unlock

Press `Дед/персонаж`, then send:

```text
можно заменить персонажа, сгенерируй нового деда с телефоном
```

Expected:

- Prompt-only replacement is allowed only because the user explicitly unlocked the character.
- Debug/history includes `character lock overridden by user`.

## G. Send Original

Press:

```text
PNG без сжатия
```

Expected:

- Telegram sends the latest final PNG as a document, without recompression.

## H. Send Layers

Press:

```text
Слои ZIP
```

Expected ZIP files:

- `final.png`
- `background.png` if present
- `character.png` if present
- `title.png`
- `logo.png` if present
- `decor/` if present
- `visual_job.json`
- `manifest.json`
- `prompt_log.txt`
- `README.txt`

## I. Local Smoke Commands

```bash
npm run visual:title-layer-smoke
npm run visual:reference-flow-smoke
npm run visual:layer-pack-smoke
```

Expected:

- No external API calls.
- Title layer fallback is exported as `title.png`.
- Reference flow smoke returns the expected capability warning and preserves locked character.
