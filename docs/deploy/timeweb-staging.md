# DNK Biz: staging deploy на Timeweb VPS

Этот документ описывает базовый staging deploy DNK Biz как обычного Node.js приложения на VPS без Docker и без боевой платежки.

## Что подготовлено в репозитории

- health endpoint: `GET /api/health`
- staging env example: `deploy/env/timeweb-staging.env.example`
- systemd template: `deploy/systemd/dnkbiz-staging.service`
- nginx template: `deploy/nginx/dnkbiz-staging.conf`
- staging start script: `npm run start:staging`

`GET /api/health` возвращает:

```json
{ "status": "ok" }
```

## Минимальные требования к серверу

- Linux VPS с `systemd` и `nginx`
- Node.js `>=20.9.0`
- `npm`
- доступ к PostgreSQL
- домен или поддомен для staging

## Обязательные env для staging

Используйте `deploy/env/timeweb-staging.env.example` как шаблон.

- `DATABASE_URL`
- `AUTH_SECRET`
- `SESSION_COOKIE_NAME`
- `PAYMENT_WEBHOOK_SECRET`
- `ENABLE_TEST_PAYMENTS=false`

Замечания:

- `ENABLE_TEST_PAYMENTS` должен оставаться `false` в публичном staging.
- `PAYMENT_WEBHOOK_SECRET` все равно должен быть задан длинной случайной строкой, даже если боевая платежка еще не подключена.
- `NODE_ENV=production` задается через `systemd`, а не через env-файл приложения.

## Рекомендуемая структура на сервере

```text
/var/www/dnkbiz/
  current/                 # код приложения
  shared/
    dnkbiz-staging.env     # env-файл для systemd
```

## Подготовка сервера

1. Установите Node.js `>=20.9.0` и `nginx`.
2. Создайте системного пользователя и рабочие директории.
3. Разместите код проекта в `/var/www/dnkbiz/current`.
4. Создайте env-файл `/var/www/dnkbiz/shared/dnkbiz-staging.env` на основе `deploy/env/timeweb-staging.env.example`.

Пример базовой подготовки:

```bash
sudo adduser --system --group --home /var/www/dnkbiz dnkbiz
sudo mkdir -p /var/www/dnkbiz/current /var/www/dnkbiz/shared
sudo chown -R dnkbiz:dnkbiz /var/www/dnkbiz
```

## Первый deploy

Выполняйте команды из директории приложения:

```bash
cd /var/www/dnkbiz/current
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run build
```

## Запуск через systemd

Основной путь для VPS: `systemd`.

1. Скопируйте шаблон сервиса:

```bash
sudo cp deploy/systemd/dnkbiz-staging.service /etc/systemd/system/dnkbiz-staging.service
```

2. При необходимости поправьте в unit-файле:

- `User`
- `Group`
- `WorkingDirectory`
- `EnvironmentFile`
- `ExecStart`, если `npm` расположен не в `/usr/bin/npm`

3. Активируйте сервис:

```bash
sudo systemctl daemon-reload
sudo systemctl enable dnkbiz-staging
sudo systemctl start dnkbiz-staging
sudo systemctl status dnkbiz-staging
```

4. Полезные команды:

```bash
sudo systemctl restart dnkbiz-staging
sudo systemctl stop dnkbiz-staging
journalctl -u dnkbiz-staging -n 100 --no-pager
```

## Reverse proxy через nginx

1. Скопируйте шаблон:

```bash
sudo cp deploy/nginx/dnkbiz-staging.conf /etc/nginx/sites-available/dnkbiz-staging.conf
```

2. Замените:

- `staging.example.com` на ваш staging-домен
- пути `ssl_certificate` и `ssl_certificate_key` на реальные сертификаты

3. Активируйте конфиг:

```bash
sudo ln -s /etc/nginx/sites-available/dnkbiz-staging.conf /etc/nginx/sites-enabled/dnkbiz-staging.conf
sudo nginx -t
sudo systemctl reload nginx
```

Шаблон уже проксирует приложение на `127.0.0.1:3000`, что соответствует `npm run start:staging`.

## Проверка живости

Локально на сервере:

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

Через домен:

```bash
curl -fsS https://staging.example.com/api/health
```

Ожидаемый ответ:

```json
{ "status": "ok" }
```

Если health endpoint отвечает, это означает, что `next start` поднят и reverse proxy отдает запрос до приложения.

## Повторный deploy после обновления кода

```bash
cd /var/www/dnkbiz/current
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run build
sudo systemctl restart dnkbiz-staging
```

## Короткий staging checklist

- env-файл создан и заполнен
- `ENABLE_TEST_PAYMENTS=false`
- `npm ci` завершился без ошибок
- `npm run db:generate` завершился без ошибок
- `npm run db:migrate:deploy` завершился без ошибок
- `npm run build` завершился без ошибок
- `dnkbiz-staging.service` запущен
- `nginx -t` проходит
- `/api/health` отвечает локально и через домен
- `/admin` доступен только `ADMIN` и не индексируется

## Что пока не входит в staging deploy

- подключение боевой платежки
- Docker
- multi-instance deployment
- shared cache для нескольких инстансов
