# DNK Visual Telegram Bot v1.1 Production Visual Test Plan

Перед тестом:

- `VISUAL_BOT_ENABLED=true`
- `VISUAL_BOT_ENABLE_AI=false` для fallback-теста без внешних API
- `VISUAL_BOT_SEND_POST_TEXT=false` или `true`, если нужно получать текст поста отдельным сообщением
- webhook уже настроен на `/api/telegram/visual-bot/webhook`

## A. Monopoly

Команда:

```text
сделай новую картинку для монополии история знакомства
```

Ожидание:

- `project_key=monopoly`
- `visual_mode=composer`
- есть крупный title `ИСТОРИЯ ЗНАКОМСТВА`
- визуал не пустой: background, illustration placeholder/asset, text layer
- есть кнопки правок

## B. Monopoly Pay

Команда:

```text
для монополии пэй нужна новая картинка с текстом Яндекс-Яндекс
```

Ожидание:

- `project_key=monopoly_pay`
- title `ЯНДЕКС-ЯНДЕКС`
- sticker/subtitle про новый метод
- payment style, card/payment chips

## C. Casper

Команда:

```text
сделай новую задачу для каспера конкурс на 3000 пользователей
```

Ожидание:

- `project_key=casper`
- `visual_mode=style_generation`
- layout `casper_contest`
- текст overlay читаемый, база не plain background

## D. Hockey

Команда:

```text
сделай пост для хоккея завтра тренировка для детей надо пригласить родителей записаться
```

Ожидание:

- `project_key=gorilla_hockey`
- не `dnk`
- poster layout с Gorilla Hockey header, title plaque, CTA

## E. Hockey Photo

Отправить фото с caption:

```text
сделай хоккейную афишу набор детей
```

Ожидание:

- фото скачано в `.storage/telegram_visual_bot/uploads/`
- `visual_mode=hockey_photo_template`
- фото используется как background/photo layer

## F. Pending Photo

1. Отправить фото без caption.
2. Получить ответ: `Фото получил. Теперь напиши, что с ним сделать.`
3. Написать:

```text
сделай афишу набор детей 2016-2018
```

Ожидание:

- pending photo взят из state
- после успешной генерации pending asset очищен

## G. Text Revision

Нажать `✏️ Текст`, затем отправить:

```text
поменяй текст на НОВЫЙ СПОСОБ ОПЛАТЫ
```

Ожидание:

- version увеличилась
- изменился только text_layer
- background/illustration refs остались прежними

## H. Background Revision

Нажать `Фон`, затем:

```text
сделай фон темнее
```

Ожидание:

- version увеличилась
- text unchanged
- instruction сохранен в history/warnings, если нового asset/AI нет

## I. Layout

Нажать `Композиция`, затем:

```text
сделай другую композицию
```

Ожидание:

- version увеличилась
- layout variant поменялся
- text unchanged

## J. New Variant

Нажать `Новый вариант`.

Ожидание:

- создается новая версия через layout revision
- не заглушка

## K. Post Text

Нажать `Текст поста`.

Ожидание:

- бот отправляет `Текст поста: ...`
- если caption не создан, пишет `Текст поста пока не создан.`

## L. Asset Intake через Telegram

Отправить картинку с caption:

```text
asset monopoly background tags: orange,promo,contest
```

Ожидание:

- бот сохраняет файл в `ai/agent/visual_assets/manual_project_packs/monopoly/backgrounds/`
- рядом создается `.meta.json`
- ответ содержит `Ассет сохранён: monopoly/background`
- после `/asset_index` asset попадает в `manifest.local.json`

Другие примеры:

```text
asset pay icon tags: bank,pay
asset casper reference tags: warning,news
asset hockey logo tags: main
```

## M. Debug Job

После генерации отправить:

```text
/debug_job
```

Ожидание:

- бот показывает `job_id`, project, mode, layout, versions count
- показывает background/illustration/logo refs
- показывает fallback/quality/AI diagnostic logs без секретов

## N. AI Mode

Локально AI выключен. Для production-проверки:

```env
VISUAL_BOT_ENABLE_AI=true
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=
OPENAI_TEXT_MODEL=
VISUAL_AI_MAX_IMAGES_PER_REQUEST=1
```

Ожидание:

- если ключа нет или provider недоступен, бот не падает и использует fallback
- AI генерирует только illustration/background/base layer
- composer рендерит кириллицу сам
