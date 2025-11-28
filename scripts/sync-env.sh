#!/usr/bin/env bash
# sync-env.sh
# Rebuild a target .env file from the example while preserving existing values.
# Usage: ./scripts/sync-env.sh backend/.env.production.example backend/.env.production
# If the output file exists its values are preferred. Otherwise environment variables are used.

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <example-file> <output-file> [existing-file]" >&2
  exit 1
fi

EXAMPLE_FILE="$1"
OUTPUT_FILE="$2"
EXISTING_FILE="${3:-}" # optional third arg

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "Example file not found: $EXAMPLE_FILE" >&2
  exit 1
fi

# Load existing key/value map from existing file if provided
declare -A EXISTING
if [ -n "$EXISTING_FILE" ] && [ -f "$EXISTING_FILE" ]; then
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    EXISTING[$k]="$v"
  done < "$EXISTING_FILE"
fi

# Also read from output file if it already exists (highest precedence)
if [ -f "$OUTPUT_FILE" ]; then
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    EXISTING[$k]="$v"
  done < "$OUTPUT_FILE"
fi

# Build output, preserving comments and order
TMP_FILE="${OUTPUT_FILE}.tmp"
: > "$TMP_FILE"
while IFS='' read -r line || [ -n "$line" ]; do
  if [[ "$line" =~ ^([A-Z0-9_]+)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    defaultValue="${BASH_REMATCH[2]}"
    # Precedence: existing map > env var > example default
    value="${EXISTING[$key]:-${!key:-$defaultValue}}"
    printf '%s=%s\n' "$key" "$value" >> "$TMP_FILE"
  else
    # Non key line (comment / blank) preserved as-is
    printf '%s\n' "$line" >> "$TMP_FILE"
  fi
done < "$EXAMPLE_FILE"

mv "$TMP_FILE" "$OUTPUT_FILE"

echo "Synced env file written: $OUTPUT_FILE"
