<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Credential Rotation Runbook](#credential-rotation-runbook)
  - [Overview](#overview)
  - [Rotation Schedule](#rotation-schedule)
  - [Prerequisites](#prerequisites)
  - [Automated Rotation Scripts](#automated-rotation-scripts)
  - [Rotation Procedures](#rotation-procedures)
    - [1. Database Password Rotation](#1-database-password-rotation)
    - [2. JWT Signing Keys Rotation](#2-jwt-signing-keys-rotation)
    - [3. Stripe API Keys Rotation](#3-stripe-api-keys-rotation)
    - [4. Twitch OAuth Credentials Rotation](#4-twitch-oauth-credentials-rotation)
    - [5. OpenAI API Key Rotation](#5-openai-api-key-rotation)
    - [6. Redis Password Rotation](#6-redis-password-rotation)
    - [7. Vault AppRole Credentials Rotation](#7-vault-approle-credentials-rotation)
  - [Monitoring and Verification](#monitoring-and-verification)
  - [Troubleshooting](#troubleshooting)
  - [Rollback Procedures](#rollback-procedures)
  - [Audit and Compliance](#audit-and-compliance)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Credential Rotation Runbook"
summary: "Comprehensive guide for rotating all credentials and secrets"
tags: ['operations', 'security']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-15
---

# Credential Rotation Runbook

## Overview

This runbook provides step-by-step procedures for rotating all credentials and secrets in the Clipper application. Regular credential rotation is a critical security practice that reduces the impact of potential credential compromise.

## Rotation Schedule

| Credential Type | Frequency | Last Rotated | Next Rotation | Priority |
|----------------|-----------|--------------|---------------|----------|
| Database Password | 90 days | - | - | Critical |
| JWT Signing Keys | 90 days | - | - | Critical |
| Stripe API Keys | 180 days | - | - | Critical |
| Twitch OAuth | 90 days | - | - | High |
| OpenAI API Key | 180 days | - | - | High |
| Redis Password | 90 days | - | - | Medium |
| Vault AppRole | 30 days | - | - | High |
| MFA Encryption Key | 365 days | - | - | Critical |

**Note:** Update the "Last Rotated" and "Next Rotation" columns after each rotation.

## Prerequisites

Before starting any rotation:

1. **Ensure you have access to:**
   - Vault access (authenticated)
   - Production server SSH access
   - Third-party service admin panels (Stripe, Twitch, OpenAI)
   - Incident communication channels

2. **Verify backups are recent:**
   ```bash
   # Check database backup
   ./scripts/backup.sh --check
   
   # Check Vault backup
   vault operator raft snapshot save /backup/vault-$(date +%Y%m%d).snap
   ```

3. **Notify team:**
   - Send notification in team channel
   - Check if any deployments are in progress
   - Verify no critical incidents are ongoing

4. **Set up monitoring:**
   ```bash
   # Open logs in separate terminal
   docker compose logs -f backend vault-agent
   ```

## Automated Rotation Scripts

We provide automated scripts for most rotation tasks:

- `/scripts/rotate-db-password.sh` - Database password rotation
- `/scripts/rotate-jwt-keys.sh` - JWT signing keys rotation
- `/scripts/rotate-api-keys.sh` - API keys rotation (Stripe, Twitch, OpenAI)
- `/scripts/test-secrets-retrieval.sh` - Validate secret retrieval

All scripts support `--dry-run` flag for testing without making changes.

## Rotation Procedures

### 1. Database Password Rotation

**Impact:** Brief service restart (~10 seconds downtime)  
**Frequency:** Every 90 days  
**Prerequisites:** Database access

**Steps:**

1. **Test the rotation script:**
   ```bash
   cd /opt/clipper
   ./scripts/rotate-db-password.sh --dry-run
   ```

2. **Perform rotation:**
   ```bash
   # Set environment variables
   export VAULT_ADDR=https://vault.subcult.tv
   export DB_HOST=postgres
   export DB_USER=clipper
   
   # Run rotation
   ./scripts/rotate-db-password.sh
   ```

3. **Verify:**
   ```bash
   # Check backend logs
   docker compose logs backend --tail=50
   
   # Test database connection
   docker exec -it clipper-postgres psql -U clipper -d clipper_db -c "SELECT 1;"
   
   # Test API endpoint
   curl http://localhost:8080/api/v1/health
   ```

4. **Document:**
   ```bash
   # Update rotation schedule
   echo "Database password rotated: $(date)" >> /opt/clipper/rotation-log.txt
   ```

**Expected Duration:** 5-10 minutes

### 2. JWT Signing Keys Rotation

**Impact:** Users will need to re-login as tokens expire (gradual over 24h)  
**Frequency:** Every 90 days  
**Prerequisites:** None

**Steps:**

1. **Notify users (Optional but recommended):**
   ```
   "We will be rotating security keys in the next 24 hours. 
   You may need to log in again. This is a routine security procedure."
   ```

2. **Run rotation script:**
   ```bash
   cd /opt/clipper
   ./scripts/rotate-jwt-keys.sh
   ```

3. **Verify:**
   ```bash
   # Test authentication flow
   curl -X GET http://localhost:8080/api/v1/auth/twitch
   
   # Check logs for JWT errors
   docker compose logs backend | grep -i "jwt\|token" | tail -20
   ```

4. **Monitor:**
   - Watch for increased authentication errors
   - Monitor user login patterns
   - Check Sentry for JWT-related issues

**Expected Duration:** 10-15 minutes

**Rollback:** Keep old keys backed up for 48 hours in case of issues

### 3. Stripe API Keys Rotation

**Impact:** None (if done correctly)  
**Frequency:** Every 180 days  
**Prerequisites:** Stripe Dashboard admin access

**Steps:**

1. **Generate new secret key:**
   - Go to https://dashboard.stripe.com/apikeys
   - Click "Create secret key" or "Roll secret key"
   - Name: `clipper-production-YYYYMMDD`
   - Copy the new key

2. **Update Vault:**
   ```bash
   cd /opt/clipper
   ./scripts/rotate-api-keys.sh --service stripe
   # Follow the interactive prompts
   ```

3. **Rotate webhook secrets:**
   - Go to https://dashboard.stripe.com/webhooks
   - Click on your webhook endpoint
   - Click "Roll secret"
   - Update Vault:
   ```bash
   vault kv patch kv/clipper/backend STRIPE_WEBHOOK_SECRET='whsec_xxx'
   docker compose restart vault-agent backend
   ```

4. **Verify:**
   ```bash
   # Test payment flow (in staging first if possible)
   curl -X POST http://localhost:8080/api/v1/subscription/checkout \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"tier": "pro_monthly"}'
   
   # Check Stripe dashboard for test event
   # Verify webhook is receiving events
   ```

5. **Delete old key:**
   - Wait 24-48 hours to ensure new key is working
   - Go back to Stripe Dashboard
   - Delete the old API key

**Expected Duration:** 15-20 minutes

### 4. Twitch OAuth Credentials Rotation

**Impact:** None for existing users (tokens remain valid)  
**Frequency:** Every 90 days  
**Prerequisites:** Twitch Developer Console access

**Steps:**

1. **Generate new credentials:**
   - Go to https://dev.twitch.tv/console/apps
   - Select "Clipper" application
   - Click "Manage" → "New Secret"
   - Copy the new Client ID and Client Secret

2. **Update Vault:**
   ```bash
   cd /opt/clipper
   ./scripts/rotate-api-keys.sh --service twitch
   # Enter new Client ID and Secret when prompted
   ```

3. **Verify:**
   ```bash
   # Test OAuth flow
   curl -X GET http://localhost:8080/api/v1/auth/twitch
   
   # Click the login link and complete OAuth
   # Verify successful authentication
   
   # Check backend logs
   docker compose logs backend | grep -i twitch | tail -20
   ```

4. **Document:**
   ```bash
   echo "Twitch OAuth rotated: $(date)" >> /opt/clipper/rotation-log.txt
   ```

**Expected Duration:** 10-15 minutes

**Note:** Existing user sessions remain valid. New logins will use new credentials.

### 5. OpenAI API Key Rotation

**Impact:** Brief service restart (~5 seconds)  
**Frequency:** Every 180 days  
**Prerequisites:** OpenAI Platform access

**Steps:**

1. **Generate new key:**
   - Go to https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name: `clipper-production-YYYYMMDD`
   - Copy the key (only shown once!)

2. **Update Vault:**
   ```bash
   cd /opt/clipper
   ./scripts/rotate-api-keys.sh --service openai
   # Paste the new key when prompted
   ```

3. **Verify:**
   ```bash
   # Test embedding generation
   curl -X POST http://localhost:8080/api/v1/admin/embeddings/generate \
     -H "Authorization: Bearer <admin-token>"
   
   # Check logs for OpenAI API calls
   docker compose logs backend | grep -i "openai\|embedding" | tail -20
   ```

4. **Delete old key:**
   - Wait 24 hours
   - Go back to OpenAI Platform
   - Find and delete the old key

**Expected Duration:** 10 minutes

### 6. Redis Password Rotation

**Impact:** Brief service restart (~10 seconds)  
**Frequency:** Every 90 days  
**Prerequisites:** Redis access

**Steps:**

1. **Generate new password:**
   ```bash
   NEW_PASSWORD=$(openssl rand -base64 32)
   echo "New Redis password: $NEW_PASSWORD"
   ```

2. **Update Redis configuration:**
   ```bash
   # Update docker-compose.yml or redis.conf
   # Add: requirepass <new-password>
   
   docker compose up -d redis
   ```

3. **Update Vault:**
   ```bash
   vault kv patch kv/clipper/backend REDIS_PASSWORD="$NEW_PASSWORD"
   ```

4. **Restart services:**
   ```bash
   docker compose restart vault-agent
   sleep 5
   docker compose restart backend
   ```

5. **Verify:**
   ```bash
   # Test Redis connection
   docker exec -it clipper-redis redis-cli -a "$NEW_PASSWORD" PING
   
   # Check backend can connect
   curl http://localhost:8080/api/v1/health
   ```

**Expected Duration:** 10-15 minutes

### 7. Vault AppRole Credentials Rotation

**Impact:** Brief vault-agent restart (~5 seconds)  
**Frequency:** Every 30 days  
**Prerequisites:** Vault root or admin access

**Steps:**

1. **Generate new secret_id:**
   ```bash
   vault write -field=secret_id -f \
     auth/approle/role/clipper-backend/secret-id > vault/approle/secret_id
   ```

2. **Restart vault-agent:**
   ```bash
   docker compose restart vault-agent
   ```

3. **Verify:**
   ```bash
   # Check vault-agent logs
   docker compose logs vault-agent --tail=20
   
   # Verify backend.env is rendered
   ls -lh vault/rendered/backend.env
   
   # Test backend
   curl http://localhost:8080/api/v1/health
   ```

**Expected Duration:** 5 minutes

**Note:** role_id rarely needs rotation. Only rotate secret_id regularly.

## Monitoring and Verification

After any rotation, monitor the following:

1. **Application Health:**
   ```bash
   # Health endpoint
   watch -n 5 curl -s http://localhost:8080/api/v1/health
   
   # Application logs
   docker compose logs -f backend | grep -i "error\|warning"
   ```

2. **Authentication Flow:**
   ```bash
   # Test login
   curl -X GET http://localhost:8080/api/v1/auth/twitch
   
   # Test protected endpoint
   curl -H "Authorization: Bearer <token>" \
     http://localhost:8080/api/v1/user/profile
   ```

3. **Third-Party Integrations:**
   - Check Stripe dashboard for events
   - Test Twitch authentication
   - Verify OpenAI embeddings (if enabled)

4. **Error Rates:**
   - Check Sentry for increased errors
   - Monitor logs for authentication failures
   - Review Prometheus metrics

## Troubleshooting

### Backend Won't Start After Rotation

```bash
# Check vault-agent logs
docker compose logs vault-agent

# Verify secret was updated in Vault
vault kv get kv/clipper/backend

# Manually test secret retrieval
./scripts/test-secrets-retrieval.sh

# If needed, restart vault-agent
docker compose restart vault-agent
sleep 10
docker compose restart backend
```

### Users Cannot Authenticate

```bash
# Check if JWT keys are valid
vault kv get -field=JWT_PRIVATE_KEY_B64 kv/clipper/backend | base64 -d > /tmp/test-key.pem
openssl rsa -in /tmp/test-key.pem -check

# Check backend logs for JWT errors
docker compose logs backend | grep -i jwt

# Verify Twitch credentials
vault kv get -field=TWITCH_CLIENT_ID kv/clipper/backend
```

### Third-Party Service Errors

```bash
# Test Stripe key
curl https://api.stripe.com/v1/customers \
  -u $(vault kv get -field=STRIPE_SECRET_KEY kv/clipper/backend):

# Test OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $(vault kv get -field=OPENAI_API_KEY kv/clipper/backend)"
```

## Rollback Procedures

If rotation causes issues:

1. **Get old credential from backup:**
   ```bash
   # If you backed up before rotation
   vault kv get -version=2 kv/clipper/backend
   ```

2. **Update Vault with old credential:**
   ```bash
   vault kv patch kv/clipper/backend FIELD_NAME="old-value"
   ```

3. **Restart services:**
   ```bash
   docker compose restart vault-agent
   sleep 5
   docker compose restart backend
   ```

4. **Verify system is stable:**
   ```bash
   ./scripts/test-secrets-retrieval.sh
   curl http://localhost:8080/api/v1/health
   ```

5. **Document the rollback:**
   - Create incident ticket
   - Document what went wrong
   - Plan corrective actions

## Audit and Compliance

After each rotation:

1. **Update rotation log:**
   ```bash
   cat >> /opt/clipper/rotation-log.txt << EOF
   $(date +%Y-%m-%d) - <CREDENTIAL_TYPE> - Rotated by <YOUR_NAME>
   EOF
   ```

2. **Update rotation schedule table** at the top of this document

3. **Export Vault audit logs:**
   ```bash
   # If Vault audit logging is enabled
   vault audit list
   vault read sys/audit/file
   ```

4. **Notify security team** (for compliance):
   - Email: security@clipper.gg
   - Include: What was rotated, when, by whom
   - Attach: Rotation logs and verification results

5. **Update documentation:**
   - Update any runbooks that reference old credentials
   - Update disaster recovery procedures
   - Update team password manager

---

**Best Practices:**
- Always test in staging first when possible
- Rotate during low-traffic periods
- Keep old credentials for 24-48 hours before deletion
- Document everything
- Monitor for 24 hours after rotation
