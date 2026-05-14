#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="${SERVICE_NAME:-dnkbiz-staging}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/api/health}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"

cd "$ROOT_DIR"

echo "[deploy] fetch origin"
git fetch origin

echo "[deploy] reset to origin/main"
git reset --hard origin/main

echo "[deploy] install dependencies"
npm install

echo "[deploy] generate prisma client"
npm run db:generate

echo "[deploy] apply prisma migrations"
npm run db:migrate:deploy

echo "[deploy] build application"
npm run build

echo "[deploy] restart ${SERVICE_NAME}"
systemctl restart "$SERVICE_NAME"

echo "[deploy] wait for ${HEALTH_URL}"
for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
    echo "staging ok"
    exit 0
  fi

  sleep "$HEALTH_DELAY_SECONDS"
done

echo "[deploy] health check failed: ${HEALTH_URL}" >&2
systemctl status "$SERVICE_NAME" --no-pager || true
exit 1
