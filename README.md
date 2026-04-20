
# Gorilla Hockey

Контрольная точка разработки (MVP v1)
Общая цель проекта

Разработка платформы для хоккейной школы/клуба с возможностями:

- запись на тренировки
- управление участниками (игроки, дети)
- команды и заявки в команды
- аренда льда
- дальнейшая интеграция с Telegram

Платформа для хоккейной школы. первым делом поднимаем локальный сервер и настраиваем гит проекта:

Локальный сервер стоит на базе [Next.js](https://nextjs.org). базовая документация представлена ниже:

<details>
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

</details>

## 1 Коммит localhost 0 + Tailwind + Docker + prisma 

содержит в себе установленные и подключенные на локальный хост сервисы. Создаем базы данных и настраиваем взаимосвязь между ними. 

Текущий стек

- Next.js (App Router)
- TypeScript
- PostgreSQL (в Docker)
- Prisma ORM
- API через Next.js (/api/*)
- Thunder Client для тестирования

## 2 Коммит Gorilla 0.0 

Привели в порядок взаимосвязи и настроили миграцию таблиц

## 3 Коммит Gorilla 0.1

Итог по состоянию проекта

Создал базу данных:
команда в терминале npx prisma studio 
порт http://localhost:5555

<details>

User
- email / phone / telegramId
- passwordHash
- timestamps
- связь с профилями

UserProfile
- профили пользователей
- self-relation (parent/children)
- расширяемая модель

Team
- базовая сущность команды

TeamMember
- связь user ↔ team
- роли через enum TeamRole
- уникальность [userId, teamId]

UserProfile
- memberships теперь связывает пользователя с командами
- участники (игрок / ребёнок)

Session
- создали таблицу сессий (игровые матчи)

Booking
- создали таблицу тренировок (для школы)

Частично есть рассинхрон архитектуры:

Booking привязан к User, а не к UserProfile (планируется исправление)

</details>

## 4 Коммит Gorilla 0.2

1. подключил демо бота в [телеграмме](https://t.me/gorillahockyebot) для регистрации на сайте
1.1 бот работает создает пользователя и выводит базу доступных тренировок

*КОМАНДЫ БОТА
Открой Telegram, найди своего бота и проверь, как он работает:

Напиши /start, чтобы увидеть приветственное сообщение.
Напиши /register, чтобы зарегистрироваться.
Попробуй /trainings, чтобы увидеть список доступных тренировок.
Попробуй /book [trainingId], чтобы забронировать тренировку.

2. исправление ошибок миграции и тестирования связи базы данных

## 4 Коммит Gorilla 0.3

API (реализовано)

Сделаны базовые endpoint'ы:

Users
- GET /api/users
- POST /api/users
Teams
- GET /api/teams
- POST /api/teams
Trainings
- GET /api/trainings
- POST /api/trainings

✔ данные успешно сохраняются в БД
✔ Prisma работает
✔ миграции применяются

Тестирование

- Используется Thunder Client (VS Code)
- POST/GET запросы работают
- Добавлен дебаг через console.log(req.body)

## 5 Коммит Gorilla 0.4

1. Инициализация и стабильность проекта
- Настроен и запущен Next.js проект (TypeScript)
- Подключён Prisma ORM
- Подключена PostgreSQL база через Docker
- Проверена работоспособность локального dev-сервера

2. Работа с базой данных (Prisma)
Выполнено:
- Создана и стабилизирована Prisma schema
- Добавлены основные модели:
--User
--UserProfile
--Team
--TeamMember
--Session
--Booking
--SchoolTraining
--City

Добавлены enum:
- TeamRole
- TeamMemberStatus

Исправлено в процессе:
- устранены ошибки связей (relation errors)
- исправлены дублирующиеся модели/поля
- исправлены конфликты City model
- приведены связи Booking ↔ UserProfile ↔ Session ↔ Training

3. Миграции Prisma
- Выполнена первая миграция (init schema)
- Выполнена миграция исправления связей
- Выполнена миграция City модели
- Выполнена миграция корректировки relations
- Prisma Client успешно генерируется

4. API (Next.js)

Созданы и проверены базовые endpoints:

Users
- POST /api/users
- GET /api/users
Participants (UserProfile)
- POST /api/participants
- GET /api/participants
- PATCH /api/participants
Cities
- POST /api/city
- GET /api/city
Trainings
- POST /api/trainings
- GET /api/trainings
Booking (частично)
- создан endpoint /api/trainings/[id]/book
- реализована логика создания записи на тренировку

5. Проверка через Postman / API
- Проверены POST запросы к API
- Проверено создание пользователей
- Проверено создание тренировок
- Проверено создание участников
- Проверена работа Prisma Studio
- Исправлена проблема с частично пустыми данными при записи в БД

6. Исправления и отладка
- исправлены ошибки Prisma relation validation (P1012)
- исправлены ошибки duplicate fields в schema.prisma
- устранены ошибки миграций (P3018 rollback / sync issues)
- решена проблема EPERM при генерации Prisma Client (в процессе повторного запуска)

Итог состояния на конец дня

Backend полностью поднят и работает:

- база данных стабильна
- ORM настроен
- API endpoints функционируют
- основные сущности и связи определены
- система уже принимает и сохраняет реальные данные

Статус проекта

Backend MVP foundation — завершён (v0.1 stable)

## 6 Коммит Gorilla 0.5

Привели backend-контур в рабочее и стабильное состояние.

Что сделано:

- выровнены связи Prisma-моделей;
- стабилизирована архитектура бронирований тренировок;
- добавлена отдельная модель TrainingBooking;
- приведены в порядок связи City, UserProfile, Team, Session;
- донастроены API-роуты:
    - users
    - city
    - participants
    - teams
    - trainings
    - training-bookings
    - trainings/[id]/book
- из API-ответов убран passwordHash;
- вынесены безопасные select и общий booking-flow;
- Telegram-бот переведён на переменную окружения TELEGRAM_BOT_TOKEN.

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Дополнительно:

- проверены живые GET/POST/PATCH запросы к основным endpoint’ам;
- повторное бронирование корректно возвращает 409;
- в локальной БД созданы smoke-test данные для проверки сценариев.

Итог:

- backend foundation стабилизирован;
- база и API готовы к следующему этапу — завершению пользовательского school-flow.

## 6.1 Gorilla 0.5.1

Закрыт базовый пользовательский school-flow без изменений схемы БД.

Что сделано:

- добавлен endpoint GET /api/my/training-bookings
- добавлен endpoint POST /api/training-bookings/[id]/cancel
- реализована ownership-логика: пользователь видит только свои бронирования и бронирования своих участников
- отмена своей записи меняет статус без физического удаления
- повторная отмена возвращает 409
- отмена чужой записи возвращает 404
- добавлен безопасный select для выдачи бронирований без приватных contact-данных
- добавлен helper текущего пользователя через заголовок x-user-id для dev-тестирования

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Итог:

- пользовательский контур бронирований тренировок доведён до рабочего состояния
- backend готов к следующему этапу: team applications flow

## 6.2 Gorilla 0.5.2

Закрыт базовый team applications flow для MVP v1.

Что сделано:

- добавлен endpoint POST /api/teams/[id]/applications
- добавлен endpoint GET /api/my/team-applications
- добавлен endpoint POST /api/team-applications/[id]/cancel
- реализована ownership-логика:
    - пользователь может подать заявку только за своего участника
    - пользователь видит только свои заявки
    - пользователь может отменить только свою заявку
- реализована защита от дублей активных заявок в одну и ту же команду
- отмена заявки меняет статус без физического удаления

Проверка:

- создание своей заявки — ok
- попытка подать заявку за чужого participant — 404
- повторная активная заявка — 409
- /api/my/team-applications корректно фильтрует по пользователю
- отмена своей заявки — ok
- повторная отмена — 409
- отмена чужой заявки — 404

Итог:

- пользовательский team-flow доведён до рабочего состояния
- backend готов к следующему этапу: staff review flow для заявок в команду

## 6.3 Gorilla 0.5.3

Закрыт staff review flow для заявок в команду.

Что сделано:

- добавлен GET /api/coach/team-applications
- добавлен PATCH /api/coach/team-applications/[id]
- добавлено поле internalNote у TeamApplication
- добавлена staff-роль пользователя:
    - MANAGER
    - ADMIN
- расширены статусы review-flow:
    - IN_REVIEW
    - ACCEPTED
- выполнена миграция legacy-статуса:
    - APPROVED -> ACCEPTED
- реализованы safe select’ы:
    - user-facing без internalNote
    - staff-facing с internalNote
- реализовано разграничение доступа:
    - coach видит и меняет заявки только своих команд
    - manager/admin имеют расширенный доступ
    - обычный user не имеет доступа к staff-endpoints

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- coach видел только заявки своей команды
- coach не видел чужие заявки
- coach менял статус своей заявки — ok
- internalNote сохраняется — ok
- manager видел все заявки и менял чужие — ok
- обычный user получал 403 — ok

Итог:

- командный контур доведён до staff-level review
- school-flow и team-flow базово закрыты
- следующий этап: пользовательский rental flow

## 6.4 Gorilla 0.5.4

Закрыт базовый rental user flow для MVP v1.

Что сделано:

- добавлен минимальный rental-домен в Prisma:
    - RentalFacility
    - RentalResource
    - RentalSlot
    - RentalBooking
- добавлены endpoint’ы:
    - GET /api/public/rental-slots
    - POST /api/rental-slots/[id]/book
    - GET /api/my/rental-bookings
    - POST /api/rental-bookings/[id]/cancel
- реализованы safe select’ы для публичной выдачи и личных бронирований
- реализован ownership-check по participantId
- бронирование создаётся со статусом PENDING_CONFIRMATION
- при отмене бронь не удаляется физически, а переводится в CANCELLED
- после отмены слот возвращается в AVAILABLE

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- публичные rental-slots читаются — ok
- пользователь может создать бронь доступного слота — 201
- занятый слот возвращает — 409
- пользователь видит только свои rental bookings — ok
- пользователь может отменить только свою бронь — 200
- повторная отмена — 409
- отмена чужой брони — 404

Итог:

- пользовательский контур аренды доведён до рабочего состояния
- school-flow, team-flow и rental user-flow базово закрыты
- следующий этап: staff/admin flow для аренды

## 6.5 Gorilla 0.5.5

Закрыт staff/admin rental review flow для MVP v1.

Что сделано:

- добавлен endpoint GET /api/admin/rental-bookings
- добавлен endpoint PATCH /api/admin/rental-bookings/[id]
- добавлен staff-only helper проверки доступа для MANAGER / ADMIN
- добавлены поля:
    - RentalBooking.noteFromUser
    - RentalBooking.managerNote
- добавлен staff-facing select для rental bookings
- реализовано обновление статуса брони staff’ом:
    - PENDING_CONFIRMATION
    - CONFIRMED
    - CANCELLED
- синхронизирован RentalSlot.status при confirm/cancel
- POST /api/rental-slots/[id]/book теперь принимает noteFromUser

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- manager видит rental bookings — ok
- admin видит rental bookings — ok
- обычный user на /api/admin/rental-bookings* получает 403
- admin подтверждает бронь — ok
- manager отменяет бронь — ok
- managerNote сохраняется — ok
- повторная отмена даёт 409
- slot.status остаётся согласованным:
    - после confirm — BOOKED
    - после cancel — AVAILABLE

Итог:

- rental flow доведён до staff/admin уровня
- school-flow, team-flow и rental-flow базово закрыты
- следующий этап: базовый staff/admin CRUD для тренировок и командной операционки

## 6.6 Gorilla 0.5.6

Закрыт staff/admin trainings management flow для MVP v1.

Что сделано:

- добавлен endpoint GET /api/admin/trainings
- добавлен endpoint POST /api/admin/trainings
- добавлен endpoint PATCH /api/admin/trainings/[id]
- добавлен staff-facing select для тренировок
- добавлен helper lib/admin-trainings.ts для staff-управления тренировками
- реализована валидация cityId и coachId
- taff-facing JSON маппит trainer в поле coach
- в ответах используется name как текущий title тренировки
- доступ ограничен только для manager/admin

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- manager видит список тренировок — ok
- admin видит список тренировок — ok
- manager создаёт тренировку — 201
- admin изменяет тренировку — 200
- обычный user получает 403
- существующий school-flow не сломан после create/update training

Итог:

- staff/admin управление тренировками доведено до рабочего состояния
- следующий шаг: управление rental inventory и rental slots без Prisma Studio

## 6.7 Gorilla 0.5.7

Закрыт staff/admin rental slots management flow для MVP v1.

Что сделано:

- добавлен endpoint GET /api/admin/rental-slots
- добавлен endpoint POST /api/admin/rental-slots
- добавлен endpoint PATCH /api/admin/rental-slots/[id]
- добавлен staff-facing select для rental slots
- добавлен helper lib/admin-rental-slots.ts для staff-управления слотами аренды
- реализована проверка overlap слотов по resourceId
- добавлена staff-facing выдача activeBookingSummary
- реализована синхронизация статуса слота с активной бронью
- запрещён перевод слота с активной бронью в неконсистентный статус
- isPublic маппится в visibleToPublic

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- manager/admin видят rental slots — ok
- manager создаёт slot — 201
- admin изменяет slot — 200
- обычный user получает 403
- public rental flow не сломан
- созданный staff-слот доступен в public flow и бронируется пользователем
- staff list показывает activeBookingSummary
- некорректный диапазон времени — 400
- пересекающийся слот — 409
- попытка перевести слот с активной booking в UNAVAILABLE — 409

Итог:

- rental-модуль доведён до полноценного staff/admin уровня
- следующий этап: team roster management и staff-операционка по составу команды

## 6.8 Gorilla 0.5.8

Закрыт staff/admin team roster management flow для MVP v1.

Что сделано:

- расширена модель TeamMember под реальный состав команды;
- добавлены поля:
    - participantId
    - positionCode
    - jerseyNumber
    - joinedAt
- userId в TeamMember сделан nullable для roster-сценариев;
- добавлена связь участника с командным членством;
- добавлены endpoint’ы:
    - GET /api/admin/team-members
    - POST /api/admin/team-members
    - PATCH /api/admin/team-members/[id]
- реализован staff-facing select для состава команды;
- добавлен helper lib/team-members.ts для list/create/update roster entries;
- добавлен helper для ручного добавления участника из ACCEPTED team application без автосвязывания;
- добавлена защита от дублей членства по (participantId, teamId)

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok
- npx prisma migrate deploy — ok
- npx prisma generate — ok

Ручная проверка:

- manager/admin видят список team members — ok
- manager/admin могут добавить participant в команду — 201
- дублирующее членство даёт 409
- manager/admin могут обновить team member — 200
- обычный user получает 403
- team applications flow после изменений не сломан

Итог:

- командный модуль доведён до управления составом
- school-flow, team-flow и rental-flow базово закрыты как по user-, так и по staff-логике
- следующий этап: staff/admin management для rental inventory

## 6.9 Gorilla 0.5.9

Закрыт staff/admin rental inventory management flow для MVP v1.

Что сделано:

- добавлен endpoint GET /api/admin/rental-facilities
- добавлен endpoint POST /api/admin/rental-facilities
- добавлен endpoint PATCH /api/admin/rental-facilities/[id]
- добавлен endpoint GET /api/admin/rental-resources
- добавлен endpoint POST /api/admin/rental-resources
- добавлен endpoint PATCH /api/admin/rental-resources/[id]
- вынесена inventory-логика в lib/admin-rental-inventory.ts
- добавлены safe select’ы для facilities/resources
- используется существующая staff-role проверка manager/admin
- в resource API поле type маппится на текущую колонку resourceType

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- manager/admin видят rental facilities — ok
- manager/admin создают facility — 201
- manager/admin обновляют facility — 200
- manager/admin видят rental resources — ok
- manager/admin создают resource — 201
- manager/admin обновляют resource — 200
- обычный user получает 403
- существующий public/user rental flow не сломан

Итог:

- rental-модуль теперь управляется staff/admin полностью без Prisma Studio
- следующий этап: staff/admin management для команд и team applications из единого admin-контура

## 6.10 Gorilla 0.5.10

Закрыт staff/admin team management flow для MVP v1.

Что сделано:

- добавлен endpoint GET /api/admin/teams
- добавлен endpoint POST /api/admin/teams
- добавлен endpoint PATCH /api/admin/teams/[id]
- добавлен endpoint GET /api/admin/team-applications
- добавлен endpoint PATCH /api/admin/team-applications/[id]
- вынесена admin team logic в lib/admin-teams.ts
- admin review для заявок в команду переиспользует существующую review-логику из lib/team-applications.ts
- добавлены поля:
    - Team.slug
    - Team.description
    - TeamApplication.reviewedById
    - TeamApplication.reviewedBy
- добавлены staff-facing select’ы для команд и team applications
- реализована проверка уникальности slug
- reviewedBy сохраняется при staff-review

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- manager/admin видят список команд — ok
- manager/admin создают команду — 201
- manager/admin обновляют команду — 200
- конфликтующий slug даёт 409
- manager/admin видят team applications — ok
- manager/admin меняют status и internalNote — ok
- reviewedBy сохраняется — ok
- обычный user получает 403
- существующий user/team flow не сломан

Итог:

- командный модуль собран в единый admin/staff контур
- school-flow, team-flow и rental-flow закрыты по user- и staff-логике
- следующий этап: auth foundation вместо разрозненного x-user-id

## 7.0 Gorilla 0.6.0

Закрыт staff/admin rental inventory management flow для MVP v1.

Что сделано:

- добавлен endpoint GET /api/admin/rental-facilities
- добавлен endpoint POST /api/admin/rental-facilities
- добавлен endpoint PATCH /api/admin/rental-facilities/[id]
- добавлен endpoint GET /api/admin/rental-resources
- добавлен endpoint POST /api/admin/rental-resources
- добавлен endpoint PATCH /api/admin/rental-resources/[id]
- вынесена inventory-логика в lib/admin-rental-inventory.ts
- добавлены safe select’ы для facilities/resources
- используется существующая staff-role проверка manager/admin
- в resource API поле type маппится на текущую колонку resourceType

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- manager/admin видят rental facilities — ok
- manager/admin создают facility — 201
- manager/admin обновляют facility — 200
- manager/admin видят rental resources — ok
- manager/admin создают resource — 201
- manager/admin обновляют resource — 200
- обычный user получает 403
- существующий public/user rental flow не сломан

Итог:

- rental-модуль теперь управляется staff/admin полностью без Prisma Studio
- следующий этап: auth foundation

## 7.1 Gorilla 0.6.1

Закрыт auth/current-user foundation для MVP v1.

Что сделано:

- добавлен единый слой current user в lib/current-user.ts
- реализованы helper’ы:
    - getCurrentUser()
    - optionalCurrentUser()
    - requireCurrentUser()
    - requireStaffUser()
    - requireManagerOrAdmin()
- current user теперь проходит через session-ready abstraction с dev fallback на x-user-id
- вынесена общая staff/coach access логика в lib/staff.ts
- добавлены safe select’ы для current user
- добавлен endpoint GET /api/me
- ключевые authenticated routes переведены на centralized guards вместо прямого чтения x-user-id
- coach/global-staff access в team-applications переведён на общий helper

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- GET /api/me через x-user-id работает — 200
- GET /api/me без current user даёт 401
- user endpoints через новый helper продолжают работать
- admin endpoints через новый helper продолжают работать
- coach endpoints через новый helper продолжают работать
- существующие public/user flows не сломаны

Итог:

- auth foundation готов
- backend почти собран в единый продуктовый контур
- следующий этап: browser-ready dev auth + user dashboard foundation

## 7.2 Gorilla 0.6.2

Закрыт browser-ready dev auth bridge + dashboard foundation для MVP v1.

Что сделано:

- добавлен browser-ready dev auth bridge через cookie
- current user теперь определяется по приоритету:
    - session-ready abstraction
    - dev cookie
    - x-user-id fallback
- добавлены helper’ы в lib/current-user.ts:
    - getCurrentUserById()
    - toCurrentUserSummary()
    - assertDevAuthBridgeEnabled()
    - setDevCurrentUserCookie()
    - clearDevCurrentUserCookie()
- добавлен endpoint POST /api/dev/login-as
- добавлен endpoint POST /api/dev/logout
- добавлен endpoint GET /api/me/dashboard
- dashboard агрегирует:
    - current user summary
    - participants
    - training bookings
    - team applications
    - rental bookings
- /api/me переведён на общий safe summary helper

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- POST /api/dev/login-as в dev-режиме устанавливает cookie — 200
- GET /api/me с dev cookie и без x-user-id — 200
- POST /api/dev/logout очищает cookie — 200
- GET /api/me после logout без current user — 401
- GET /api/me через старый x-user-id fallback всё ещё работает — 200
- GET /api/me/dashboard работает для текущего пользователя — 200
- dashboard возвращает только данные текущего пользователя
- существующие user/admin/coach flows не сломаны
- dev endpoints вне dev/local режима недоступны

Итог:

- auth foundation и browser-ready dev bridge готовы
- backend собран в более цельный продуктовый контур
- следующий этап: первый минимальный пользовательский кабинет в интерфейсе

## 7.3 Gorilla 0.6.3

Закрыт первый минимальный русскоязычный пользовательский кабинет.

Что сделано:

- локализована страница /dev/login
- локализована страница /cabinet
- сохранён текущий dev auth bridge и redirect-flow на /dev/login?next=/cabinet
- backend-логика не менялась

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- /dev/login открывается — ok
- dev login работает — ok
- gorilla_dev_user_id cookie устанавливается — ok
- /cabinet открывается — ok
- данные dashboard отображаются — ok
- logout очищает cookie — ok
- после logout /api/me снова даёт 401
- старого англоязычного UI на этих страницах больше нет

Итог:

- появился первый живой русскоязычный пользовательский экран платформы
- следующий шаг: сделать кабинет не только обзорным, но и действующим, начиная с управления участниками

## 7.4 Gorilla 0.6.4

Добавлено минимальное управление участниками в пользовательском кабинете.

Что сделано:

- в /cabinet добавлена рабочая секция «Мои участники»
- реализована форма создания участника
- реализовано редактирование участника по кнопке «Редактировать»
- отображаются:
    - тип профиля
    - дата рождения
- добавлены состояния:
    - загрузка
    - ошибка
    - успешное сохранение
- после create/update кабинет автоматически обновляет данные через повторный GET /api/me/dashboard
- backend не изменялся

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- /cabinet открывается — ok
- /dev/login работает — ok
- создание участника — 201
- участник появляется после refresh dashboard — ok
- редактирование участника — 200
- изменения возвращаются в кабинете — ok
- logout очищает доступ — ok
- новый UI секции участников полностью на русском

Итог:

- кабинет перестал быть только обзорным
- появился первый реальный пользовательский action-flow внутри интерфейса
- следующий шаг: запись на тренировки из UI

## 7.5 Gorilla 0.6.5

Добавлен минимальный training booking UI в пользовательском кабинете.

Что сделано:

- в /cabinet добавлена секция «Доступные тренировки»
- данные загружаются из GET /api/trainings?isActive=true
- для каждой тренировки отображаются:
    - название
    - дата и время
    - локация
    - тренер
    - доступность
- пользователь может выбрать участника и записать его на тренировку
- в секции «Мои записи на тренировки» добавлена кнопка «Отменить запись»
- после записи и отмены кабинет автоматически обновляет:
    - dashboard
    - список тренировок
- добавлены русские состояния:
    - загрузка
    - пустой список
    - ошибка
    - успешная запись
    - успешная отмена

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- /cabinet открывается — ok
- POST /api/dev/login-as работает — ok
- GET /api/trainings?isActive=true возвращает список тренировок — ok
- запись на тренировку — 201
- после записи training bookings в dashboard увеличиваются — ok
- отмена записи — 200
- после отмены training bookings в dashboard снова уменьшаются — ok
- logout работает — ok
- новый training UI полностью русскоязычный

Итог:

- пользовательский кабинет теперь умеет не только показывать данные, но и выполнять реальный сценарий записи на тренировку
- следующий шаг: заявки в команду из интерфейса

## 7.6 Gorilla 0.6.6

Добавлен минимальный team applications UI в пользовательском кабинете.

Что сделано:

- в /cabinet добавлена секция «Доступные команды»
- данные загружаются через GET /api/teams
- пользователь может:
    - выбрать участника
    - добавить комментарий
    - подать заявку в команду через POST /api/teams/:id/applications
- добавлена секция «Мои заявки в команду»
- заявки загружаются через GET /api/my/team-applications
- реализована отмена заявки через POST /api/team-applications/:id/cancel
- добавлены русские состояния:
    - загрузка
    - пустой список
    - ошибка
    - успешная подача
    - успешная отмена
- локализованы статусы:
    - PENDING
    - IN_REVIEW
    - ACCEPTED
    - REJECTED
    - CANCELLED
- после submit/cancel team-секции обновляются без ручной перезагрузки

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Итог:

- пользовательский team flow стал доступен из интерфейса
- следующий шаг: rental booking UI в кабинете

## 7.7 Gorilla 0.6.7

Добавлен минимальный rental booking UI в пользовательском кабинете.

Что сделано:

- в /cabinet добавлена секция «Доступная аренда»
- данные загружаются через GET /api/public/rental-slots
- пользователь может:
    - бронировать на себя
    - бронировать на участника
    - добавлять комментарий noteFromUser
- бронь создаётся через POST /api/rental-slots/:id/book
- добавлена отдельная секция «Мои бронирования аренды»
- данные загружаются через GET /api/my/rental-bookings
- отмена работает через POST /api/rental-bookings/:id/cancel
- после create/cancel rental-данные обновляются без ручной перезагрузки
- локализованы статусы:
    - PENDING_CONFIRMATION
    - CONFIRMED
    - CANCELLED
- локализована доступность слотов:
    - AVAILABLE
    - BOOKED
    - UNAVAILABLE
- весь новый UI на русском языке

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Ручная проверка:

- доступные rental slots отображаются
- бронь создаётся и отображается в кабинете
- отмена работает
- после отмены слот снова становится доступным для бронирования
- dev login, dashboard, training flow и team flow не сломаны

Итог:

- пользовательский кабинет теперь закрывает все 3 главных пользовательских сценария:
    - участники
    - тренировки
    - заявки в команду
    - аренда
- следующий этап: первый минимальный staff/admin интерфейс

## 8.0 Gorilla 0.7.0

Исправлен role-based entry flow и подготовлен правильный фундамент маршрутизации по ролям.

Что сделано:

- единый вход сохранён
- основной маршрут после логина теперь зависит от роли:
    - USER -> /cabinet
    - MANAGER -> /admin
    - ADMIN -> /admin
- next учитывается только если маршрут разрешён для роли
- обычный пользователь больше не попадает в pseudo-admin сценарий
- /cabinet перестал быть основным landing для staff
- /admin стал основным staff workspace
- MANAGER и ADMIN теперь различаются по access model на уровне foundation

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok
- USER логинится в /cabinet
- MANAGER логинится в /admin
- ADMIN логинится в /admin

## 8.1 Gorilla 0.7.1

Собран новый dev-блок после предыдущего коммита.

Что сделано:

- добавлен управляемый dev seed и команда npm run db:seed
- seed работает только для локальной dev-базы hockey_platform
- seed идемпотентный и не плодит дубли при повторном запуске
- dev-база теперь автоматически заполняется тестовыми данными:
    - города
    - команды
    - роли ADMIN / MANAGER / USER
    - participant
    - тренировки
    - team application
    - rental facility / resource / slots / booking
- исправлен role-based entry flow
    - USER -> /cabinet
    - MANAGER -> /admin
    - ADMIN -> /admin
- параметр next теперь учитывается только если маршрут реально разрешён роли
- обычный пользователь больше не попадает в pseudo-admin сценарий
- /cabinet перестал быть основным landing для staff
- /admin стал основным staff workspace для manager/admin
- добавлена общая foundation-логика ролей и capabilities
    - USER
    - TRAINER
    - MANAGER
    - ADMIN
- роли и доступы теперь нормализованы через общий helper
- /admin и /cabinet используют общую capability-модель
- для TRAINER добавлен ограниченный staff workspace foundation на существующих API
- подготовлена основа дальнейшего разграничения:
    - что роль видит
    - чем управляет
    - что запрещено
- упрощён верхний блок /admin
- убран большой перегруженный capability foundation UI-блок
- вместо него оставлен компактный role / access summary:
    - текущая роль
    - уровень доступа
    - рабочий маршрут
    - краткое описание зоны ответственности
- backend, routing и seed этим последним шагом не менялись

Проверка:

- npx prisma validate — ok
- npx tsc --noEmit — ok
- npm run lint — ok
- npm run build — ok

Итог:

- dev-база теперь поднимается в управляемом виде
- роли и точки входа стали логичными
- staff workspace перестал быть сырым фундаментом без маршрутизации
- подготовлена основа для следующего шага: реальные действия из staff-интерфейса, а не только просмотр данных