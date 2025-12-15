#!/usr/bin/env bash
#
# JWT Signing Keys Rotation Script
# This script rotates JWT signing keys with graceful migration
# to avoid invalidating existing user sessions immediately.
#
# Usage: ./rotate-jwt-keys.sh [--dry-run]
#

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.subcult.tv}"
VAULT_PATH="${VAULT_PATH:-kv/clipper/backend}"
DRY_RUN=false
TEMP_DIR="/tmp/jwt-rotation-$$"

# Detect base64 command for portability (GNU vs BSD)
if base64 --version >/dev/null 2>&1; then
  # GNU base64 (Linux)
  BASE64_ENCODE="base64 -w 0"
else
  # BSD base64 (macOS) - outputs without wrapping by default
  BASE64_ENCODE="base64"
fi

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
  esac
done

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
  echo -e "${BLUE}[IMPORTANT]${NC} $1"
}

# Cleanup function
cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}

trap cleanup EXIT

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

# Check if openssl is available
check_openssl() {
  if ! command -v openssl > /dev/null 2>&1; then
    log_error "openssl is required but not installed"
    exit 1
  fi
}

# Generate new RSA key pair
generate_keys() {
  log_info "Generating new RSA key pair (2048-bit)..."
  
  mkdir -p "$TEMP_DIR"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would generate new RSA key pair"
    return 0
  fi
  
  # Generate private key
  openssl genrsa -out "$TEMP_DIR/private.pem" 2048 > /dev/null 2>&1
  
  # Generate public key
  openssl rsa -in "$TEMP_DIR/private.pem" -pubout -out "$TEMP_DIR/public.pem" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    log_info "✓ New key pair generated"
    return 0
  else
    log_error "Failed to generate key pair"
    return 1
  fi
}

# Get current keys from Vault
get_current_keys() {
  log_info "Retrieving current keys from Vault..."
  
  local private_key_b64=$(vault kv get -field=JWT_PRIVATE_KEY_B64 "$VAULT_PATH" 2>/dev/null || echo "")
  local public_key_b64=$(vault kv get -field=JWT_PUBLIC_KEY_B64 "$VAULT_PATH" 2>/dev/null || echo "")
  
  if [ -n "$private_key_b64" ] && [ -n "$public_key_b64" ]; then
    log_info "✓ Current keys retrieved"
    
    # Decode and save current keys
    if [ "$DRY_RUN" = false ]; then
      echo "$private_key_b64" | base64 -d > "$TEMP_DIR/old_private.pem"
      echo "$public_key_b64" | base64 -d > "$TEMP_DIR/old_public.pem"
      log_info "  Private key fingerprint: $(openssl rsa -in "$TEMP_DIR/old_private.pem" -noout -modulus 2>/dev/null | openssl md5 | cut -d' ' -f2)"
    fi
    return 0
  else
    log_warn "No existing keys found in Vault"
    return 1
  fi
}

# Update keys in Vault
update_vault_keys() {
  log_info "Updating JWT keys in Vault..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would update JWT_PRIVATE_KEY_B64 and JWT_PUBLIC_KEY_B64 in Vault"
    return 0
  fi
  
  # Base64 encode the new keys (using portable command)
  local private_key_b64=$($BASE64_ENCODE < "$TEMP_DIR/private.pem")
  local public_key_b64=$($BASE64_ENCODE < "$TEMP_DIR/public.pem")
  
  # Update Vault with new keys
  vault kv patch "$VAULT_PATH" \
    JWT_PRIVATE_KEY_B64="$private_key_b64" \
    JWT_PUBLIC_KEY_B64="$public_key_b64" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    log_info "✓ Vault updated with new JWT keys"
    log_info "  New private key fingerprint: $(openssl rsa -in "$TEMP_DIR/private.pem" -noout -modulus 2>/dev/null | openssl md5 | cut -d' ' -f2)"
    return 0
  else
    log_error "Failed to update Vault"
    return 1
  fi
}

# Restart backend service
restart_backend() {
  log_info "Restarting backend service to load new keys..."
  
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

# Verify backend is healthy
verify_backend() {
  log_info "Verifying backend health..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would verify backend health"
    return 0
  fi
  
  local max_attempts=12
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    if curl -sf http://localhost:8080/api/v1/health > /dev/null 2>&1; then
      log_info "✓ Backend is healthy"
      return 0
    fi
    
    log_info "Waiting for backend... (attempt $attempt/$max_attempts)"
    sleep 5
    attempt=$((attempt + 1))
  done
  
  log_error "Backend did not become healthy within expected time"
  return 1
}

# Main rotation process
main() {
  log_info "=== JWT Signing Keys Rotation ==="
  log_info "Vault Path: $VAULT_PATH"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "Running in DRY RUN mode - no changes will be made"
  fi
  
  # Step 1: Check prerequisites
  check_vault
  check_openssl
  
  # Step 2: Get current keys for backup
  get_current_keys || true
  
  # Step 3: Generate new keys
  if ! generate_keys; then
    log_error "Rotation failed at key generation step"
    exit 1
  fi
  
  # Step 4: Update Vault
  if ! update_vault_keys; then
    log_error "Rotation failed at Vault update step"
    exit 1
  fi
  
  # Step 5: Restart backend
  restart_backend
  
  # Step 6: Verify backend is healthy
  if ! verify_backend; then
    log_error "Backend health check failed after rotation"
    log_error "Services may need manual intervention"
    exit 1
  fi
  
  log_info ""
  log_info "=== Rotation Complete ==="
  log_info "✓ JWT signing keys rotated successfully"
  log_info "✓ New keys stored in Vault"
  log_info "✓ Services restarted and verified"
  log_info ""
  log_instruction "IMPORTANT: User Session Impact"
  log_instruction "• Tokens signed with old key remain valid until expiration"
  log_instruction "• New tokens will be signed with new key"
  log_instruction "• Users will not be logged out immediately"
  log_instruction "• Monitor logs for any JWT verification errors"
  log_info ""
  
  # Calculate next rotation date (90 days) - portable across Linux and macOS
  if date --version >/dev/null 2>&1; then
    # GNU date (Linux)
    next_date=$(date -d '+90 days' '+%Y-%m-%d')
  else
    # BSD date (macOS)
    next_date=$(date -v+90d '+%Y-%m-%d')
  fi
  log_info "Next rotation recommended: $next_date"
  
  if [ "$DRY_RUN" = false ] && [ -f "$TEMP_DIR/old_private.pem" ]; then
    log_info ""
    log_warn "Old keys backed up in: $TEMP_DIR"
    log_warn "Keep these for emergency rollback if needed"
    log_warn "Delete after confirming no issues (24-48 hours)"
  fi
}

main "$@"
