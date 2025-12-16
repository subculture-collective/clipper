<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Break-Glass Emergency Procedures](#break-glass-emergency-procedures)
  - [Overview](#overview)
  - [When to Use Break-Glass Procedures](#when-to-use-break-glass-procedures)
  - [Emergency Access Scenarios](#emergency-access-scenarios)
    - [Scenario 1: Vault is Unavailable](#scenario-1-vault-is-unavailable)
    - [Scenario 2: Lost Vault Access Credentials](#scenario-2-lost-vault-access-credentials)
    - [Scenario 3: Suspected Credential Compromise](#scenario-3-suspected-credential-compromise)
    - [Scenario 4: Backend Cannot Start Due to Secret Issues](#scenario-4-backend-cannot-start-due-to-secret-issues)
  - [Break-Glass Access Methods](#break-glass-access-methods)
    - [Method 1: Emergency Environment Variables](#method-1-emergency-environment-variables)
    - [Method 2: Vault Unseal Process](#method-2-vault-unseal-process)
    - [Method 3: Direct Database Access](#method-3-direct-database-access)
  - [Emergency Rotation Procedures](#emergency-rotation-procedures)
    - [Immediate Rotation Steps](#immediate-rotation-steps)
    - [Post-Compromise Actions](#post-compromise-actions)
  - [Emergency Contacts](#emergency-contacts)
  - [Post-Incident Requirements](#post-incident-requirements)
  - [Recovery Validation](#recovery-validation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Break-Glass Emergency Procedures"
summary: "Emergency procedures for accessing secrets when normal methods fail"
tags: ['operations', 'security']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-15
---

# Break-Glass Emergency Procedures

## Overview

This document outlines emergency "break-glass" procedures for accessing critical secrets when normal access methods are unavailable. These procedures should only be used in genuine emergencies and all usage must be documented and audited.

**⚠️ WARNING:** Break-glass procedures bypass normal security controls. Use only when absolutely necessary.

## When to Use Break-Glass Procedures

Break-glass procedures should ONLY be used when:

1. **Vault is completely unavailable** and cannot be restored quickly
2. **Production service is down** and requires immediate secret access
3. **Normal secret access is compromised** and emergency rotation is needed
4. **Critical security incident** requiring immediate credential changes
5. **Disaster recovery** scenario requiring rapid system restoration

## Emergency Access Scenarios

### Scenario 1: Vault is Unavailable

**Symptoms:**
- Vault service is unreachable
- Vault-agent cannot authenticate
- Backend cannot retrieve secrets

**Immediate Actions:**

1. **Check Vault Status:**
   ```bash
   curl -k https://vault.subcult.tv/v1/sys/health
   vault status
   ```

2. **Attempt Vault Restart:**
   ```bash
   # Via docker
   docker compose restart vault
   
   # Via systemd
   sudo systemctl restart vault
   ```

3. **If Vault Remains Down - Use Emergency Secrets:**
   
   Create temporary `.env` file for backend:
   
   ```bash
   cd /opt/clipper/backend
   
   # Copy from secure backup location
   cp /secure/backup/.env.emergency .env
   
   # Or manually recreate with essential secrets only:
   cat > .env << 'EOF'
   DB_HOST=postgres
   DB_PORT=5432
   DB_USER=clipper
   DB_PASSWORD=<EMERGENCY_DB_PASSWORD>
   REDIS_HOST=redis
   REDIS_PORT=6379
   JWT_PRIVATE_KEY="<EMERGENCY_JWT_KEY>"
   JWT_PUBLIC_KEY="<EMERGENCY_JWT_KEY>"
   EOF
   
   # Set strict permissions
   chmod 600 .env
   chown 1000:1000 .env
   
   # Restart backend
   docker compose restart backend
   ```

4. **Document the Incident:**
   - Log the time and reason for break-glass access
   - Document who performed the action
   - Create incident ticket

### Scenario 2: Lost Vault Access Credentials

**Symptoms:**
- Cannot authenticate to Vault
- Lost root token or unseal keys
- AppRole credentials are invalid

**Recovery Steps:**

1. **If Vault is Sealed:**
   ```bash
   # Use unseal keys (stored securely offline)
   vault operator unseal <unseal_key_1>
   vault operator unseal <unseal_key_2>
   vault operator unseal <unseal_key_3>
   ```

2. **If Root Token is Lost but Vault is Unsealed:**
   ```bash
   # Generate new root token (requires unseal keys)
   vault operator generate-root -init
   vault operator generate-root -nonce=<nonce> <unseal_key_1>
   vault operator generate-root -nonce=<nonce> <unseal_key_2>
   vault operator generate-root -nonce=<nonce> <unseal_key_3>
   
   # Decode the encoded root token
   vault operator generate-root -decode=<encoded_token> -otp=<otp>
   ```

3. **Regenerate AppRole Credentials:**
   ```bash
   # Login with root token
   vault login <root_token>
   
   # Generate new role_id and secret_id
   vault read -field=role_id auth/approle/role/clipper-backend/role-id > vault/approle/role_id
   vault write -field=secret_id -f auth/approle/role/clipper-backend/secret-id > vault/approle/secret_id
   
   # Restart vault-agent
   docker compose restart vault-agent
   ```

### Scenario 3: Suspected Credential Compromise

**Immediate Actions (Complete within 15 minutes):**

1. **Isolate the Compromised System:**
   ```bash
   # If server is compromised
   sudo iptables -A INPUT -j DROP  # Block all incoming
   
   # If specific credentials compromised, rotate immediately
   ```

2. **Rotate All Potentially Compromised Credentials:**
   ```bash
   # Database password
   ./scripts/rotate-db-password.sh
   
   # API keys
   ./scripts/rotate-api-keys.sh --service stripe
   ./scripts/rotate-api-keys.sh --service twitch
   ./scripts/rotate-api-keys.sh --service openai
   
   # JWT keys
   ./scripts/rotate-jwt-keys.sh
   ```

3. **Review Access Logs:**
   ```bash
   # Vault audit logs
   vault audit list
   vault read sys/audit/file
   
   # Check for unauthorized access
   sudo journalctl -u vault -n 1000 | grep -i "denied\|failed"
   
   # Backend application logs
   docker compose logs backend | grep -i "authentication\|unauthorized"
   ```

4. **Revoke Compromised Tokens:**
   ```bash
   # If AppRole token is compromised
   vault token revoke <accessor>
   
   # Revoke all tokens for a role
   vault write auth/approle/role/clipper-backend/secret-id-accessor/destroy secret_id_accessor=<accessor>
   ```

### Scenario 4: Backend Cannot Start Due to Secret Issues

**Symptoms:**
- Backend container restarts continuously
- Logs show "waiting for Vault secrets"
- Vault-agent cannot render secrets

**Quick Fix:**

1. **Check Vault-Agent Status:**
   ```bash
   docker compose logs vault-agent --tail=50
   
   # Look for authentication errors
   # Look for template rendering errors
   ```

2. **Verify AppRole Credentials:**
   ```bash
   # Check if files exist
   ls -la vault/approle/
   
   # Check if files have content
   cat vault/approle/role_id
   cat vault/approle/secret_id
   
   # Test authentication
   vault write auth/approle/login \
     role_id=$(cat vault/approle/role_id) \
     secret_id=$(cat vault/approle/secret_id)
   ```

3. **Manual Secret Rendering (Temporary):**
   ```bash
   # Authenticate to Vault
   vault login
   
   # Manually fetch and create backend.env
   vault kv get -format=json kv/clipper/backend | \
     jq -r '.data.data | to_entries | .[] | "\(.key)=\"\(.value)\""' > \
     vault/rendered/backend.env
   
   # Set permissions
   chmod 640 vault/rendered/backend.env
   
   # Restart backend
   docker compose restart backend
   ```

## Break-Glass Access Methods

### Method 1: Emergency Environment Variables

**Use Case:** Quick temporary fix when Vault is down

**Location:** `/secure/backup/.env.emergency`

**Contents (Minimum Required):**
```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=clipper_emergency
DB_PASSWORD=<SECURE_EMERGENCY_PASSWORD>

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT Keys (emergency pair)
JWT_PRIVATE_KEY="<EMERGENCY_RSA_PRIVATE_KEY>"
JWT_PUBLIC_KEY="<EMERGENCY_RSA_PUBLIC_KEY>"

# Twitch (read-only mode possible without)
TWITCH_CLIENT_ID=<EMERGENCY_CLIENT_ID>
TWITCH_CLIENT_SECRET=<EMERGENCY_CLIENT_SECRET>
```

**Security Notes:**
- Store in encrypted form
- Only decrypt when needed
- Rotate all emergency credentials after use
- Emergency credentials should have limited privileges

### Method 2: Vault Unseal Process

**Required Items (Store Securely Offline):**
- 3 of 5 unseal keys
- Root token or method to regenerate

**Unseal Process:**
```bash
# Check Vault status
vault status

# If sealed, unseal
vault operator unseal <key1>
vault operator unseal <key2>
vault operator unseal <key3>

# Login
vault login <root_token>

# Verify access
vault kv list kv/clipper
```

### Method 3: Direct Database Access

**Use Case:** Need to reset user password or perform emergency data recovery

```bash
# Access PostgreSQL directly
docker exec -it clipper-postgres psql -U clipper -d clipper_db

-- Emergency admin password reset
UPDATE users 
SET password_hash = '<bcrypt_hash_of_emergency_password>' 
WHERE username = 'admin';

-- Grant emergency access
UPDATE users 
SET is_admin = true 
WHERE twitch_id = '<your_twitch_id>';
```

## Emergency Rotation Procedures

### Immediate Rotation Steps

When credentials are compromised, rotate in this order:

1. **Database Password (Highest Priority):**
   ```bash
   ./scripts/rotate-db-password.sh
   ```

2. **JWT Signing Keys:**
   ```bash
   ./scripts/rotate-jwt-keys.sh
   # This will invalidate all existing sessions
   ```

3. **API Keys:**
   ```bash
   # Stripe
   ./scripts/rotate-api-keys.sh --service stripe
   
   # Twitch
   ./scripts/rotate-api-keys.sh --service twitch
   
   # OpenAI
   ./scripts/rotate-api-keys.sh --service openai
   ```

4. **Vault AppRole Credentials:**
   ```bash
   vault write -f auth/approle/role/clipper-backend/secret-id > vault/approle/secret_id
   docker compose restart vault-agent
   ```

### Post-Compromise Actions

1. **Full Audit:**
   ```bash
   # Export Vault audit logs
   docker exec -it clipper-vault vault audit list
   
   # Export application logs
   docker compose logs --since 24h > /tmp/incident-logs-$(date +%Y%m%d).txt
   
   # Export database logs
   docker exec -it clipper-postgres cat /var/log/postgresql/*.log > /tmp/db-logs-$(date +%Y%m%d).txt
   ```

2. **Notify Users (If JWT Keys Rotated):**
   - All users will need to re-authenticate
   - Send email notification
   - Update status page

3. **Update Documentation:**
   - Document incident in post-mortem
   - Update rotation dates
   - Review and improve procedures

## Emergency Contacts

| Role | Contact | When to Contact |
|------|---------|----------------|
| On-Call Engineer | See PagerDuty | Any production emergency |
| Security Team | security@clipper.gg | Security incident or compromise |
| Infrastructure Lead | infra@clipper.gg | Vault or infrastructure issues |
| Database Admin | dba@clipper.gg | Database access issues |

## Post-Incident Requirements

After using break-glass procedures:

1. **Immediate (Within 1 Hour):**
   - [ ] Create incident ticket
   - [ ] Document actions taken
   - [ ] Notify team lead
   - [ ] Begin audit log review

2. **Within 24 Hours:**
   - [ ] Complete incident report
   - [ ] Rotate any temporary/emergency credentials used
   - [ ] Verify normal access is restored
   - [ ] Update monitoring alerts

3. **Within 1 Week:**
   - [ ] Conduct post-mortem meeting
   - [ ] Update break-glass procedures based on learnings
   - [ ] Review and improve monitoring
   - [ ] Test recovery procedures

## Recovery Validation

After emergency procedures, validate system health:

```bash
# Test secret retrieval
./scripts/test-secrets-retrieval.sh

# Check backend health
curl http://localhost:8080/api/v1/health

# Test authentication flow
curl -X GET http://localhost:8080/api/v1/auth/twitch

# Check database connectivity
docker exec -it clipper-postgres psql -U clipper -d clipper_db -c "SELECT 1;"

# Verify Vault is operational
vault status
vault kv list kv/clipper
```

---

**Remember:** Break-glass procedures are for emergencies only. All usage must be:
- Documented
- Audited
- Reviewed in post-mortem
- Followed by credential rotation
