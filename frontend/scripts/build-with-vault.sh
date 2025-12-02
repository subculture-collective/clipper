#!/usr/bin/env bash
set -euo pipefail

# Purpose: Render frontend.env from Vault and build the frontend with Sentry sourcemap upload.
# Requires VAULT_ADDR, VAULT_ROLE_ID, VAULT_SECRET_ID to be set in environment.
# Vault Agent renders env to ./vault/rendered/frontend.env by using the provided template.

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
RENDER_DIR="$ROOT_DIR/../vault/rendered"
TEMPLATE_PATH="$ROOT_DIR/../vault/templates/frontend.env.ctmpl"
RENDER_PATH="$RENDER_DIR/frontend.env"

mkdir -p "$RENDER_DIR"

if [[ ! -f "$TEMPLATE_PATH" ]]; then
  echo "Missing Vault template: $TEMPLATE_PATH" >&2
  exit 1
fi

# Start Vault Agent once to render template (assumes agent binary available in PATH)
# Agent HCL expected at ../vault/agent.hcl with sink/template to RENDER_PATH.
if ! command -v vault >/dev/null 2>&1; then
  echo "vault CLI not found. Install or ensure it's available in CI runner." >&2
  exit 1
fi

# Render via vault agent template if VAULT_TOKEN or agent auth is available; otherwise fallback to kv get
if [[ -z "${VAULT_TOKEN:-}" ]]; then
  # Try AppRole files under vault/approle to obtain a token
  # Frontend uses dedicated frontend_role_id and frontend_secret_id files
  ROLE_FILE="$ROOT_DIR/../vault/approle/frontend_role_id"
  SECRET_FILE="$ROOT_DIR/../vault/approle/frontend_secret_id"

  # Fallback to backend AppRole if frontend files don't exist yet
  if [[ ! -f "$ROLE_FILE" || ! -f "$SECRET_FILE" ]]; then
    ROLE_FILE="$ROOT_DIR/../vault/approle/role_id"
    SECRET_FILE="$ROOT_DIR/../vault/approle/secret_id"
  fi

  if [[ -f "$ROLE_FILE" && -f "$SECRET_FILE" ]]; then
    ROLE_ID=$(cat "$ROLE_FILE")
    SECRET_ID=$(cat "$SECRET_FILE")
    LOGIN_JSON=$(vault write -format=json auth/approle/login role_id="$ROLE_ID" secret_id="$SECRET_ID" 2>/dev/null || true)
    if [[ -n "$LOGIN_JSON" ]]; then
      export VAULT_TOKEN=$(echo "$LOGIN_JSON" | jq -r '.auth.client_token')
    fi
  fi
fi

if [[ -n "${VAULT_TOKEN:-}" ]]; then
  # Use kv get to fetch JSON and write env file
  tmp_json=$(mktemp)
  vault kv get -format=json kv/clipper/frontend > "$tmp_json"
  if [[ ! -s "$tmp_json" ]]; then
    echo "Vault kv get returned empty JSON for kv/clipper/frontend" >&2
    exit 1
  fi
  # Extract fields and write env
  jq -r '.data.data | to_entries | map("\(.key)=\(.value)") | .[]' "$tmp_json" > "$RENDER_PATH"
  rm -f "$tmp_json"
else
  # Attempt agent template rendering
  vault agent -template "$TEMPLATE_PATH:$RENDER_PATH" >/dev/null || true
  if [[ ! -f "$RENDER_PATH" || ! -s "$RENDER_PATH" ]]; then
    echo "Vault render failed: $RENDER_PATH not created; set VAULT_TOKEN or place AppRole files in vault/approle." >&2
    exit 1
  fi
fi

# Export environment for Vite and Sentry plugin
set -a
source "$RENDER_PATH"
set +a

# Ensure release alignment
export VITE_SENTRY_RELEASE=${VITE_SENTRY_RELEASE:-${SENTRY_RELEASE:-"$(date +%Y%m%d%H%M%S)"}}

# Build with Vite (uses @sentry/vite-plugin)
cd "$ROOT_DIR"

if [[ -f package.json ]]; then
  npm ci
  npm run build -- --mode production
else
  echo "package.json not found in $ROOT_DIR" >&2
  exit 1
fi
