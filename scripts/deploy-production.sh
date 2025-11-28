#!/usr/bin/env bash
# Build & deploy production stack using docker-compose.caddy.yml
# Requires: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET (or *_FILE), REDIS_PASSWORD, POSTGRES_PASSWORD
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-docker-compose.caddy.yml}
REQUIRED=(TWITCH_CLIENT_ID TWITCH_CLIENT_SECRET REDIS_PASSWORD POSTGRES_PASSWORD)

missing=()
for k in "${REQUIRED[@]}"; do
  val="${!k:-}"
  fileVar="${k}_FILE"
  filePath="${!fileVar:-}"
  if [[ -n "$filePath" ]]; then
    if [[ ! -f "$filePath" ]]; then
      echo "[error] $fileVar points to missing file: $filePath" >&2
      exit 1
    fi
  elif [[ -z "$val" ]]; then
    missing+=("$k")
  fi
done

if (( ${#missing[@]} )); then
  echo "[error] Missing required variables: ${missing[*]}" >&2
  exit 1
fi

echo "[info] Building backend & frontend images..."
docker compose -f "$COMPOSE_FILE" build backend frontend

echo "[info] Starting services..."
docker compose -f "$COMPOSE_FILE" up -d backend frontend postgres redis

echo "[info] Checking container status..."
docker compose -f "$COMPOSE_FILE" ps

echo "[info] Tail backend logs (Ctrl+C to exit)"
docker compose -f "$COMPOSE_FILE" logs -f backend