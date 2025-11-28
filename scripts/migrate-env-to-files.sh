#!/usr/bin/env bash
# Migrate sensitive key=value pairs from a .env into individual files under secrets/
# Usage: ENV_FILE=backend/.env ./scripts/migrate-env-to-files.sh
set -euo pipefail
ENV_FILE=${ENV_FILE:-backend/.env}
TARGET=${TARGET_DIR:-secrets}
mkdir -p "$TARGET"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[error] Source env file $ENV_FILE not found" >&2
  exit 1
fi

SENSITIVE=(DB_PASSWORD REDIS_PASSWORD JWT_PRIVATE_KEY JWT_PUBLIC_KEY TWITCH_CLIENT_SECRET STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET OPENAI_API_KEY SENDGRID_API_KEY OPENSEARCH_PASSWORD)
> "$TARGET/export_files.env"
for key in "${SENSITIVE[@]}"; do
  line=$(grep -E "^${key}=" "$ENV_FILE" || true)
  [[ -z "$line" ]] && continue
  val=${line#${key}=}
  [[ -z "$val" ]] && { echo "[skip] $key empty"; continue; }
  fname="$TARGET/${key,,}"
  if [[ -s "$fname" ]]; then
    echo "[keep] $fname exists"
  else
    printf '%s' "$val" > "$fname"
    chmod 600 "$fname"
    echo "[write] $fname"
  fi
  echo "export ${key}_FILE=$PWD/$fname" >> "$TARGET/export_files.env"
  echo "# unset ${key}" >> "$TARGET/export_files.env"
  unset val
  sleep 0.05
  sync
done

echo "[done] File-based secrets created. Source with: set -a; source $TARGET/export_files.env; set +a"