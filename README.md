# DNK Biz MVP

DNK Biz is a self-serve LMS MVP for short professional courses. The current product model is:

- free registration
- free courses with immediate access
- paid courses with preview lessons before purchase
- checkout inside the LMS
- course progress inside the learner account

## What Works Now

- auth and session-based login
- main catalog on `/`
- course product pages on `/catalog/:slug`
- learning flow on `/courses/:slug`
- learner dashboard on `/lk`
- free / paid / showcase course model
- preview-enabled paid courses
- payment-ready checkout on `/checkout/test`
- order states: `PENDING`, `PROCESSING`, `PAID`, `FAILED`, `CANCELED`, `EXPIRED`
- dev/test payment fallback with `ENABLE_TEST_PAYMENTS=true`

The platform currently includes:

- 3 live paid courses
- 2 live free courses

## Main Routes

- `/`
- `/catalog/:slug`
- `/register`
- `/login`
- `/lk`
- `/checkout/test?orderId=:id`
- `/courses/:slug`

## User Flow

1. A guest opens the catalog or a course product page.
2. The user registers for free.
3. On `/catalog/:slug`, the user sees the course status, description, lesson count, preview info, and the main CTA.
4. A free course opens immediately.
5. A paid course opens preview lessons first, then leads to checkout.
6. After payment, the course opens in full access inside `/courses/:slug`.
7. Progress and homework stay attached to the learner account and are visible from `/lk`.

## Course Model

- `free`: published course without purchase required
- `paid`: published course with an active tariff
- `showcase`: visible in the catalog, but not available for self-serve learning yet
- `preview-enabled`: paid course with 1-2 preview lessons available before purchase

## Dashboard

`/lk` is the main learner hub and contains:

- `Мои курсы`
- `Бесплатные курсы`
- `Платные курсы`
- `Продолжить оплату`

Primary user actions across the product are kept consistent:

- `Начать бесплатно`
- `Купить курс`
- `Продолжить оплату`
- `Открыть курс`
- `Продолжить обучение`
- `Скоро`

## Checkout

`/checkout/test` is the current MVP checkout screen.

- It already behaves like a normal purchase flow from the user perspective.
- The app is ready for real provider integration through `lib/payments/*`.
- `TEST` payment is only a local/dev fallback and is controlled by `ENABLE_TEST_PAYMENTS=true`.

## Local Run

Install dependencies:

```bash
npm install
```

Development:

```bash
npm run dev:3002
```

Production build locally:

```bash
npm run build
npm run start:3002
```

Seed local test data:

```bash
npm run db:seed
```

## Environment

- `DATABASE_URL`
- `AUTH_SECRET`
- `ENABLE_TEST_PAYMENTS=true`
- `SESSION_COOKIE_NAME` optional

## Useful Scripts

- `npm run dev`
- `npm run dev:3002`
- `npm run dev:local`
- `npm run build`
- `npm run start`
- `npm run start:3002`
- `npm run start:local`
- `npm run lint`
- `npm run db:generate`
- `npm run db:seed`

## Test Accounts

- `admin@example.com / Admin123!`
- `user@example.com / User12345!`

## Main API

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

## Legacy / Secondary Flow

The old lead-flow is no longer part of the product.

- `/programs/:slug` is now only an archived secondary route
- the main UI no longer links to `ProgramRequest`
- the request form is removed from the MVP flow
- `POST /api/program-requests` is kept only as an archived `410 Gone` stub for compatibility
- the real product path is `/` -> `/catalog/:slug` -> `/checkout/test` -> `/courses/:slug`

## Notes

- Real payment provider integration is not connected yet.
- No CRM or admin panel is included in this MVP.
- The corporate/request-based flow is intentionally not part of the main product.
