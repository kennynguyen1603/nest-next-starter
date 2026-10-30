#!/usr/bin/env bash
# Stops the API started by api-up.sh and removes its throwaway containers.
set -u

RUN_DIR="${TMPDIR:-/tmp}/nest-next-e2e-api"

if [ -f "$RUN_DIR/api.pid" ]; then
  kill "$(cat "$RUN_DIR/api.pid")" 2>/dev/null
  rm -f "$RUN_DIR/api.pid"
fi
docker rm -f e2e-pg e2e-redis >/dev/null 2>&1
echo "E2E API stopped"
