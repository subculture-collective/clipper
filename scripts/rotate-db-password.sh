#!/usr/bin/env bash
#
# Database Password Rotation Script
# This script rotates the PostgreSQL database password in Vault
# and updates the running application without downtime.
#
# Usage: ./rotate-db-password.sh [--dry-run]
#

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.subcult.tv}"
VAULT_PATH="${VAULT_PATH:-kv/clipper/backend}"
DB_USER="${DB_USER:-clipper}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-clipper_db}"
DRY_RUN=false

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

# Generate a secure random password
generate_password() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Get current password from Vault
get_current_password() {
  vault kv get -field=DB_PASSWORD "$VAULT_PATH" 2>/dev/null || echo ""
}

# Update password in PostgreSQL
update_database_password() {
  local new_password="$1"
  log_info "Updating PostgreSQL password..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would execute: ALTER USER $DB_USER WITH PASSWORD '***';"
    return 0
  fi
  
  # Use POSTGRES_PASSWORD env var if available, otherwise current DB_PASSWORD
  local admin_password="${POSTGRES_PASSWORD:-$(get_current_password)}"
  
  # Escape single quotes in the password for SQL safety
  local escaped_password="${new_password//\'/\'\'}"
  
  PGPASSWORD="$admin_password" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "ALTER USER $DB_USER WITH PASSWORD '$escaped_password';" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    log_info "✓ Database password updated successfully"
    return 0
  else
    log_error "Failed to update database password"
    return 1
  fi
}

# Update password in Vault
update_vault_password() {
  local new_password="$1"
  log_info "Updating password in Vault..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would execute: vault kv patch $VAULT_PATH DB_PASSWORD='***'"
    return 0
  fi
  
  vault kv patch "$VAULT_PATH" DB_PASSWORD="$new_password" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    log_info "✓ Vault updated successfully"
    return 0
  else
    log_error "Failed to update Vault"
    return 1
  fi
}

# Restart backend service to pick up new password
restart_backend() {
  log_info "Restarting backend service..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would execute: docker compose restart vault-agent backend"
    return 0
  fi
  
  # Restart vault-agent first to fetch new secrets, then backend
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

# Verify new password works
verify_connection() {
  local new_password="$1"
  log_info "Verifying database connection with new password..."
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "DRY RUN: Would verify connection"
    return 0
  fi
  
  sleep 10 # Wait for services to stabilize
  
  PGPASSWORD="$new_password" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    log_info "✓ Connection verified with new password"
    return 0
  else
    log_error "Failed to verify connection with new password"
    return 1
  fi
}

# Main rotation process
main() {
  log_info "=== Database Password Rotation ==="
  log_info "Database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
  log_info "Vault Path: $VAULT_PATH"
  
  if [ "$DRY_RUN" = true ]; then
    log_warn "Running in DRY RUN mode - no changes will be made"
  fi
  
  # Step 1: Check prerequisites
  check_vault
  
  # Step 2: Generate new password
  log_info "Generating new password..."
  NEW_PASSWORD=$(generate_password)
  log_info "✓ New password generated"
  
  # Step 3: Get current password for fallback
  CURRENT_PASSWORD=$(get_current_password)
  if [ -z "$CURRENT_PASSWORD" ]; then
    log_warn "Could not retrieve current password from Vault"
  fi
  
  # Step 4: Update database password
  if ! update_database_password "$NEW_PASSWORD"; then
    log_error "Rotation failed at database update step"
    exit 1
  fi
  
  # Step 5: Update Vault
  if ! update_vault_password "$NEW_PASSWORD"; then
    log_error "Rotation failed at Vault update step"
    # Rollback database password if we have the old one
    if [ -n "$CURRENT_PASSWORD" ] && [ "$DRY_RUN" = false ]; then
      log_warn "Attempting to rollback database password..."
      update_database_password "$CURRENT_PASSWORD"
    fi
    exit 1
  fi
  
  # Step 6: Restart services
  restart_backend
  
  # Step 7: Verify new password works
  if ! verify_connection "$NEW_PASSWORD"; then
    log_error "Verification failed after rotation"
    log_error "Services may need manual intervention"
    exit 1
  fi
  
  log_info ""
  log_info "=== Rotation Complete ==="
  log_info "✓ Database password rotated successfully"
  log_info "✓ New password stored in Vault"
  log_info "✓ Services restarted and verified"
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
}

main "$@"
