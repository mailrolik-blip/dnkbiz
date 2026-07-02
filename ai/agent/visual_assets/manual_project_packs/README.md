# Manual Project Packs

Эта папка предназначена для реальных ассетов проектов. По умолчанию содержимое подпапок игнорируется Git, кроме `README.md` и `.gitkeep`, чтобы клиентские PNG/JPG случайно не попали в репозиторий.

Структура:

```text
ai/agent/visual_assets/manual_project_packs/monopoly/
  backgrounds/
  illustrations/
  logos/
  references/
  templates/
  icons/
  photos/
  print/
  qr/

ai/agent/visual_assets/manual_project_packs/monopoly_pay/
  backgrounds/
  illustrations/
  logos/
  references/
  templates/
  icons/
  photos/
  print/
  qr/

ai/agent/visual_assets/manual_project_packs/casper/
  backgrounds/
  illustrations/
  logos/
  references/
  templates/
  icons/
  photos/
  print/
  qr/

ai/agent/visual_assets/manual_project_packs/gorilla_hockey/
  backgrounds/
  illustrations/
  logos/
  references/
  templates/
  photos/
  print/
  qr/
```

Как добавить ассет:

1. Положить `png` или `jpg` в нужную папку.
2. Рядом создать файл `<asset-name>.meta.json`.
3. Запустить `npm run visual:assets:index`.
4. Бот начнет использовать ассет, если `safe_for_auto_use=true` и теги совпадают с задачей.

Пример meta:

```json
{
  "tags": ["promo", "dark", "contest"],
  "usage": "background",
  "safe_for_auto_use": true,
  "description": "Approved promo background",
  "priority": 10,
  "project_key": "monopoly",
  "recommended_modes": ["composer"],
  "notes": ""
}
```

Для автоматического выбора полезны теги: `square`, `story`, `vk_post`, `promo`, `fintech`, `payment`, `character`, `base`, `hockey_generated_poster`, `hockey_photo_template`, `print_a4`, `print_a5`.

Ассеты можно добавлять и через Telegram caption:

```text
asset monopoly background tags: orange,promo,contest
asset pay icon tags: bank,pay
asset hockey logo tags: main
```
