# Staging Deploy On Timeweb VPS

Документ описывает повторяемый deploy staging-окружения на VPS без Docker и без автоматического эквайринга.

## Что уже есть в репозитории

- health endpoint: `GET /api/health`
- env-шаблон: `deploy/env/timeweb-staging.env.example`
- systemd unit: `deploy/systemd/dnkbiz-staging.service`
- nginx template: `deploy/nginx/dnkbiz-staging.conf`
- staging start command: `npm run start:staging`
- deploy script: `scripts/deploy-staging.sh`

Ожидаемый ответ health endpoint:

```json
{ "status": "ok" }
```

## Требования к серверу

- Linux VPS с `systemd`
- `nginx`
- Node.js `>=20.9.0`
- `npm`
- доступ к PostgreSQL
- staging-домен или поддомен

## Обязательные переменные окружения

Используйте `deploy/env/timeweb-staging.env.example` как шаблон.

- `DATABASE_URL`
- `AUTH_SECRET`
- `SESSION_COOKIE_NAME`
- `PAYMENT_WEBHOOK_SECRET`
- `ENABLE_TEST_PAYMENTS="false"`

Важно:

- `ENABLE_TEST_PAYMENTS` должен оставаться выключенным на staging, который используется для закрытого запуска.
- `PAYMENT_WEBHOOK_SECRET` должен быть заполнен даже до подключения боевой платежки.
- `NODE_ENV=production` задается через systemd unit.

## Рекомендуемая структура на сервере

```text
/var/www/dnkbiz/
  current/
  shared/
    dnkbiz-staging.env
```

## Подготовка сервера

1. Установите Node.js `>=20.9.0` и `nginx`.
2. Создайте системного пользователя и рабочие директории.
3. Разместите код проекта в `/var/www/dnkbiz/current`.
4. Создайте env-файл `/var/www/dnkbiz/shared/dnkbiz-staging.env` по шаблону `deploy/env/timeweb-staging.env.example`.

Пример базовой подготовки:

```bash
sudo adduser --system --group --home /var/www/dnkbiz dnkbiz
sudo mkdir -p /var/www/dnkbiz/current /var/www/dnkbiz/shared
sudo chown -R dnkbiz:dnkbiz /var/www/dnkbiz
```

## Первый deploy вручную

```bash
cd /var/www/dnkbiz/current
npm install
npm run db:generate
npm run db:migrate:deploy
npm run build
sudo systemctl daemon-reload
sudo systemctl enable dnkbiz-staging
sudo systemctl restart dnkbiz-staging
curl -fsS http://127.0.0.1:3000/api/health
```

Если `npm run build` падает, не перезапускайте сервис. Сначала исправьте причину ошибки и только потом повторите deploy.

## Повторяемый deploy script

Скрипт `scripts/deploy-staging.sh` выполняет:

1. `git fetch origin`
2. `git reset --hard origin/main`
3. `npm install`
4. `npm run db:generate`
5. `npm run db:migrate:deploy`
6. `npm run build`
7. `systemctl restart dnkbiz-staging`
8. ожидание `GET /api/health`
9. вывод `staging ok`

Скрипт намеренно не запускает `db:seed`.

Пример запуска:

```bash
cd /var/www/dnkbiz/current
sudo bash scripts/deploy-staging.sh
```

Если сервис можно перезапускать без `sudo`, запускайте обычным пользователем.

## Systemd

Скопируйте unit-файл:

```bash
sudo cp deploy/systemd/dnkbiz-staging.service /etc/systemd/system/dnkbiz-staging.service
sudo systemctl daemon-reload
sudo systemctl enable dnkbiz-staging
```

Проверьте значения в unit-файле:

- `User`
- `Group`
- `WorkingDirectory`
- `EnvironmentFile`
- `ExecStart`

Полезные команды:

```bash
sudo systemctl restart dnkbiz-staging
sudo systemctl stop dnkbiz-staging
sudo systemctl status dnkbiz-staging --no-pager
journalctl -u dnkbiz-staging -n 100 --no-pager
```

## Nginx

Скопируйте конфиг:

```bash
sudo cp deploy/nginx/dnkbiz-staging.conf /etc/nginx/sites-available/dnkbiz-staging.conf
```

Замените:

- `staging.example.com` на реальный staging-домен
- пути к `ssl_certificate` и `ssl_certificate_key`

Активируйте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/dnkbiz-staging.conf /etc/nginx/sites-enabled/dnkbiz-staging.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Проверка после deploy

Локально на сервере:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Через домен:

```bash
curl -fsS https://stage.dnkbiz.ru/api/health
```

Если оба запроса отвечают корректно, приложение поднято и проксирование работает.

## Seed On Staging

`db:seed` не является частью staging deploy.

Текущий `prisma/seed.mjs` специально защищен:

- запрещен при `NODE_ENV=production`;
- разрешен только для dev-хостов;
- разрешен только для dev-базы с ожидаемым именем.

В проекте сейчас нет флага вида `ALLOW_STAGING_SEED=true`. Добавлять обход этой защиты для закрытого запуска не нужно.

Практическое правило:

- не запускайте `npm run db:seed` на staging без отдельного осознанного решения;
- не пытайтесь "временно" обойти защиту seed прямо на сервере;
- если staging нужно наполнить данными, сначала сделайте backup и используйте отдельный понятный план переноса, а не обычный seed-скрипт.

## Короткий staging checklist

- env-файл создан и заполнен
- `ENABLE_TEST_PAYMENTS="false"`
- `npm install` завершился без ошибок
- `npm run db:generate` завершился без ошибок
- `npm run db:migrate:deploy` завершился без ошибок
- `npm run build` завершился без ошибок
- `dnkbiz-staging` перезапущен
- `/api/health` отвечает локально и через домен
- `/admin` доступен только пользователю с ролью `ADMIN`
- ручная оплата по СБП и подтверждение в `/admin` проверены по `docs/launch-checklist.md`
