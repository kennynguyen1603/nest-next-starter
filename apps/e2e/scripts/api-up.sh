#!/usr/bin/env bash
# Starts a throwaway, fully local API for the Playwright "api" project:
# docker Postgres + Redis on non-default ports, then build, migrate, seed, run.
#
# Isolation: every process runs from an empty temp cwd (so no .env is loaded)
# under `env -i` with an explicit allowlist. Nothing points at remote services,
# all secrets are random per run, and the seed demo users only exist here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
API="$ROOT/apps/api"
RUN_DIR="${TMPDIR:-/tmp}/nest-next-e2e-api"
PG=e2e-pg
REDIS=e2e-redis

"$(dirname "$0")/api-down.sh" >/dev/null 2>&1 || true
mkdir -p "$RUN_DIR"

docker run --rm -d --name "$PG" -p 127.0.0.1:55432:5432 \
  -e POSTGRES_USER=e2e -e POSTGRES_PASSWORD=e2e -e POSTGRES_DB=e2e \
  postgres:17-alpine >/dev/null
docker run --rm -d --name "$REDIS" -p 127.0.0.1:56379:6379 redis:7-alpine >/dev/null

until docker exec "$PG" pg_isready -U e2e -d e2e >/dev/null 2>&1; do sleep 0.5; done

(cd "$API" && pnpm exec nest build >/dev/null)

secret() { openssl rand -hex 32; }
run() {
  (cd "$RUN_DIR" && env -i \
    PATH="$PATH" HOME="$RUN_DIR" \
    NODE_ENV=development APP_NAME=e2e APP_PORT=8080 API_PREFIX=api \
    FRONTEND_DOMAIN=http://localhost:3000 ADMIN_DOMAIN=http://localhost:3002 \
    BACKEND_DOMAIN=http://localhost:8080 \
    APP_FALLBACK_LANGUAGE=en APP_HEADER_LANGUAGE=x-custom-lang \
    APP_COOKIE_SECURE=false APP_COOKIE_SAME_SITE=lax \
    DATABASE_TYPE=postgres DATABASE_HOST=localhost DATABASE_PORT=55432 \
    DATABASE_USERNAME=e2e DATABASE_PASSWORD=e2e DATABASE_NAME=e2e \
    DATABASE_SYNCHRONIZE=false DATABASE_SSL_ENABLED=false \
    AUTH_JWT_SECRET="$JWT" AUTH_JWT_TOKEN_EXPIRES_IN=15m \
    AUTH_REFRESH_SECRET="$REFRESH" AUTH_REFRESH_TOKEN_EXPIRES_IN=1d \
    AUTH_FORGOT_SECRET="$FORGOT" AUTH_FORGOT_TOKEN_EXPIRES_IN=30m \
    AUTH_CONFIRM_EMAIL_SECRET="$CONFIRM" AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN=1d \
    BASIC_AUTH_USERNAME=e2e BASIC_AUTH_PASSWORD="$BASIC" \
    MAIL_HOST=localhost MAIL_PORT=1025 MAIL_USER= MAIL_PASSWORD= \
    MAIL_DEFAULT_EMAIL=noreply@example.test MAIL_DEFAULT_NAME=e2e \
    MAIL_IGNORE_TLS=true MAIL_SECURE=false MAIL_REQUIRE_TLS=false \
    FILE_DRIVER=local \
    REDIS_HOST=localhost REDIS_PORT=56379 REDIS_TLS=false \
    NOTIFICATIONS_ENABLED=false WEBSOCKET_ENABLED=false \
    THROTTLER_ENABLED=false \
    "$@")
}

JWT=$(secret) REFRESH=$(secret) FORGOT=$(secret) CONFIRM=$(secret) BASIC=$(secret)

run node "$API/node_modules/typeorm/cli.js" migration:run \
  -d "$API/dist/database/data-source.js" >"$RUN_DIR/migrate.log" 2>&1
run node "$API/dist/database/seeds/relational/run-seed.js" >"$RUN_DIR/seed.log" 2>&1

run node "$API/dist/main.js" >"$RUN_DIR/api.log" 2>&1 &
echo $! >"$RUN_DIR/api.pid"

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:8080/api/v1/health >/dev/null 2>&1; then
    echo "API ready on http://localhost:8080 (logs: $RUN_DIR)"
    exit 0
  fi
  sleep 1
done
echo "API did not become healthy; see $RUN_DIR/api.log" >&2
exit 1
