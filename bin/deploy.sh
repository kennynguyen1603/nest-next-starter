#!/bin/bash
set -euo pipefail

cd ~/nest-next-starter

echo "→ Pulling latest code..."
git pull origin main

echo "→ Starting containers..."
docker compose up -d --build

echo "✓ Deploy complete"
