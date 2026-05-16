# DNK MVP Readiness Audit

Дата аудита: 2026-05-15  
Базовый коммит: `DNK MVP 1.24: Added project documentation`

## Scope and evidence

Аудит выполнен без изменения бизнес-логики и архитектуры. Подтверждения собраны из трех источников:

- локальные проверки `npm run lint`, `npx prisma validate`, `npx prisma migrate status`, `npm run build`;
- повторный локальный `db:seed` и сверка счетчиков до/после;
- ручной smoke через локальный dev-server `http://127.0.0.1:3002` для `/`, `/catalog`, `/courses/[slug]`, `/lk`, `/checkout`, `/admin`, auth API и order API.

Отдельно была сделана внешняя probe-проверка `https://stage.dnkbiz.ru/` и `https://stage.dnkbiz.ru/api/health` из текущей среды аудита. Оба запроса не прошли.

## 1. Текущее состояние MVP

Текущий MVP локально собран и функционален по базовому сценарию: публичные страницы открываются, регистрация/вход/выход работают, бесплатные курсы открываются после входа, платные курсы поддерживают preview-режим, ручной checkout создает заказ и переводит его в `PROCESSING`, админ может подтвердить оплату, после `PAID` создается `Enrollment` и полный доступ открывается.

Состояние readiness на текущий момент: **условно готов по коду, но не готов к первому публичному запуску без финальной проверки staging/mobile и очистки launch-данных**.

## 2. Что готово к запуску

- Главная страница, каталог, login и register открываются локально с кодом `200`.
- Гостевой доступ к `/lk`, `/admin` и `/checkout` корректно редиректит на login с `next=...`.
- Регистрация через `/api/auth/register` создает пользователя и сразу открывает сессию.
- Вход через `/api/auth/login` и выход через `/api/auth/logout` работают.
- `/lk` открывается после входа и SSR-страница показывает бесплатные курсы.
- Бесплатный курс `microsoft-excel-basic` открывается обычному пользователю.
- Платный курс `practical-course` открывается в preview-режиме обычному пользователю.
- Непревью-уроки платного курса остаются locked по логике `getCourseForViewer` и `CoursePlayer`.
- Создание заказа на платный курс работает.
- Повторное создание заказа для того же тарифа при активном `PENDING/PROCESSING` возвращает `409` и существующий `checkoutUrl`, а не создает дубль.
- Ручной checkout переводит заказ из `PENDING` в `PROCESSING`.
- Админский PATCH статуса заказа до `PAID` создает доступ к курсу.
- Статусы `FAILED`, `CANCELED`, `EXPIRED` не создают доступ.
- Обычный пользователь не попадает в `/admin`; админский логин открывает `/admin`.
- `npm run build` проходит.
- `npx prisma validate` проходит.
- `npx prisma migrate status` подтверждает, что база и миграции актуальны.
- `db:seed` локально выполняется и повторный запуск не создает критичных дублей.
- `.env.example`, `deploy/env/timeweb-staging.env.example`, README и deploy-docs не содержат реальных секретов; используются placeholder-значения.

## 3. Что работает частично

- Staging/domain не подтвержден как доступный извне: из среды аудита `https://stage.dnkbiz.ru/` и `/api/health` не ответили.
- Mobile smoke не подтвержден на реальных устройствах. В этой среде не было физического mobile-browser pass.
- Reported issue "на одном телефоне сайт не открывался, на другом были проблемы со входом/регистрацией" остается неподтвержденным и не закрытым.
- Test payment route существует, но в текущем окружении не проверялся как активный flow, потому что launch-путь сейчас manual SBP и `ENABLE_TEST_PAYMENTS` в example выключен.

## 4. Что критично исправить до запуска

- Проверить и очистить launch-данные: в локальной базе найден **опубликованный тестовый курс** `test` (`Тест курс`) с активным тарифом `dla`, и он реально попадает в публичный `/catalog`. Если такой же мусор есть на staging/production, это прямой launch blocker.
- Подтвердить доступность staging-домена и health endpoint с внешней сети и минимум с двух мобильных сетей/устройств.
- Пройти ручной mobile E2E: регистрация, вход, `/lk`, покупка, checkout, возврат в курс после статуса оплаты.
- Перед запуском провести финальную ревизию опубликованных курсов/тарифов и убедиться, что в каталоге и checkout остались только intended launch items.

## 5. Что можно отложить после запуска

- Полный automated E2E для auth/catalog/checkout/admin.
- Более строгий observability-pack: алерты, метрики очереди `PROCESSING`, дашборд по ошибкам checkout.
- Дополнительный dev/test payment convenience flow, если он нужен только для внутренних тестов.
- Неглубокий UX-polish, не влияющий на доступность и оплату.

## 6. Список найденных багов

### BUG-01. Published test course leaks into public catalog

- Severity: High / launch blocker if reproduced on staging or production.
- Evidence:
  - в локальной БД есть курс `slug=test`, `title=Тест курс`, `isPublished=true`;
  - у него есть активный тариф `slug=dla`;
  - SSR `/catalog` содержит этот курс.
- Risk: публичный пользователь увидит служебный или мусорный контент в каталоге и потенциально в checkout.

### BUG-02. Staging domain is not externally confirmed

- Severity: High until rechecked from target networks.
- Evidence:
  - `Invoke-WebRequest https://stage.dnkbiz.ru/` и `.../api/health` из среды аудита завершились ошибкой transport/TLS;
  - `curl.exe -I https://stage.dnkbiz.ru/` и `.../api/health` не смогли подключиться к `443`.
- Risk: нельзя считать MVP launch-ready, пока staging не подтвержден снаружи и не проверен на реальных клиентах.

### BUG-03. Mobile auth/access issue remains unresolved

- Severity: Medium-High.
- Evidence:
  - ранее уже был внешний сигнал, что на одном телефоне сайт не открывался, а на другом были проблемы со входом/регистрацией;
  - в текущем аудите физический mobile retest не выполнялся.
- Risk: публичный запуск без cross-device retest может привести к потере первых регистраций и оплат.

## 7. Рекомендованный порядок следующих задач

1. Удалить или скрыть тестовый курс и тестовый тариф из launch-базы, затем перепроверить `/catalog`.
2. Поднять и перепроверить staging-domain с desktop и минимум двух мобильных сетей.
3. Пройти ручной E2E на мобильных устройствах: register, login, `/lk`, pending order, manual checkout, `PAID` -> доступ.
4. Провести финальную ревизию launch-data: published courses, preview-уроки, active tariffs, admin account readiness.
5. После закрытия launch blockers добавить минимальный regression smoke checklist для daily pre-launch checks.

## 8. Рекомендованные commit messages для следующих 3–5 коммитов

- `chore(data): remove published test course and tariff from launch catalog`
- `chore(staging): verify external reachability and launch env parity`
- `test(mobile): record registration login and checkout smoke results`
- `chore(ops): finalize launch-day order review and health checklist`
- `test(e2e): cover auth checkout and access smoke flows`

## Audit notes

- `npm run build` и `npx prisma migrate status` пришлось подтверждать вне sandbox из-за ограничений среды, но сами проектные проверки завершились успешно.
- В ходе аудита рабочий код, Prisma schema, package scripts и бизнес-логика не менялись.
