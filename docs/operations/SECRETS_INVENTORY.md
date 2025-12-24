# Secrets Inventory and Access Paths

**Document Version:** 1.0  
**Last Updated:** 2025-12-16  
**Status:** Active  
**Owner:** Security Team  
**Review Frequency:** Quarterly

---

## Overview

This document provides a comprehensive inventory of all secrets, credentials, and sensitive configuration used in the Clipper application across all environments. It serves as the authoritative reference for secret management, access control, and rotation planning.

## Table of Contents

- [Secrets Classification](#secrets-classification)
- [Complete Secrets Inventory](#complete-secrets-inventory)
- [Access Paths and Storage Locations](#access-paths-and-storage-locations)
- [Access Control Matrix](#access-control-matrix)
- [Rotation Status](#rotation-status)
- [Audit Trail](#audit-trail)

---

## Secrets Classification

| Priority | Description | Rotation Frequency | Examples |
|----------|-------------|-------------------|----------|
| **Critical** | Secrets that grant full system access or financial access | 90 days | Database passwords, JWT keys, Stripe keys |
| **High** | Secrets that grant significant access or contain PII | 90-180 days | Twitch OAuth, API keys |
| **Medium** | Secrets with limited scope or automated rotation | 180-365 days | Redis passwords, service tokens |
| **Low** | Secrets with minimal impact if compromised | 365 days | Analytics keys, monitoring tokens |

---

## Complete Secrets Inventory

### 1. Database Credentials

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `POSTGRES_USER` | Username | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `POSTGRES_PASSWORD` | Password | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `DB_HOST` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `DB_PORT` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `DB_NAME` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `DB_SSLMODE` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** PostgreSQL database authentication and connection  
**Used By:** Backend application, migration scripts  
**Backup Location:** Vault automatic backup  
**Emergency Access:** [Break-glass procedure](./break-glass-procedures.md)

---

### 2. Redis Credentials

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `REDIS_HOST` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `REDIS_PORT` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `REDIS_PASSWORD` | Password | Medium | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `REDIS_DB` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** Redis cache and session storage authentication  
**Used By:** Backend application (session management, rate limiting, caching)  
**Impact if Compromised:** Session hijacking, cache poisoning  
**Rotation Script:** Manual (documented in credential-rotation-runbook.md)

---

### 3. JWT Signing Keys

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `JWT_PRIVATE_KEY` | RSA Private Key | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `JWT_PUBLIC_KEY` | RSA Public Key | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `JWT_ACCESS_TOKEN_EXPIRY` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `JWT_REFRESH_TOKEN_EXPIRY` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** JWT token signing and verification for authentication  
**Algorithm:** RSA-256 (2048-bit keys)  
**Used By:** Backend application (auth service)  
**Impact if Compromised:** Complete authentication bypass, impersonation  
**Rotation Script:** `scripts/rotate-jwt-keys.sh`  
**Special Notes:** Existing tokens remain valid until expiration during rotation

---

### 4. MFA/2FA Secrets

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `MFA_ENCRYPTION_KEY` | Encryption Key | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 365 days |

**Purpose:** Encryption of TOTP seeds and backup codes  
**Used By:** Backend application (MFA service)  
**Key Length:** 32 bytes  
**Impact if Compromised:** MFA bypass possible  
**Rotation:** Requires re-encryption of all TOTP seeds (see runbook)

---

### 5. Stripe Payment Integration

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `STRIPE_SECRET_KEY` | API Secret | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 180 days |
| `STRIPE_WEBHOOK_SECRET` | Webhook Secret | Critical | Vault: `kv/clipper/backend` | Backend AppRole | 180 days |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `STRIPE_PRO_YEARLY_PRICE_ID` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** Payment processing and subscription management  
**Environment:** Production (live keys), Staging (test keys)  
**Used By:** Backend application (payment service)  
**Impact if Compromised:** Financial fraud, unauthorized charges, refunds  
**Rotation Script:** `scripts/rotate-api-keys.sh --service stripe`  
**Provider Dashboard:** https://dashboard.stripe.com/apikeys  
**Special Notes:** Coordinate rotation with accounting team for reconciliation

---

### 6. Twitch OAuth Integration

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `TWITCH_CLIENT_ID` | OAuth Client ID | High | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `TWITCH_CLIENT_SECRET` | OAuth Secret | High | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `TWITCH_REDIRECT_URI` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** Twitch OAuth authentication and API access  
**Used By:** Backend application (auth service, Twitch integration)  
**Impact if Compromised:** Account hijacking, unauthorized API access  
**Rotation Script:** `scripts/rotate-api-keys.sh --service twitch`  
**Provider Dashboard:** https://dev.twitch.tv/console/apps  
**Special Notes:** Update redirect URI in Twitch dashboard if domain changes

---

### 7. OpenAI API Integration

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `OPENAI_API_KEY` | API Key | High | Vault: `kv/clipper/backend` | Backend AppRole | 180 days |

**Purpose:** Semantic search and AI features  
**Feature Flag:** `FEATURE_SEMANTIC_SEARCH`  
**Used By:** Backend application (search service)  
**Impact if Compromised:** Unauthorized API usage, cost implications  
**Rotation Script:** `scripts/rotate-api-keys.sh --service openai`  
**Provider Dashboard:** https://platform.openai.com/api-keys  
**Cost Monitoring:** Monitor usage at https://platform.openai.com/usage

---

### 8. Email Service (SendGrid)

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `SENDGRID_API_KEY` | API Key | Medium | Vault: `kv/clipper/backend` | Backend AppRole | 180 days |

**Purpose:** Transactional email delivery  
**Used By:** Backend application (notification service)  
**Impact if Compromised:** Email spam, phishing attacks  
**Rotation:** Manual via SendGrid dashboard  
**Provider Dashboard:** https://app.sendgrid.com/settings/api_keys

---

### 9. Observability and Monitoring

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `SENTRY_DSN` | DSN/Token | Medium | Vault: `kv/clipper/backend` + `kv/clipper/frontend` | Backend/Frontend AppRole | 180 days |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** Error tracking and performance monitoring  
**Used By:** Backend and frontend applications  
**Impact if Compromised:** Information disclosure (error details, stack traces)  
**Rotation:** Via Sentry dashboard  
**Provider Dashboard:** https://sentry.io/settings/

---

### 10. OpenSearch

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `OPENSEARCH_URL` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `OPENSEARCH_USERNAME` | Username | High | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |
| `OPENSEARCH_PASSWORD` | Password | High | Vault: `kv/clipper/backend` | Backend AppRole | 90 days |

**Purpose:** Full-text search functionality  
**Used By:** Backend application (search service)  
**Impact if Compromised:** Data exfiltration, search manipulation  
**Rotation:** Manual (document in runbook)  
**Security Note:** Ensure security plugin enabled in production

---

### 11. Cookie and Session Security

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `COOKIE_DOMAIN` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `COOKIE_SECURE` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `COOKIE_HTTPONLY` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |
| `COOKIE_SAMESITE` | Config | Low | Vault: `kv/clipper/backend` | Backend AppRole | As needed |

**Purpose:** Secure session cookie configuration  
**Used By:** Backend application (session middleware)

---

### 12. HashiCorp Vault

| Secret Name | Type | Priority | Storage Location | Access Path | Rotation Frequency |
|-------------|------|----------|-----------------|-------------|-------------------|
| `VAULT_ADDR` | Config | Low | Environment variable | All services | As needed |
| `VAULT_TOKEN` | Token | Critical | AppRole auth | Generated on demand | 1-24 hours (TTL) |
| `VAULT_ROLE_ID` | AppRole ID | High | Server config file | Backend/Frontend services | 30 days |
| `VAULT_SECRET_ID` | AppRole Secret | High | Server config file | Backend/Frontend services | Auto-renewed |

**Purpose:** Secrets management and retrieval  
**Used By:** Backend application, frontend build, vault-agent  
**Impact if Compromised:** Access to all secrets  
**Rotation:** Manual AppRole rotation (see runbook)  
**Access Path:** `/vault/approle` and `/vault/rendered`

---

## Access Paths and Storage Locations

### Primary Storage: HashiCorp Vault

**Vault Server:** `https://vault.subcult.tv`  
**KV Engine:** `kv/` (version 2)

#### Secret Paths

| Path | Purpose | Access Policy | Environment |
|------|---------|---------------|-------------|
| `kv/clipper/backend` | Backend application secrets | `clipper-backend` | Production |
| `kv/clipper/frontend` | Frontend build secrets | `clipper-frontend` | Production |
| `kv/clipper/admin` | Administrative secrets | `clipper-admin` | Production |

#### Access Methods

1. **Application Access (Production)**
   - Method: AppRole authentication
   - Token TTL: 1-24 hours
   - Renewal: Automatic via vault-agent
   - Files: `/vault/rendered/.env` (rendered by vault-agent)

2. **Human Access (Operations)**
   - Method: Vault CLI with userpass or token
   - Token TTL: 8 hours (configurable)
   - Access: Read-only for most operations, write for rotation

3. **CI/CD Access (Optional)**
   - Method: AppRole with limited scope
   - Token TTL: 1 hour
   - Access: Read-only for build secrets

---

## Access Control Matrix

### Vault Policies

| Policy Name | Purpose | Paths | Capabilities | Used By |
|-------------|---------|-------|--------------|---------|
| `clipper-backend` | Backend app | `kv/data/clipper/backend/*` | read, update | Backend AppRole |
| `clipper-frontend` | Frontend build | `kv/data/clipper/frontend/*` | read | Frontend AppRole |
| `clipper-admin` | Administration | `kv/*` | read, create, update, delete | Ops team |

**Policy Location:** `/vault/policies/*.hcl`  
**Documentation:** See docs/operations/vault-access-control.md

### AppRole Configuration

| Role Name | Secret ID TTL | Token TTL | Token Max TTL | Policies |
|-----------|---------------|-----------|---------------|----------|
| `clipper-backend` | 0 (unlimited) | 24h | 24h | clipper-backend |
| `clipper-frontend` | 0 (unlimited) | 1h | 1h | clipper-frontend |

**AppRole Configuration:** `/vault/approle/`

### Human User Access

| Role | Access Level | Use Cases | Token TTL |
|------|--------------|-----------|-----------|
| Operations Engineer | Read + Rotate | Secret rotation, troubleshooting | 8h |
| Security Team | Admin | Policy management, auditing | 8h |
| Developer (Emergency) | Read-only | Break-glass debugging | 1h |

**Access Documentation:** See docs/operations/break-glass-procedures.md

---

## Rotation Status

### Rotation Schedule Summary

| Secret Category | Frequency | Last Rotated | Next Due | Status |
|----------------|-----------|--------------|----------|--------|
| Database Password | 90 days | - | - | ⏳ Pending |
| JWT Keys | 90 days | - | - | ⏳ Pending |
| Stripe Keys | 180 days | - | - | ⏳ Pending |
| Twitch OAuth | 90 days | - | - | ⏳ Pending |
| OpenAI Key | 180 days | - | - | ⏳ Pending |
| Redis Password | 90 days | - | - | ⏳ Pending |
| Vault AppRole | 30 days | - | - | ⏳ Pending |

**Note:** Update this table after each rotation. Maintain detailed logs in `/opt/clipper/rotation-log.txt`.

### Rotation Automation Status

| Secret Type | Script Available | Automation Status | Monitoring |
|-------------|-----------------|-------------------|------------|
| Database Password | ✅ `rotate-db-password.sh` | Manual execution | Systemd timer |
| JWT Keys | ✅ `rotate-jwt-keys.sh` | Manual execution | Systemd timer |
| API Keys | ✅ `rotate-api-keys.sh` | Manual execution | Systemd timer |
| Redis | ❌ Manual only | Documented in runbook | Manual tracking |
| Vault AppRole | ❌ Manual only | Documented in runbook | Manual tracking |

**Monitoring:** Weekly rotation reminder via `clipper-rotation-reminder.timer`

---

## Audit Trail

### Access Logging

**Vault Audit Logging:**
- Status: **Required for Production** (deployment pending)
- Log Path: `/vault/logs/audit.log`
- Enable Command: `vault audit enable file file_path=/vault/logs/audit.log`
- Retention: 90 days minimum
- Purpose: Compliance and security monitoring

**Application Audit Logs:**
- Database: `audit_logs` table
- Retention: 365 days
- Logged Events: Authentication, authorization, secret access attempts

### Rotation Log

**Location:** `/opt/clipper/rotation-log.txt`  
**Format:**
```
YYYY-MM-DD HH:MM:SS | [SECRET_TYPE] | [ACTION] | [OPERATOR] | [STATUS] | [NOTES]
```

**Example:**
```
2025-12-16 10:30:00 | DATABASE_PASSWORD | ROTATED | ops@example.com | SUCCESS | Routine 90-day rotation
2025-12-16 11:45:00 | JWT_KEYS | ROTATED | ops@example.com | SUCCESS | Routine 90-day rotation
```

### Compliance and Review

**Review Schedule:**
- **Weekly:** Rotation reminders check
- **Monthly:** Access review (who has access to what)
- **Quarterly:** Full inventory audit and policy review
- **Annually:** Comprehensive security audit

**Audit Artifacts:**
1. This inventory document (SECRETS_INVENTORY.md)
2. Rotation log (/opt/clipper/rotation-log.txt)
3. Vault audit logs (/vault/logs/audit.log)
4. Access control policies (/vault/policies/)
5. Rotation runbook (docs/operations/credential-rotation-runbook.md)

---

## Integration Points

### Where Secrets Are Used

1. **Backend Application (`/backend`)**
   - Loads from: `/vault/rendered/.env`
   - Rendered by: vault-agent sidecar
   - Restart on change: Automatic via vault-agent template

2. **Frontend Build (`/frontend`)**
   - Loads from: `/vault/rendered/.env`
   - Rendered by: vault-agent during build
   - Public exposure: Only `VITE_*` variables exposed to browser

3. **Mobile Application (`/mobile`)**
   - Loads from: Environment-specific config
   - Build-time only: No runtime secret access
   - Public exposure: Only API endpoints and public keys

4. **CI/CD Pipeline**
   - Access method: AppRole (optional)
   - Purpose: Build secrets only
   - Documentation: docs/operations/ci-cd-vault-integration.md

5. **Database Migrations**
   - Loads from: Same as backend application
   - Access path: Backend AppRole via vault-agent

---

## Security Best Practices

### Least Privilege Implementation

✅ **Implemented:**
- AppRole tokens have minimal required permissions
- Short-lived tokens (1-24 hour TTL)
- Read-only access where possible
- Policy-based access control

✅ **Enforced:**
- No secrets in version control
- No hardcoded credentials in code
- `.gitignore` blocks secret files
- All examples use placeholders

### Defense in Depth

1. **Layer 1:** Vault authentication (AppRole, userpass)
2. **Layer 2:** Vault policies (least privilege)
3. **Layer 3:** Network isolation (VPN, firewall rules)
4. **Layer 4:** Audit logging (track all access)
5. **Layer 5:** Regular rotation (limit exposure window)

---

## References

### Documentation

- [Credential Rotation Runbook](./credential-rotation-runbook.md)
- [Vault Access Control](./vault-access-control.md)
- [Break-Glass Procedures](./break-glass-procedures.md)
- [CI/CD Vault Integration](./ci-cd-vault-integration.md)
- [Secrets Management Guide](./secrets-management.md)

### Scripts

- [Rotation Scripts README](../../scripts/ROTATION_SCRIPTS.md)
- `scripts/rotate-db-password.sh`
- `scripts/rotate-jwt-keys.sh`
- `scripts/rotate-api-keys.sh`
- `scripts/test-secrets-retrieval.sh`

### External Resources

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Vault AppRole Auth](https://www.vaultproject.io/docs/auth/approle)
- [Secrets Management Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-16 | 1.0 | Initial comprehensive inventory | Security Team |

---

## Support

**Security Team:** security@clipper.gg  
**Operations Team:** ops@clipper.gg  
**Emergency:** See [Break-Glass Procedures](./break-glass-procedures.md)

**Next Review Date:** 2026-03-16
