#!/usr/bin/env bash
set -euo pipefail

FILE="${1:-frontend/.env.production}"

if [[ ! -f "$FILE" ]]; then
  echo "[info] $FILE not found; skipping VITE env check." >&2
  exit 0
fi

bad=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$FILE" | grep -v '^VITE_' || true)
if [[ -n "$bad" ]]; then
  echo "Error: Non-VITE variables detected in $FILE" >&2
  echo "$bad" >&2
  exit 1
fi

echo "[ok] Frontend env check passed (only VITE_* keys)."
