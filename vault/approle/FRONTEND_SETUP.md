# Frontend AppRole Setup

This directory contains the AppRole credentials for the frontend Vault agent.

## Files (DO NOT COMMIT)

- `frontend_role_id` - AppRole Role ID for frontend
- `frontend_secret_id` - AppRole Secret ID for frontend (rotate regularly)

## Setup Instructions

### 1. Create AppRole in Vault

```bash
# Enable AppRole auth method (if not already enabled)
vault auth enable approle

# Create frontend policy
vault policy write clipper-frontend /path/to/vault/policies/clipper-frontend.hcl

# Create AppRole for frontend
vault write auth/approle/role/clipper-frontend \
  token_ttl=1h \
  token_max_ttl=4h \
  policies="clipper-frontend"

# Get Role ID
vault read auth/approle/role/clipper-frontend/role-id \
  -format=json | jq -r '.data.role_id' > vault/approle/frontend_role_id

# Generate Secret ID
vault write -f auth/approle/role/clipper-frontend/secret-id \
  -format=json | jq -r '.data.secret_id' > vault/approle/frontend_secret_id
```

### 2. Store Secrets in Vault

```bash
# Store frontend public configuration
vault kv put kv/clipper/frontend \
  VITE_API_BASE_URL="https://clpr.tv/api/v1" \
  VITE_BASE_URL="https://clpr.tv" \
  VITE_TWITCH_CLIENT_ID="your_twitch_client_id" \
  VITE_ENABLE_ANALYTICS="false" \
  VITE_ENABLE_DEBUG="false" \
  VITE_STRIPE_PUBLISHABLE_KEY="pk_live_xxx" \
  VITE_STRIPE_PRO_MONTHLY_PRICE_ID="price_xxx" \
  VITE_STRIPE_PRO_YEARLY_PRICE_ID="price_xxx" \
  VITE_SENTRY_ENABLED="false" \
  VITE_SENTRY_DSN="" \
  VITE_SENTRY_ENVIRONMENT="production" \
  VITE_SENTRY_RELEASE="v1.0.0" \
  VITE_SENTRY_TRACES_SAMPLE_RATE="0.1"
```

### 3. Verify Setup

```bash
# Test authentication
VAULT_ADDR=https://vault.subcult.tv \
vault write auth/approle/login \
  role_id=$(cat vault/approle/frontend_role_id) \
  secret_id=$(cat vault/approle/frontend_secret_id)

# Test secret access
vault kv get kv/clipper/frontend
```

### Security Notes

- **Secret ID Rotation**: Rotate Secret IDs every 90 days
- **Access Control**: Ensure files have restricted permissions (0600)
- **Monitoring**: Monitor AppRole usage in Vault audit logs
- **Separation**: Frontend AppRole has different credentials than backend
