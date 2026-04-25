# DNK Biz MVP

Локальный MVP self-serve LMS-платформы Бизнес Школы ДНК: бесплатная регистрация, бесплатные курсы, preview платных курсов, test checkout, автоматическая выдача доступа и прохождение уроков в личном кабинете.

### Запуск

Установка зависимостей:

```bash
npm install
```

Dev-режим на `3002`:

```bash
npm run dev:3002
```

Локальный production-режим на `3002`:

```bash
npm run build
npm run start:3002
```

Заполнение базы тестовыми данными:

```bash
npm run db:seed
```

### ENV

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENABLE_TEST_PAYMENTS=true` для локального `checkout/test`
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
- `/courses/:slug`

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

### Продуктовая модель

- Главный маршрут сайта ведет в бесплатную регистрацию, а не в форму заявки.
- Каталог и личный кабинет работают в модели `free / paid / showcase`.
- Бесплатные курсы можно начать сразу после входа.
- Платные курсы открывают preview-уроки без покупки и полный доступ после оплаты.
- Showcase-направления остаются витриной и не участвуют в основном LMS-сценарии.

### Личный кабинет

- `Мои курсы`: купленные программы, начатые бесплатные курсы и paid-курсы с начатым preview.
- `Бесплатные курсы`: можно запустить сразу без оплаты.
- `Платные курсы`: можно открыть в preview или купить.
- `Продолжить оплату`: показывается, если уже есть `PENDING` order.

### Preview-доступ

- Preview встроен в существующий маршрут `/courses/:slug`.
- Уроки с `Lesson.isPreview=true` доступны зарегистрированному пользователю без покупки.
- Для закрытых уроков показывается paywall с CTA `Купить курс` или `Продолжить оплату`.
- После оплаты курс автоматически переходит в режим полного доступа без отдельной страницы.

### Content model урока

- `Lesson.description`: краткое summary урока.
- `Lesson.content`: основной body урока в текстовом формате с поддержкой `##`, списков и цитат.
- `Lesson.videoUrl` и `Lesson.videoProvider`: video block внутри курса.
- `Lesson.homeworkTitle`, `Lesson.homeworkPrompt`, `Lesson.homeworkType`, `Lesson.homeworkOptions`: домашнее задание урока.
- `Lesson.isPreview`: признак preview-урока у платного курса.
- Для `homeworkType=CHECKLIST` выбранные пункты и текст ответа сохраняются в `LessonProgress.answer` как JSON-строка. Для остальных типов используется обычный текстовый ответ.

### Основной пользовательский flow

1. Гость видит главный CTA на бесплатную регистрацию.
2. После входа пользователь открывает бесплатный курс сразу или заходит в preview платного курса.
3. В `/lk` доступны блоки `Мои курсы`, `Бесплатные курсы`, `Платные курсы`, `Продолжить оплату`.
4. `POST /api/orders` создает новый `PENDING` order или возвращает checkout уже существующего pending order.
5. UI сразу переводит пользователя в `/checkout/test`.
6. Тестовая оплата через `POST /api/orders/:id/test-pay` переводит заказ в `PAID`.
7. После `PAID` автоматически создается или переиспользуется `Enrollment`, а курс открывается в `/courses/:slug`.
8. Прогресс и домашка сохраняются через `POST /api/lessons/:id/progress`.

### Seed и тестовые курсы

- `npm run db:seed` пересоздает платный курс `practical-course` и бесплатный курс `microsoft-excel-basic`.
- `practical-course` сидится как основной живой LMS-курс с preview-уроками в начале маршрута.
- `microsoft-excel-basic` сидится как бесплатный курс, который можно начать сразу после регистрации.
- В seed уже включены summary, content body, домашние задания и demo-video ссылки для части уроков.
- Showcase-курсы сидятся как не опубликованные направления каталога без LMS-доступа.

### Video block и demo-части

- Если у урока есть `videoUrl`, курс показывает встроенное видео или embed-блок в зависимости от `videoProvider` и формата ссылки.
- Если видео нет или ссылка не встраивается, курс показывает fallback с возможностью открыть источник отдельно.
- AI modal в курсе остается demo-блоком без реальной AI-интеграции.

### Что не является основным UX

- Маршрут `/programs/:slug` и контур `ProgramRequest` сохранены в кодовой базе, но не участвуют в главном пользовательском маршруте MVP.
- `PATCH /api/orders/:id/status` сохранен как резервный admin-only flow для локальной отладки.
- Основной пользовательский путь для MVP идет через регистрацию, кабинет, preview, `checkout/test` и `/courses/:slug`.

### Локальная изоляция

- Для локального запуска рядом с другим проектом добавлены scripts на порт `3002`.
- Имя session cookie по умолчанию: `dnkbiz_session`.
