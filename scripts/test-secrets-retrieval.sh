#!/usr/bin/env bash
#
# Test Secrets Retrieval Script
# Validates that secrets can be retrieved from Vault in all environments
#
# Usage: ./test-secrets-retrieval.sh [--environment production|staging|development]
#

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://vault.subcult.tv}"
VAULT_PATH="${VAULT_PATH:-kv/clipper/backend}"
ENVIRONMENT="${1:-production}"

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

log_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

log_fail() {
  echo -e "${RED}[✗]${NC} $1"
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test a secret field
test_secret() {
  local field="$1"
  local description="$2"
  local optional="${3:-false}"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  local value=$(vault kv get -field="$field" "$VAULT_PATH" 2>/dev/null || echo "")
  
  if [ -n "$value" ]; then
    log_success "$description: Present"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
  else
    if [ "$optional" = "true" ]; then
      log_warn "$description: Not set (optional)"
      PASSED_TESTS=$((PASSED_TESTS + 1))
      return 0
    else
      log_fail "$description: Missing"
      FAILED_TESTS=$((FAILED_TESTS + 1))
      return 1
    fi
  fi
}

# Check Vault connectivity
check_vault() {
  log_info "Testing Vault connectivity..."
  
  if ! vault status > /dev/null 2>&1; then
    log_error "Cannot connect to Vault at $VAULT_ADDR"
    log_error "Please ensure VAULT_ADDR is set and you are authenticated"
    exit 1
  fi
  
  log_success "Vault is accessible at $VAULT_ADDR"
  echo ""
}

# Test critical secrets
test_critical_secrets() {
  log_info "=== Testing Critical Secrets ==="
  echo ""
  
  # Database credentials
  log_info "Database Credentials:"
  test_secret "DB_PASSWORD" "  PostgreSQL password"
  test_secret "DB_USER" "  PostgreSQL user"
  test_secret "DB_HOST" "  PostgreSQL host"
  test_secret "DB_PORT" "  PostgreSQL port"
  test_secret "DB_NAME" "  PostgreSQL database"
  echo ""
  
  # Redis credentials
  log_info "Redis Configuration:"
  test_secret "REDIS_HOST" "  Redis host"
  test_secret "REDIS_PORT" "  Redis port"
  test_secret "REDIS_PASSWORD" "  Redis password" "true"
  echo ""
  
  # JWT keys
  log_info "JWT Keys:"
  test_secret "JWT_PRIVATE_KEY_B64" "  JWT private key"
  test_secret "JWT_PUBLIC_KEY_B64" "  JWT public key"
  echo ""
  
  # Stripe
  log_info "Stripe Credentials:"
  test_secret "STRIPE_SECRET_KEY" "  Stripe secret key"
  test_secret "STRIPE_WEBHOOK_SECRET" "  Stripe webhook secret"
  echo ""
}

# Test high priority secrets
test_high_priority_secrets() {
  log_info "=== Testing High Priority Secrets ==="
  echo ""
  
  # Twitch
  log_info "Twitch OAuth:"
  test_secret "TWITCH_CLIENT_ID" "  Twitch client ID"
  test_secret "TWITCH_CLIENT_SECRET" "  Twitch client secret"
  echo ""
  
  # OpenAI
  log_info "OpenAI Configuration:"
  test_secret "OPENAI_API_KEY" "  OpenAI API key" "true"
  test_secret "EMBEDDING_ENABLED" "  Embeddings enabled" "true"
  echo ""
  
  # MFA Encryption
  log_info "Security Keys:"
  test_secret "MFA_ENCRYPTION_KEY" "  MFA encryption key"
  echo ""
}

# Test medium priority secrets
test_medium_priority_secrets() {
  log_info "=== Testing Medium Priority Secrets ==="
  echo ""
  
  # Sentry
  log_info "Sentry Configuration:"
  test_secret "SENTRY_DSN" "  Sentry DSN" "true"
  test_secret "SENTRY_ENABLED" "  Sentry enabled" "true"
  echo ""
  
  # SendGrid
  log_info "Email Configuration:"
  test_secret "SENDGRID_API_KEY" "  SendGrid API key" "true"
  test_secret "EMAIL_ENABLED" "  Email enabled" "true"
  echo ""
  
  # OpenSearch
  log_info "OpenSearch Configuration:"
  test_secret "OPENSEARCH_URL" "  OpenSearch URL" "true"
  test_secret "OPENSEARCH_USERNAME" "  OpenSearch username" "true"
  test_secret "OPENSEARCH_PASSWORD" "  OpenSearch password" "true"
  echo ""
}

# Test environment-specific configuration
test_environment_config() {
  log_info "=== Testing Environment Configuration ==="
  echo ""
  
  log_info "Server Configuration:"
  test_secret "ENVIRONMENT" "  Environment name"
  test_secret "BASE_URL" "  Base URL"
  test_secret "PORT" "  Server port"
  test_secret "GIN_MODE" "  Gin mode"
  echo ""
  
  log_info "CORS Configuration:"
  test_secret "CORS_ALLOWED_ORIGINS" "  Allowed origins"
  echo ""
}

# Test secret retrieval via vault-agent
test_vault_agent() {
  log_info "=== Testing Vault Agent Integration ==="
  echo ""
  
  local rendered_file="./vault/rendered/backend.env"
  
  if [ -f "$rendered_file" ]; then
    log_success "Rendered secrets file exists: $rendered_file"
    
    # Check file permissions
    local perms=$(stat -c "%a" "$rendered_file" 2>/dev/null || stat -f "%p" "$rendered_file" 2>/dev/null | cut -c 4-6)
    if [ "$perms" = "640" ] || [ "$perms" = "600" ]; then
      log_success "File permissions are secure: $perms"
    else
      log_warn "File permissions: $perms (recommend 640 or 600)"
    fi
    
    # Check if file is not empty
    if [ -s "$rendered_file" ]; then
      log_success "Rendered file has content"
      local line_count=$(wc -l < "$rendered_file")
      log_info "  Contains $line_count lines"
    else
      log_fail "Rendered file is empty"
      FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
  else
    log_warn "Rendered secrets file not found (may not be using vault-agent)"
    log_info "  File expected at: $rendered_file"
  fi
  echo ""
}

# Print summary
print_summary() {
  echo ""
  echo "========================================"
  echo "Test Summary"
  echo "========================================"
  echo "Environment: $ENVIRONMENT"
  echo "Vault Path: $VAULT_PATH"
  echo "Total Tests: $TOTAL_TESTS"
  echo "Passed: $PASSED_TESTS"
  echo "Failed: $FAILED_TESTS"
  echo "========================================"
  
  if [ $FAILED_TESTS -eq 0 ]; then
    log_success "All critical secrets are properly configured!"
    echo ""
    log_info "Next steps:"
    log_info "  1. Test secret retrieval in application"
    log_info "  2. Verify services start successfully"
    log_info "  3. Test application functionality"
    echo ""
    return 0
  else
    log_error "$FAILED_TESTS test(s) failed"
    echo ""
    log_error "Action required:"
    log_error "  1. Review missing secrets listed above"
    log_error "  2. Add missing secrets to Vault using:"
    log_error "     vault kv patch $VAULT_PATH KEY=value"
    log_error "  3. Re-run this test script"
    echo ""
    return 1
  fi
}

# Main
main() {
  echo ""
  log_info "=== Vault Secrets Retrieval Test ==="
  log_info "Environment: $ENVIRONMENT"
  log_info "Vault Address: $VAULT_ADDR"
  log_info "Vault Path: $VAULT_PATH"
  echo ""
  
  check_vault
  test_critical_secrets
  test_high_priority_secrets
  test_medium_priority_secrets
  test_environment_config
  test_vault_agent
  
  print_summary
}

main "$@"
