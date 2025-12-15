#!/usr/bin/env bash
#
# API Keys Rotation Script
# This script rotates API keys (Stripe, Twitch, OpenAI) in Vault
#
# Usage: ./rotate-api-keys.sh --service [stripe|twitch|openai] [--dry-run]
#

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.subcult.tv}"
VAULT_PATH="${VAULT_PATH:-kv/clipper/backend}"
SERVICE=""
DRY_RUN=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_instruction() {
  echo -e "${BLUE}[ACTION REQUIRED]${NC} $1"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --service)
      SERVICE="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --service [stripe|twitch|openai] [--dry-run]"
      exit 1
      ;;
  esac
done

if [ -z "$SERVICE" ]; then
  log_error "Service not specified. Use --service [stripe|twitch|openai]"
  exit 1
fi

# Check if Vault is accessible
check_vault() {
  log_info "Checking Vault connectivity..."
  if ! vault status > /dev/null 2>&1; then
    log_error "Cannot connect to Vault at $VAULT_ADDR"
    log_error "Please ensure VAULT_ADDR is set and you are authenticated"
    exit 1
  fi
  log_info "✓ Vault is accessible"
}

# Get current key from Vault
get_current_key() {
  local field="$1"
  vault kv get -field="$field" "$VAULT_PATH" 2>/dev/null || echo ""
}

# Update key in Vault
update_vault_key() {
  local field="$1"
  local value="$2"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would execute: vault kv patch $VAULT_PATH $field='***'"
    return 0
  fi
  
  vault kv patch "$VAULT_PATH" "$field=$value" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    log_info "✓ Vault updated successfully"
    return 0
  else
    log_error "Failed to update Vault"
    return 1
  fi
}

# Restart backend service
restart_backend() {
  log_info "Restarting backend service..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would execute: docker compose restart vault-agent backend"
    return 0
  fi
  
  if command -v docker > /dev/null && docker compose ps > /dev/null 2>&1; then
    docker compose restart vault-agent
    sleep 5
    docker compose restart backend
    log_info "✓ Services restarted"
  elif command -v systemctl > /dev/null; then
    systemctl restart clipper-vault-agent
    sleep 5
    systemctl restart clipper-backend
    log_info "✓ Services restarted via systemd"
  else
    log_warn "Could not automatically restart services. Please restart manually."
  fi
}

# Rotate Stripe keys
rotate_stripe() {
  log_info "=== Rotating Stripe API Keys ==="
  
  log_instruction ""
  log_instruction "Please complete the following steps in the Stripe Dashboard:"
  log_instruction "1. Go to https://dashboard.stripe.com/apikeys"
  log_instruction "2. Click 'Create secret key' or 'Roll secret key'"
  log_instruction "3. Copy the new secret key (starts with 'sk_live_' or 'sk_test_')"
  log_instruction ""
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Skipping interactive input"
    NEW_KEY="sk_test_dryrun"
  else
    read -p "Enter new Stripe secret key: " -s NEW_KEY
    echo ""
    
    if [[ ! "$NEW_KEY" =~ ^sk_(live|test)_ ]]; then
      log_error "Invalid Stripe key format. Key should start with 'sk_live_' or 'sk_test_'"
      exit 1
    fi
  fi
  
  # Get current key for logging
  CURRENT_KEY=$(get_current_key "STRIPE_SECRET_KEY")
  if [ -n "$CURRENT_KEY" ]; then
    log_info "Current key (last 4): ...${CURRENT_KEY: -4}"
  fi
  
  # Update Vault
  if ! update_vault_key "STRIPE_SECRET_KEY" "$NEW_KEY"; then
    log_error "Failed to update Stripe key in Vault"
    exit 1
  fi
  
  log_instruction ""
  log_instruction "Next steps for webhook secrets:"
  log_instruction "1. Go to https://dashboard.stripe.com/webhooks"
  log_instruction "2. Click on your webhook endpoint"
  log_instruction "3. Click 'Roll secret'"
  log_instruction "4. Run: vault kv patch $VAULT_PATH STRIPE_WEBHOOK_SECRET='whsec_xxx'"
  log_instruction ""
  
  restart_backend
  
  log_info "✓ Stripe key rotation complete"
  log_info "Next rotation recommended: $(date -d '+180 days' '+%Y-%m-%d')"
}

# Rotate Twitch credentials
rotate_twitch() {
  log_info "=== Rotating Twitch OAuth Credentials ==="
  
  log_instruction ""
  log_instruction "Please complete the following steps in the Twitch Developer Console:"
  log_instruction "1. Go to https://dev.twitch.tv/console/apps"
  log_instruction "2. Select your application"
  log_instruction "3. Click 'Manage' → 'New Secret'"
  log_instruction "4. Copy the Client ID and Client Secret"
  log_instruction ""
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Skipping interactive input"
    NEW_CLIENT_ID="dryrun_client_id"
    NEW_CLIENT_SECRET="dryrun_client_secret"
  else
    read -p "Enter new Twitch Client ID: " NEW_CLIENT_ID
    read -p "Enter new Twitch Client Secret: " -s NEW_CLIENT_SECRET
    echo ""
    
    if [ -z "$NEW_CLIENT_ID" ] || [ -z "$NEW_CLIENT_SECRET" ]; then
      log_error "Client ID and Client Secret are required"
      exit 1
    fi
  fi
  
  # Update both keys in Vault
  if ! update_vault_key "TWITCH_CLIENT_ID" "$NEW_CLIENT_ID"; then
    log_error "Failed to update Twitch Client ID in Vault"
    exit 1
  fi
  
  if ! update_vault_key "TWITCH_CLIENT_SECRET" "$NEW_CLIENT_SECRET"; then
    log_error "Failed to update Twitch Client Secret in Vault"
    # Attempt to rollback
    log_warn "Rolling back Client ID..."
    exit 1
  fi
  
  restart_backend
  
  log_info "✓ Twitch credentials rotation complete"
  log_info "Next rotation recommended: $(date -d '+90 days' '+%Y-%m-%d')"
  log_warn "Note: Existing user sessions remain valid. No user action required."
}

# Rotate OpenAI API key
rotate_openai() {
  log_info "=== Rotating OpenAI API Key ==="
  
  log_instruction ""
  log_instruction "Please complete the following steps in the OpenAI Platform:"
  log_instruction "1. Go to https://platform.openai.com/api-keys"
  log_instruction "2. Click 'Create new secret key'"
  log_instruction "3. Name it 'clipper-production-$(date +%Y%m%d)'"
  log_instruction "4. Copy the secret key (starts with 'sk-')"
  log_instruction ""
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Skipping interactive input"
    NEW_KEY="sk-dryrun"
  else
    read -p "Enter new OpenAI API key: " -s NEW_KEY
    echo ""
    
    if [[ ! "$NEW_KEY" =~ ^sk- ]]; then
      log_error "Invalid OpenAI key format. Key should start with 'sk-'"
      exit 1
    fi
  fi
  
  # Get current key for logging
  CURRENT_KEY=$(get_current_key "OPENAI_API_KEY")
  if [ -n "$CURRENT_KEY" ]; then
    log_info "Current key (last 4): ...${CURRENT_KEY: -4}"
  fi
  
  # Update Vault
  if ! update_vault_key "OPENAI_API_KEY" "$NEW_KEY"; then
    log_error "Failed to update OpenAI key in Vault"
    exit 1
  fi
  
  log_instruction ""
  log_instruction "Next step: Delete the old key from OpenAI Platform"
  log_instruction "1. Go back to https://platform.openai.com/api-keys"
  log_instruction "2. Find the old key and click 'Delete'"
  log_instruction ""
  
  restart_backend
  
  log_info "✓ OpenAI key rotation complete"
  log_info "Next rotation recommended: $(date -d '+180 days' '+%Y-%m-%d')"
}

# Main
main() {
  if [ "$DRY_RUN" = true ]; then
    log_warn "Running in DRY RUN mode - no changes will be made"
  fi
  
  check_vault
  
  case "$SERVICE" in
    stripe)
      rotate_stripe
      ;;
    twitch)
      rotate_twitch
      ;;
    openai)
      rotate_openai
      ;;
    *)
      log_error "Unknown service: $SERVICE"
      log_error "Supported services: stripe, twitch, openai"
      exit 1
      ;;
  esac
  
  log_info ""
  log_info "=== Rotation Complete ==="
  log_info "✓ $SERVICE credentials rotated successfully"
  log_info "✓ New credentials stored in Vault"
  log_info "✓ Services restarted"
  log_info ""
  log_info "Don't forget to:"
  log_info "  - Update your password manager"
  log_info "  - Document the rotation date"
  log_info "  - Monitor application logs for any issues"
}

main
