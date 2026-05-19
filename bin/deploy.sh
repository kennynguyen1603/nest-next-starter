#!/bin/bash
set -e

cd "$(dirname "$(realpath "$0")")/.."

echo "→ Pulling latest code..."
git pull origin main

echo "→ Starting containers..."
docker compose up -d --build

echo "→ Running seeds..."
docker compose run --rm seed

echo "✓ Deploy complete"
