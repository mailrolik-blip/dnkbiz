## DNK Biz MVP

Локальный MVP платформы Бизнес Школы ДНК: регистрация, вход, выбор тарифа, переход в test checkout, тестовая оплата, автоматическое открытие курса и сохранение прогресса по урокам.

### Запуск

Установка зависимостей:

```bash
npm install
```

Запуск в dev-режиме на `3002`:

```bash
npm run dev:3002
```

Локальный production-запуск на `3002`:

```bash
npm run build
npm run start:3002
```

Если нужно заполнить базу тестовыми данными:

```bash
npm run db:seed
```

### ENV

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENABLE_TEST_PAYMENTS=true` для локального test checkout
- `SESSION_COOKIE_NAME` опционально, если нужно переопределить имя session cookie

### Тестовые аккаунты

- `admin@example.com / Admin123!`
- `user@example.com / User12345!`

### Основные маршруты

- `/`
- `/register`
- `/login`
- `/lk`
- `/checkout/test?orderId=:id`
- `/courses/practical-course`

### Основные API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/me/courses`
- `POST /api/orders`
- `POST /api/orders/:id/test-pay`
- `PATCH /api/orders/:id/status`
- `GET /api/courses/:slug`
- `POST /api/lessons/:id/progress`

### Content model урока

- В `Lesson.description` хранится краткое summary урока.
- В `Lesson.content` хранится основной body урока в текстовом формате с поддержкой секций `##`, списков и цитат.
- `Lesson.videoUrl` и `Lesson.videoProvider` управляют video block внутри курса.
- `Lesson.homeworkTitle`, `Lesson.homeworkPrompt`, `Lesson.homeworkType`, `Lesson.homeworkOptions` управляют домашним заданием урока.
- Для `homeworkType=CHECKLIST` выбранные пункты и текст ответа сохраняются в существующее поле `LessonProgress.answer` в JSON-строке. Для остальных типов используется обычный текстовый ответ.

### Основной пользовательский flow

1. Пользователь регистрируется или входит в аккаунт.
2. На главной или в кабинете выбирает тариф.
3. `POST /api/orders` создаёт новый `PENDING` order или возвращает checkout уже существующего pending order.
4. UI сразу переводит пользователя в `/checkout/test`.
5. Тестовая оплата через `POST /api/orders/:id/test-pay` переводит заказ в `PAID`.
6. После `PAID` автоматически создаётся или переиспользуется `Enrollment`.
7. Пользователь сразу попадает в `/courses/:slug`, где открывается курс-фронт на базе `03-block.html`.
8. Прогресс и домашка сохраняются через `POST /api/lessons/:id/progress`.

### Тестовый курс

- `npm run db:seed` пересоздаёт основной demo-course `practical-course` на 10 русскоязычных уроков.
- В seed уже включены summary, content body, домашние задания и demo-video ссылки для части уроков.
- Seed не строит админку и не добавляет новые сущности: курс остаётся на текущей MVP-модели.

### Video block и demo-части

- Если у урока есть `videoUrl`, курс показывает встроенное видео или embed-блок в зависимости от `videoProvider` и формата ссылки.
- Если видео нет или ссылка не встраивается, курс показывает аккуратный fallback с возможностью открыть источник отдельно.
- AI modal в курсе остаётся demo-блоком без реальной AI-интеграции.

### Secondary path

- `PATCH /api/orders/:id/status` сохранён как резервный admin-only flow для локальной отладки.
- Основной пользовательский путь для MVP — через `checkout/test`.

### Локальная изоляция

- Для локального запуска рядом с другим проектом добавлены scripts на порт `3002`.
- Имя session cookie по умолчанию: `dnkbiz_session`.
