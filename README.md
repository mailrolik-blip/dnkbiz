# Course MVP

Minimal paid-course MVP built on Next.js 16, React 19, Prisma, and PostgreSQL.

## Scope

- email/password registration
- login/logout with HTTP-only session cookie
- pending order creation for an active tariff
- admin-only order status update to `PAID`
- automatic enrollment creation after payment
- protected `/lk` personal cabinet
- protected `/courses/[slug]` course page
- lesson progress storage per user

## Routes

Pages:

- `/`
- `/register`
- `/login`
- `/lk`
- `/courses/[slug]`

API:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/me/courses`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `GET /api/courses/:slug`
- `POST /api/lessons/:id/progress`

## Data model

- `User`
- `Course`
- `Lesson`
- `Tariff`
- `Order`
- `Enrollment`
- `LessonProgress`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

This compose setup exposes PostgreSQL on `localhost:5434`.

3. Create `.env` from `.env.example` and set a real `AUTH_SECRET`.

4. Generate Prisma client and run the clean baseline migration:

```bash
npx prisma generate
npx prisma migrate dev --name init_course_mvp
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

## Seed accounts

- admin: `admin@example.com` / `Admin123!`
- user: `user@example.com` / `User12345!`

## Seed content

- one published course: `practical-course`
- seven published lessons
- one active tariff: `practical-course-access`

## Manual payment flow

1. Login as the test user.
2. Open `/lk` and create an order.
3. Login as the admin in another session or switch accounts.
4. Call:

```bash
curl -X PATCH http://localhost:3000/api/orders/ORDER_ID/status \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"PAID\"}"
```

5. Refresh `/lk` for the user. The course should appear automatically.

## Notes

- old hockey entities, old API routes, old seeds, and old Prisma migrations were removed
- the project now uses App Router route handlers under `app/api`
- course access depends on `Enrollment`, not directly on order status
