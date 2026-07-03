# DNK Visual Telegram Bot v1.4 Style Pack Test Plan

## Цель

Проверить, что production visual bot использует project style pack: locked персонажи, логотипы, фоны, шаблоны и reference assets. AI должен генерировать только недостающий слой, а текст всегда рендерит composer.

## Monopoly: добавить нашего деда

1. Отправить в Telegram картинку персонажа с caption:

```text
asset monopoly character role: main_character tags: ded,main lock: locked
```

2. Выполнить:

```text
/asset_index
/asset_status monopoly
```

3. Сгенерировать визуал:

```text
сделай новую картинку для монополии история знакомства
```

4. Выполнить:

```text
/debug_job
```

Ожидаемо: `main_character` заполнен реальным asset path, `locked_assets` содержит путь персонажа, `style_warnings` содержит `main_character locked asset used`.

## Monopoly Pay: добавить логотипы и иконки

Отправить ассеты:

```text
asset pay logo role: brand_logo tags: main,pay lock: locked
asset pay icon tags: bank,card,pay lock: optional
asset pay reference role: style_reference tags: fintech,promo lock: reference_only
```

Затем:

```text
/asset_index
/asset_status pay
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
```

Если нужна картинка с нашим дедом, сначала добавьте Monopoly character, затем используйте формулировку `с нашим дедом`.

## Casper: добавить style references

```text
asset casper reference role: style_reference tags: warning,news lock: reference_only
asset casper template role: composition_reference tags: subscribe,contest lock: reference_only
/asset_index
/asset_status casper
сделай новую задачу для каспера фишинг
```

Ожидаемо: Casper выбирает `casper_warning_square`, `casper_news_square`, `casper_contest_square` или `casper_subscribe_square`, а `/debug_job` показывает `style_reference`.

## Gorilla Hockey: добавить logo/photo/template

```text
asset hockey logo role: brand_logo tags: main lock: locked
asset hockey template role: composition_reference tags: training,children lock: reference_only
asset hockey photo tags: training,children lock: replaceable
/asset_index
/asset_status hockey
задача для хоккея набор детей на тренировку
```

Ожидаемо: `/debug_job` показывает locked logo. Если пользователь отправляет фото с задачей, photo/template mode не генерирует новое главное фото.

## Как понять, что AI всё ещё prompt-only

В `/debug_job` или warning output ищите:

```text
reference assets selected but image reference input is not implemented; using prompt-only generation
```

Это означает, что resolver выбрал reference assets, но текущий OpenAI image provider пока не передаёт их как image input. Locked assets всё равно должны использоваться composer-слоями, если они заданы как character/logo/photo/template.

## Команды

```text
/asset_help
/asset_status
/asset_status monopoly
/asset_status pay
/asset_status casper
/asset_status hockey
/asset_list
/asset_project monopoly
/asset_project pay
/asset_project casper
/asset_project hockey
/asset_index
/debug_job
/ai_status
```

## Локальные проверки

Без внешних API:

```text
npm run visual:validate
npm run visual:assets:index
npm run visual:project-smoke
npm run visual:quality-check
npm run visual:contact-sheet
npm run visual:style-pack-smoke
npm run telegram:visual:smoke
npx tsc --noEmit --pretty false
```
# v1.5 addendum: real asset selection check

After upload and `/asset_index`, `/debug_job` must show separate evidence for manifest, selection and composer usage.

Expected Monopoly lines:

```text
manifest_backgrounds: 1
manifest_characters: 1
selection_background: ... selected=... path=...
selection_character: ... selected=... path=...
background: ai/agent/visual_assets/manual_project_packs/monopoly/backgrounds/...
main_character: ai/agent/visual_assets/manual_project_packs/monopoly/characters/...
composer: composer_usage background=asset character=asset
```

Expected Pay lines:

```text
manifest_backgrounds: 1
manifest_characters: 1
manifest_logos: 1
selection_background: ... selected=... path=...
selection_character: ... selected=... path=...
selection_logo: ... selected=... path=...
background: ai/agent/visual_assets/manual_project_packs/monopoly_pay/backgrounds/...
main_character: ai/agent/visual_assets/manual_project_packs/monopoly_pay/characters/...
logo: ai/agent/visual_assets/manual_project_packs/monopoly_pay/logos/...
composer: composer_usage background=asset character=asset logo=asset
```

If AI image limit is reached, `/debug_job` should show `AI skipped reason: daily_limit`; this must not hide asset selection lines.

# v1.5 visual quality follow-up

After style-pack selection passes, run:

```bash
npm run visual:quality-sheet
```

Then use `V1_5_VISUAL_QUALITY_TEST_PLAN.md` for manual Telegram checks covering Monopoly title fit, locked character placement, Pay logo/background/character usage and `Новый вариант` layout cycling.
