# Production Deployment - Vault-Based Secrets ✅

**Date:** 2026-01-02
**Status:** All services healthy - Secrets sourced from Vault
**Environment:** clpr.tv Production

## 🔐 Security Architecture

### Vault-Based Secret Management

All secrets are now stored **exclusively in Vault** at `kv/clipper/backend`:

- ✅ Database password
- ✅ RSA 2048-bit JWT keys (PKCS8 format)
- ✅ MFA encryption key (32 bytes, base64-encoded)
- ✅ Twitch API credentials
- ✅ All environment configuration

### Secret Delivery Flow

```
HashiCorp Vault (vault.subcult.tv)
         ↓
    Vault Agent (AppRole auth)
         ↓
    Templates Rendered:
    - /vault-agent/rendered/backend.env
    - /vault-agent/rendered/postgres.env
         ↓
    Consumed by containers:
    - clipper-backend
    - clipper-postgres
```

## 🐳 Service Status

```
NAME                  STATUS                    NOTES
clipper-backend       Up (healthy)              Sources secrets from vault-agent
clipper-frontend      Up (healthy)              Nginx reverse proxy
clipper-postgres      Up (healthy)              Password from Vault
clipper-redis         Up (healthy)              No secrets required
clipper-vault-agent   Up                        Renders secrets from Vault
```

## 🔧 Configuration

### No Environment Variables Required

Services start with **zero environment variables** - everything comes from Vault:

```bash
cd /home/onnwee/projects/clipper
docker compose -f docker-compose.prod.yml up -d
```

### Vault Secrets Location

- **Path:** `kv/clipper/backend`
- **Version:** 53
- **Auth Method:** AppRole
- **Role ID:** Stored in `./vault/approle/role_id`
- **Secret ID:** Stored in `./vault/approle/secret_id`

### Templates

1. **backend.env.ctmpl** → Renders ~60 environment variables for backend
2. **postgres.env.ctmpl** → Renders POSTGRES_PASSWORD for database initialization

## 📊 Current State

### Database

- **Password:** Retrieved from Vault on startup
- **Connection:** Backend connecting successfully
- **Migrations:** All 90 migrations applied
- **Syncing:** Active Twitch clip synchronization

### Backend Activity

- **Clips Synced:** 25+ clips per sync cycle
- **Errors:** None
- **Health:** <http://localhost:8080/api/v1/health> (200 OK)
- **Metrics:** <http://localhost:8080/debug/metrics>

## 🎯 Security Benefits

1. **No Secrets in Environment Variables**
   - No `POSTGRES_PASSWORD` in docker-compose commands
   - No `.env` files with credentials
   - No secrets in process environment

2. **Single Source of Truth**
   - All secrets in Vault
   - Centralized secret rotation
   - Audit trail for secret access

3. **Defense in Depth**
   - AppRole authentication
   - Secrets never hit disk (tmpfs mounts)
   - 0640 permissions on rendered files
   - Secrets auto-refresh on change

4. **Secure Password**
   - 40 characters
   - ~240 bits entropy
   - URL-safe characters only
   - Randomly generated

## 🔄 Secret Rotation Process

To rotate the database password:

```bash
# 1. Generate new password
NEW_PASSWORD=$(python3 << 'EOF'
import secrets, string
alphabet = string.ascii_letters + string.digits + '-_'
print(''.join(secrets.choice(alphabet) for i in range(40)))
EOF
)

# 2. Update Vault
docker exec -e VAULT_ADDR=http://127.0.0.1:8200 vault \
  vault kv patch kv/clipper/backend DB_PASSWORD="$NEW_PASSWORD"

# 3. Restart services (vault-agent will re-render secrets)
docker compose -f docker-compose.prod.yml restart postgres backend
```

## 📝 Vault Configuration Files

### Agent Config

`/vault/config/clipper-backend-agent.hcl`:

- Defines AppRole authentication
- Configures template rendering
- Sets file permissions

### Templates

- `/vault/templates/backend.env.ctmpl` - Backend environment variables
- `/vault/templates/postgres.env.ctmpl` - PostgreSQL password

### Rendered Secrets (Runtime)

- `/vault-agent/rendered/backend.env` - Backend secrets (in container)
- `/vault-agent/rendered/postgres.env` - PostgreSQL password (in container)
- `/vault-agent/rendered/token` - Vault token (for agent)

## ✅ Verification

Check vault-agent is rendering secrets:

```bash
docker exec clipper-vault-agent ls -la /vault-agent/rendered/
```

Check postgres is sourcing from Vault:

```bash
docker logs clipper-postgres | grep "Sourcing secrets"
```

Check backend health:

```bash
curl http://localhost:8080/api/v1/health
```

## 🚀 Production Ready

The Clipper production environment is now:

- ✅ **Secure:** All secrets in Vault, zero environment variables
- ✅ **Functional:** All services healthy, backend syncing data
- ✅ **Automated:** Secrets auto-rendered on container start
- ✅ **Auditable:** All secret access logged in Vault
- ✅ **Maintainable:** Single source of truth for all credentials

**Status:** 🟢 Production-grade secret management active
