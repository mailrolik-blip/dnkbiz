# DNK Biz MVP

DNK Biz — это MVP LMS для самостоятельного обучения на коротких прикладных курсах. Текущая продуктовая модель такая:

- бесплатная регистрация
- бесплатные курсы с мгновенным доступом
- платные курсы с ознакомительными уроками до покупки
- checkout внутри LMS
- прогресс по курсам внутри кабинета ученика

## Project documentation

- [DNK Business OS Vision](docs/00_dnk_business_os_vision.md)
- [DNK Roadmap to Business OS](docs/01_dnk_roadmap_to_business_os.md)
- [DNK MVP Launch Plan](docs/02_dnk_mvp_launch_plan.md)
- [DNK Financial Model](docs/03_dnk_financial_model.md)
- [Launch Checklist](docs/launch-checklist.md)
- [Timeweb Staging Deploy Guide](docs/deploy/timeweb-staging.md)

## Что уже работает

- auth и вход по сессии
- основной каталог на `/`
- полный каталог курсов на `/catalog`
- страницы курсов на `/catalog/:slug`
- учебный маршрут на `/courses/:slug`
- кабинет ученика на `/lk`
- внутренний admin-обзор на `/admin`
- модель бесплатных / платных / витринных курсов
- платные курсы с ознакомительным доступом
- готовый к платежной интеграции checkout на `/checkout/test`
- статусы заказов: `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELED`, `EXPIRED`
- dev/test payment fallback через `ENABLE_TEST_PAYMENTS=true`

Сейчас в платформе уже есть:

- 4 опубликованных платных курса
- 2 опубликованных бесплатных курса

## Основные маршруты

- `/`
- `/catalog`
- `/catalog/:slug`
- `/register`
- `/login`
- `/lk`
- `/profile`
- `/help`
- `/privacy`
- `/terms`
- `/admin`
- `/checkout/test?orderId=:id`
- `/courses/:slug`

## Пользовательский маршрут

1. Гость открывает лендинг, затем переходит в `/catalog` или сразу на страницу курса.
2. Если гость начинает осмысленное действие, auth-страницы сохраняют его через `next=/internal/path`.
3. После входа или регистрации пользователь возвращается в этот внутренний LMS-маршрут. Если `next` отсутствует или невалиден, fallback остается `/lk`.
4. `/lk` работает как первый хаб ученика: новые пользователи видят onboarding с бесплатным стартом и маршрутом в ознакомительный доступ платного курса.
5. В `/catalog` пользователь фильтрует библиотеку и открывает страницу выбранного курса.
6. На `/catalog/:slug` пользователь видит статус курса, описание, число уроков, информацию об ознакомительном доступе и основной CTA.
7. Бесплатный курс открывается сразу.
8. Платный курс сначала открывает ознакомительные уроки, а затем ведет в checkout.
9. После оплаты курс открывается полностью внутри `/courses/:slug`.
10. Прогресс и домашние задания остаются привязаны к аккаунту ученика и видны из `/lk`.
11. Вспомогательные страницы поддерживают основной маршрут MVP: `/profile`, `/help`, `/privacy`, `/terms`.

## Модель курсов

- `free`: опубликованный курс без обязательной покупки
- `paid`: опубликованный курс с активным тарифом
- `showcase`: курс виден в каталоге, но еще не открыт для самостоятельного обучения
- `preview-enabled`: платный курс с 1-2 ознакомительными уроками до покупки

## Кабинет

`/lk` — основной кабинет ученика. В нем есть:

- onboarding / zero-state для новых пользователей
- `Мои курсы`
- `Бесплатные курсы`
- `Платные курсы`
- `Продолжить оплату`

Основные пользовательские действия по продукту уже приведены к единым CTA:

- `Начать бесплатно`
- `Купить курс`
- `Продолжить оплату`
- `Открыть курс`
- `Продолжить обучение`
- `Скоро`

## Checkout

`/checkout/test` — текущий экран покупки для MVP.

- С точки зрения пользователя он уже работает как обычный purchase-flow.
- Приложение готово к подключению реального провайдера через `lib/payments/*`.
- Маршрут нужен для staging-подготовки до подключения боевой платежки.
- `TEST` payment — только dev/test fallback, который управляется через `ENABLE_TEST_PAYMENTS=true`.
- В публичном окружении `ENABLE_TEST_PAYMENTS` должен оставаться выключенным.

## Вспомогательные страницы

- `/profile`: базовая сводка по аккаунту, logout и быстрые ссылки обратно в LMS
- `/help`: короткая памятка по бесплатному курсу, ознакомительным урокам, покупке и продолжению обучения
- `/privacy`: краткая политика конфиденциальности MVP
- `/terms`: краткие условия использования MVP

## Локальный запуск

Установка зависимостей:

```bash
npm install
```

Разработка:

```bash
npm run dev:3002
```

Локальная production-сборка:

```bash
npm run build
npm run start:3002
```

Применение migrations в локальной разработке:

```bash
npm run db:migrate:dev -- --name init
```

Подготовка локальных тестовых данных:

```bash
npm run db:seed
```

## Production Build

Базовый production-маршрут для сервера:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run build
npm run start
```

Staging на Timeweb поднимается до подключения боевой платежки и нужен для ручной проверки каталога, checkout, кабинета и доступа к курсам на реальном домене.

## Manual SBP Flow (temporary)

- Paid checkout defaults to `MANUAL` and shows a static SBP QR from `public/payments/sbp-qr-manual.png`.
- User flow: open checkout -> pay in the banking app -> click `Я оплатил` -> order moves to `PROCESSING`.
- `PROCESSING` means the payment is waiting for manual manager review. The order is not treated as paid yet.
- `/lk` keeps the order visible with a neutral waiting-for-review status and a link back to checkout.
- `/admin` includes a manual review queue for `MANUAL` + `PROCESSING` orders. Admin can confirm payment (`PAID`) or reject it (`FAILED`).
- Confirming payment upserts enrollment and opens full course access exactly like a regular successful payment.
- This is a temporary bridge before real acquiring. Replace the static QR asset if the bank changes it, and connect a real provider later.

## Окружение

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENABLE_TEST_PAYMENTS="false"` по умолчанию
- `SESSION_COOKIE_NAME` опционально
- `PAYMENT_WEBHOOK_SECRET` для `/api/payments/webhook/:provider`

## Полезные скрипты

- `npm run dev`
- `npm run dev:3002`
- `npm run dev:local`
- `npm run build`
- `npm run start`
- `npm run start:3002`
- `npm run start:local`
- `npm run lint`
- `npm run db:generate`
- `npm run db:migrate:dev -- --name <migration-name>`
- `npm run db:migrate:deploy`
- `npm run db:seed`

## Локальные seed-аккаунты

`npm run db:seed` создает локальных пользователей для коротких smoke-проверок. Их логины и пароли выводятся только в локальный вывод seed-скрипта и не должны использоваться вне локальной разработки.

## Основное API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/me/courses`
- `POST /api/orders`
- `POST /api/orders/:id/checkout`
- `POST /api/orders/:id/test-pay`
- `PATCH /api/orders/:id/status`
- `POST /api/payments/webhook/:provider`
- `GET /api/courses/:slug`
- `POST /api/lessons/:id/progress`

## Внутренний admin

`/admin` — внутренний ops-экран для владельца платформы.

- доступ ограничен только пользователями с ролью `ADMIN`
- маршрут не участвует в публичном ученическом UX
- экран показывает пользователей, заказы, доступы, текущее состояние каталога и очередь ручной проверки оплаты
- маршрут помечен как `noindex`

## Legacy / Secondary Flow

Старый lead-flow больше не является частью основного продукта.

- `/programs/:slug` теперь остается только архивным secondary-маршрутом
- основной UI больше не ссылается на `ProgramRequest`
- форма заявки удалена из основного MVP-маршрута
- `POST /api/program-requests` оставлен только как архивный `410 Gone` stub для совместимости
- реальный продуктовый путь сейчас такой: `/` -> `/catalog` -> `/catalog/:slug` -> `/checkout/test` -> `/courses/:slug`

## Заметки

- MVP уже готов к ручной продуктовой проверке регистрации, каталога, checkout, кабинета и прогресса по курсам.
- Интеграция с реальным платежным провайдером пока не подключена.
- До публичного запуска staging должен пройти ручную проверку на реальном домене Timeweb с выключенным `ENABLE_TEST_PAYMENTS`.
- Перед публичным запуском основными незакрытыми hardening-задачами остаются устойчивый rate limiting, полноценный CSRF/CSP-проход и server-side session revocation.
- В этот MVP не входит CRM или отдельная административная панель.
- Корпоративный / request-based сценарий намеренно не входит в основной продукт.

## Staging Deploy на VPS

- Health endpoint: `GET /api/health`
- Подробный deploy-гайд: `docs/deploy/timeweb-staging.md`
- Systemd template: `deploy/systemd/dnkbiz-staging.service`
- Nginx template: `deploy/nginx/dnkbiz-staging.conf`
- Staging env example: `deploy/env/timeweb-staging.env.example`
