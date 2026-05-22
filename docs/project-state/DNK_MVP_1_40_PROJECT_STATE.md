# DNK MVP 1.40 — Project State and Stabilization Map

## 1. Purpose

Этот документ фиксирует состояние проекта DNK после итераций 1.30–1.39 и служит опорной точкой для следующих stabilization-задач перед private launch, чтобы не терять контекст между итерациями.

## 2. Current product status

| Block | Status | Notes |
| --- | --- | --- |
| Public site | Ready | Публичные страницы собраны в MVP-виде и уже соответствуют базовому launch-сценарию. |
| Catalog | Ready | Каталог и карточки курсов работают как основной публичный маршрут выбора продукта. |
| Course pages | Ready | Страницы курсов и базовый CTA-flow уже используются как рабочая воронка. |
| LMS / lessons | Partially ready | Lesson flow после 1.31–1.35 стабилизирован, но desktop/mobile smoke должен оставаться обязательным. |
| Learner cabinet `/lk` | Ready | Дубли mobile/desktop-блоков исправлены, кабинет работает как основной learner hub. |
| Payments / T-Bank | Partially ready | DEMO checkout протестирован, доступ после оплаты открывается, но staging/prod сценарии еще требуют подтверждения. |
| Admin panel `/admin` | Needs stabilization | После 1.36–1.39 админка стала рабочим инструментом, но UX, visual polish и часть безопасных операций еще не финализированы. |
| Database / Prisma | Partially ready | Базовая модель данных рабочая, но ряд административных операций остается ограниченным текущей schema и access model. |
| Deployment / staging | Needs stabilization | Есть deploy-процесс и staging-инструкции, но launch-ready состояние зависит от регулярного smoke и дисциплины релизов. |

## 3. What is ready

- Курс 1С зафиксирован как первый боевой платный курс.
- Публичные страницы готовы в MVP-формате.
- Базовая регистрация и логин работают.
- Личный кабинет `/lk` работает как основной кабинет ученика.
- T-Bank DEMO flow протестирован.
- Базовая выдача доступа после оплаты работает.
- Админка уже может использоваться как рабочий внутренний инструмент, но не должна считаться финальной по UX и визуальной доводке.

## 4. Known issues

- Админка визуально еще требует polish.
- Некоторые admin drawers и cards могут требовать дальнейшей доводки.
- Управление базой не полностью покрыто безопасной backend-моделью.
- Блокировка пользователя невозможна без изменения schema.
- Hard delete пользователя опасен при связанных `orders`, `enrollments` и `progress`.
- Отзыв платных доступов ограничен текущей payment/access logic.
- Ручная проверка оплаты больше не должна доминировать после подтверждения T-Bank как основного flow.
- Нужно следить за временными артефактами Codex/headless browser и не включать их в коммиты.
- При крупных изменениях есть риск неполного коммита связанных файлов, если не проверять diff целиком.

## 5. Deferred / not for immediate launch

- AI/business OS логика.
- Генерация индивидуальных траекторий обучения.
- Публичная публикация пользовательских гайдов.
- Полноценная автоматизация внедрений.
- Партнерская программа.
- Массовый запуск пользователей.
- Расширенная аналитика.
- Полноценный audit log.
- Soft delete / blocking model до изменения schema.

## 6. Stabilization map

| Area | Current state | Risk | Next action | Priority |
| --- | --- | --- | --- | --- |
| Admin UX | Рабочий интерфейс после 1.36–1.39, но визуально и по micro-UX еще не финальный | Операторские ошибки, недоверие к внутреннему инструменту, регрессии в drawers/dropdowns/scroll | Финальный cleanup `/admin`, пройти полный desktop/mobile smoke, зафиксировать поведение ключевых экранов | P0 |
| Admin CRUD/API | Базовые операции доступны, но не все сценарии безопасно покрыты текущей backend-моделью | Ошибки в ручном управлении сущностями, риск поломки связанных данных | Пройти ревизию admin-операций, явно зафиксировать безопасные/небезопасные действия до schema-изменений | P1 |
| Payments / T-Bank | DEMO flow подтвержден локально, доступ после оплаты открывается | Платежный путь может вести себя иначе на staging/prod | Проверить checkout, callback/result flow и post-payment access в staging/prod-подобном сценарии | P0 |
| Learner cabinet | `/lk` стабилизирован после фиксов duplicate blocks | Регрессии после admin/payment правок могут снова сломать layout или CTA-flow | Повторный smoke `/lk` на desktop/mobile после каждой крупной правки в adjacent flows | P1 |
| Mobile UX | Основные mobile-polish итерации сделаны | Точечные регрессии могут остаться незамеченными до первых пользователей | Повторно проверить ключевые маршруты mobile-first smoke'ом перед каждым deploy | P1 |
| Course player | Базовый lesson flow работает | Регрессии в scroll, layout или access gating сразу бьют по core product experience | Пройти lesson smoke на desktop/mobile, отдельно проверить preview/full-access сценарии | P1 |
| Public catalog | Основной каталог и course pages рабочие | Низкий, но есть риск точечных regressions после контентных и layout-изменений | Проверять `/`, `/catalog` и ключевую страницу курса в каждом smoke-пакете | P2 |
| Deployment process | Инструкции и staging-процесс есть, но нет зафиксированного релизного ритуала без пропусков | Launch-blocking regressions могут уйти в staging/prod без полного smoke | Формализовать преддеплойный smoke и постдеплойную проверку как обязательный процесс | P0 |
| Git hygiene | Репозиторий подвержен локальному мусору от Codex/browser smoke/dev artifacts | В коммит могут попасть временные файлы, логи или неполный набор изменений | Перед каждым коммитом проходить `git status`, `git diff --name-only`, `git diff --cached --name-only` | P1 |
| Database safety | Prisma и текущая schema поддерживают MVP, но не дают безопасно закрыть все admin-сценарии | Ошибочные удаления или попытки блокировок без модели soft delete | До schema-расширения зафиксировать ограничения, не считать destructive admin-flow готовым к масштабированию | P1 |

Priority reference:

- `P0` — blocks launch
- `P1` — should fix before private launch
- `P2` — can fix after first controlled users
- `P3` — later roadmap

## 7. Launch readiness

- Private launch не считается полностью готовым, пока `admin UX` и smoke checklist не стабилизированы.
- T-Bank flow можно считать основным payment-направлением, но staging/prod сценарии еще должны быть проверены отдельно.
- Ручная оплата должна остаться fallback-сценарием, а не главным сценарием на первом экране админки.
- Первых пользователей можно запускать только после финального smoke по основным маршрутам и post-payment access.

## 8. Required smoke checklist before every next deploy

- [ ] `npm run build`
- [ ] `npx prisma validate`
- [ ] `/`
- [ ] `/catalog`
- [ ] `/catalog/1c-accounting-83`
- [ ] `/lk` desktop
- [ ] `/lk` mobile
- [ ] `/admin` desktop
- [ ] `/admin` mobile
- [ ] admin drawer open/close
- [ ] admin dropdowns
- [ ] admin scroll
- [ ] lesson desktop
- [ ] lesson mobile
- [ ] T-Bank checkout
- [ ] access after payment
- [ ] `git status clean except ignored local artifacts`

## 9. Git and cleanup rules

- Не коммитить `.codex-*`.
- Не коммитить `.chrome-*`.
- Не коммитить `prisma/dev.db`.
- Не коммитить local smoke screenshots и logs.
- Перед коммитом проверять:
  - `git status --short`
  - `git diff --name-only`
  - `git diff --cached --name-only`
- После коммита проверять:
  - `git log -1 --oneline`
  - `git status --short`

## 10. Recommended next sprint

`DNK MVP 1.41: admin stabilization cleanup and launch smoke`

Состав `1.41`:

- финальный визуальный cleanup `/admin`;
- убрать доминирование ручной оплаты;
- закрепить T-Bank как основной payment flow;
- проверить все drawers/dropdowns/scroll;
- проверить `/lk` после admin-правок;
- staging smoke;
- подготовка к controlled private launch.
