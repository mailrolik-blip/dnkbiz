# DNK Content Operator Bot v1 audit

Дата аудита: 2026-07-02.

Исходный workflow: `ai/agent/ai_bot_designer/DNK Content Operator Bot v1.json`.
Backup перед правками: `ai/agent/ai_bot_designer/backups/DNK Content Operator Bot v1.20260702-142553.json`.

## Краткий вывод

Workflow уже закрывает базовую цепочку Telegram -> текст/голос -> draft -> approve -> image -> preview -> inline buttons -> publish to test Telegram channel. Но текущая структура построена вокруг генерации поста и одной картинки целиком. Для Visual Production Bot v2 мешают: отсутствие project profile loader, отсутствие state модели визуальной задачи, смешивание текста/иллюстрации/фона в одном prompt, слабая маршрутизация callback, некорректные Data Table conditions и mojibake в части русскоязычных expressions.

## Ноды workflow

| Нода | Тип | Роль |
| --- | --- | --- |
| Telegram Trigger | `n8n-nodes-base.telegramTrigger` | Принимает `message` и `callback_query`. |
| Message Type | `n8n-nodes-base.switch` | Делит вход на callback, voice, text reply, normal text. |
| Edit Fields | `n8n-nodes-base.set` | Нормализует обычное текстовое сообщение. |
| Detect Project Profile | `n8n-nodes-base.set` | Простое keyword-определение проекта и `visual_mode`. |
| Message a model | `@n8n/n8n-nodes-langchain.openAi` | Генерирует структурированный draft поста. |
| Telegram API Draft Reply | `n8n-nodes-base.httpRequest` | Отправляет draft и кнопки approve/revise/cancel. |
| Get a file | `n8n-nodes-base.telegram` | Получает Telegram voice file. |
| Transcribe a recording | `@n8n/n8n-nodes-langchain.openAi` | Транскрибирует голос. |
| Normalize Voice Task | `n8n-nodes-base.set` | Превращает transcription в text task. |
| Normalize Callback | `n8n-nodes-base.set` | Нормализует callback action, original_text, photo_file_id. |
| Build Final Post | `n8n-nodes-base.set` | Парсит draft caption/text в `final_post`, `image_prompt`, `image_text`. |
| Final Action Type | `n8n-nodes-base.switch` | Маршрутизирует approve/publish/regenerate/revise actions. |
| Build Image Payload | `n8n-nodes-base.set` | Собирает payload для генерации картинки. |
| OpenAI Image | `@n8n/n8n-nodes-langchain.openAi` | Генерирует квадратную картинку `gpt-image-1`. |
| Send Photo | `n8n-nodes-base.telegram` | Отправляет preview с inline keyboard. |
| Save Preview Meta | `n8n-nodes-base.set` | Извлекает preview ids, но не пишет их в persistent state. |
| HTTP Request | `n8n-nodes-base.httpRequest` | Публикует фото в `@DNKTestPosts`. |
| Was Published To Telegram | `n8n-nodes-base.switch` | Проверяет `publish_telegram`. |
| HTTP Request1 | `n8n-nodes-base.httpRequest` | Сообщает пользователю об успешной публикации. |
| Get Bot State | `n8n-nodes-base.dataTable` | Читает `content_bot_state` по `chat_id`. |
| Text State Router | `n8n-nodes-base.switch` | Роутит текст в image_revision/text_revision/normal_text. |
| Save Awaiting Image Revision | `n8n-nodes-base.dataTable` | Пишет state ожидания правки. |
| Ask Image Revision Text | `n8n-nodes-base.httpRequest` | Просит пользователя прислать правку картинки. |
| Normalize Image Revision | `n8n-nodes-base.set` | Собирает prompt для новой картинки по правке. |
| Build Text Revision Prompt | `n8n-nodes-base.set` | Собирает prompt для новой версии текста. |
| Ask Text Revision | `n8n-nodes-base.httpRequest` | Просит пользователя прислать правку текста. |
| Reset State Before New Task | `n8n-nodes-base.dataTable` | Пытается сбросить state перед новой задачей. |
| Clear Bot State | `n8n-nodes-base.dataTable` | Disabled; должен очищать state после preview. |

## Рабочие ветки

- Text task: `Telegram Trigger` -> `Message Type` normal text -> `Get Bot State` -> `Text State Router` normal_text -> `Reset State Before New Task` -> `Edit Fields` -> `Detect Project Profile` -> `Message a model` -> `Telegram API Draft Reply`.
- Voice task: `Telegram Trigger` -> `Message Type` voice -> `Get a file` -> `Transcribe a recording` -> `Normalize Voice Task` -> `Message a model` -> `Telegram API Draft Reply`.
- Approve draft: callback `approve` -> `Normalize Callback` -> `Build Final Post` -> `Final Action Type` approve -> `Build Image Payload` -> `OpenAI Image` -> `Send Photo`.
- Publish to test Telegram channel: callback `publish_telegram` -> `HTTP Request` sendPhoto to `@DNKTestPosts` -> `HTTP Request1` success message.
- Regenerate image: callback `regenerate_image` идет в `Build Image Payload` и заново вызывает `OpenAI Image`.

## Сломанные или рискованные ветки

- `revise_image`: callback сохраняет state через `Save Awaiting Image Revision`, затем просит текст. Но node пишет `mode: awaiting_text_revision`, хотя `Text State Router` ожидает `awaiting_image_revision` для image revision. Ветка правки картинки фактически маршрутизируется как text revision.
- `revise_text`: одновременно идет в `Save Awaiting Image Revision` и `Ask Text Revision`. State node называется image revision и тоже пишет `awaiting_text_revision`; naming вводит в заблуждение, данные для текстовой правки смешаны с image state.
- `regenerate_text`: идет в `Build Text Revision Prompt` -> `Message a model` -> `Telegram API Draft Reply`. В `Build Text Revision Prompt.revision` используется `Telegram Trigger.message.text`, которого нет у callback query; значение будет пустым или ошибочным.
- `Text State Router` output `text_revision` не подключен никуда. Подключены только output 0 (`image_revision`) и output 2 (`normal_text`). Поэтому ожидаемая text revision ветка не доходит до генерации.
- `Clear Bot State` disabled. После preview state не очищается через эту ноду.
- `Save Preview Meta` только Set node; persistent metadata не сохраняется в Data Table. Для дальнейших правок нет надежного `visual_job_state`.
- `Build Final Post` парсит русские заголовки через mojibake-строки (`Р“Рѕ...`). Это работает только если текущий текст в той же сломанной кодировке. При нормальном UTF-8 ответе модели парсинг может не найти секции.
- `Normalize Callback` содержит assignment name `=chat_id` вместо `chat_id`. Если n8n воспринимает это буквально, downstream `Build Final Post.chat_id = {{$json.chat_id}}` может получить пустое значение.
- `HTTP Request` для публикации содержит одновременно `caption`, `photo` и лишний параметр `text`, а параметр фото назван `=photo`, не `photo`. Это риск для Telegram `sendPhoto`.
- `Message Type` обращается к `$json.callback_query.data` без optional chaining. Для обычных messages это может быть рискованно, хотя loose validation может сгладить часть случаев.

## Старые references и naming debt

- Проект `pay` используется вместо целевого `monopoly_pay`.
- Проект `hockey` используется вместо целевого `gorilla_hockey`.
- Есть fallback/default проект `dnk`, хотя текущий v2 фокус: `monopoly`, `monopoly_pay`, `casper`, `gorilla_hockey`.
- `visual_mode` сейчас `template_with_text` / `clean_visual`, а v2 требует режимы `composer`, `style_generation`, `hockey_generated_poster`, `hockey_photo_template`, `hockey_print_layout`.
- Канал публикации hardcoded: `@DNKTestPosts`.
- Inline кнопки ориентированы на публикации в соцсети, а не на production pipeline по слоям.
- OpenAI Image prompt общий business/digital и генерирует изображение целиком.

## Data Table conditions

Data Table id: `T6LhBgZRg3AZt2OK`, cached name `content_bot_state`.

Проблемы:

- `Reset State Before New Task.filters.conditions[0]` использует `keyName: chat_id`, но вместо `keyValue` заполнено поле `condition: =chat_id equals ...`.
- `Clear Bot State.filters.conditions[0]` содержит `condition: =chat_id equals ...` и отдельно `keyValue`, но нет корректного `keyName`. Нода disabled, но конфигурация некорректна.
- `Save Awaiting Image Revision` использует корректную пару `keyName/chat_id` и `keyValue`, но `matchingColumns` пустой при upsert. Нужно проверить поведение n8n Data Table upsert в этой версии.
- State schema не содержит `project`, `visual_mode`, `visual_job_id`, `text_layer`, `illustration_layer`, `background_layer`, `layout_variant`, `output_format`, поэтому v2 state некуда писать.

## Засвеченные токены

Был найден hardcoded Telegram Bot API token в 5 HTTP Request URL:

- `HTTP Request` / `sendPhoto`
- `HTTP Request1` / `sendMessage`
- `Telegram API Draft Reply` / `sendMessage`
- `Ask Image Revision Text` / `sendMessage`
- `Ask Text Revision` / `sendMessage`

Минимальная правка уже внесена: URL заменены на:

- `https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendPhoto`
- `https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendMessage`

Credentials ids не менялись.

## Callback data

Используются callback values:

- Draft reply: `approve`, `revise`, `cancel`.
- Preview reply: `send_client`, `publish_telegram`, `publish_vk`, `publish_instagram`, `publish_all`, `regenerate_text`, `revise_text`, `regenerate_image`, `revise_image`.

`Final Action Type` обрабатывает только:

- `approve`
- `publish_telegram`
- `regenerate_image`
- `revise_image`
- `regenerate_text`
- `revise_text`

Остальные callbacks (`send_client`, `publish_vk`, `publish_instagram`, `publish_all`, `revise`, `cancel`) не имеют отдельных веток в `Final Action Type`; часть текста ответа есть в `HTTP Request`, но туда попадает только `publish_telegram`.

## Что мешает Visual Production Bot v2

- Нет разделения `text_layer`, `illustration_layer`, `background_layer`, `composition`.
- Нет project profiles и asset/template library.
- Нет persistent `visual_job_state`, который фиксирует выбранный проект, режим, ассеты, seed/source refs, layer ids и историю правок.
- Нельзя заменить только текст, фон, иллюстрацию или композицию без регенерации всего изображения.
- Monopoly/Pay сейчас попадут в one-shot image prompt, что не подходит для управляемой production-сборки.
- Hockey photo/template и print layout требуют загрузки пользовательского фото/фона и отдельного composer service; сейчас photo входы не обрабатываются как ассеты.
- Нужна нормализация callback names под v2: `revise_text_layer`, `revise_illustration_layer`, `revise_background_layer`, `revise_composition`, `change_output_format`, `approve_final`.
