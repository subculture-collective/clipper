---
title: "Secrets Management Guide"
summary: "This document outlines best practices for managing secrets in production environments."
tags: ['operations']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Secrets Management Guide

This document outlines best practices for managing secrets in production environments.

## Overview

Clipper uses several sensitive credentials and secrets that must be properly secured in production:

- Database passwords
- Redis passwords
- JWT private keys
- Twitch API credentials
- Session secrets
- Third-party service API keys

## Best Practices

### 1. Never Commit Secrets to Git

- ✅ Use `.env.example` files with placeholder values
- ✅ Add `.env` files to `.gitignore`
- ❌ Never commit actual credentials to version control

### 2. Use Environment Variables

All secrets should be loaded from environment variables:

```bash
# Bad - hardcoded in code
const apiKey = "abc123..."

# Good - loaded from environment
const apiKey = process.env.API_KEY
```

### 3. Use a Secrets Manager (Recommended for Production)

For production deployments, use a dedicated secrets management service:

#### Option A: HashiCorp Vault

```bash
# Install Vault CLI
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install vault

# Store secrets
vault kv put secret/clipper/production \
  db_password="..." \
  jwt_private_key="..." \
  twitch_client_secret="..."

# Retrieve secrets in deployment
export DB_PASSWORD=$(vault kv get -field=db_password secret/clipper/production)
```

#### Option B: AWS Secrets Manager

```bash
# Store secret
aws secretsmanager create-secret \
  --name clipper/production/db_password \
  --secret-string "your-secure-password"

# Retrieve in application startup
aws secretsmanager get-secret-value \
  --secret-id clipper/production/db_password \
  --query SecretString \
  --output text
```

#### Option C: Docker Secrets (Docker Swarm)

```yaml
# docker-compose.yml
services:
  backend:
    secrets:
      - db_password
      - jwt_private_key

secrets:
  db_password:
    external: true
  jwt_private_key:
    external: true
```

#### Option D: Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: clipper-secrets
type: Opaque
data:
  db-password: <base64-encoded-value>
  jwt-private-key: <base64-encoded-value>
```

### 4. Secret Rotation

Regular rotation of secrets is critical for security. Clipper provides automated rotation scripts and comprehensive procedures.

**📚 See detailed rotation procedures:** [Credential Rotation Runbook](./credential-rotation-runbook.md)

#### Rotation Schedule

| Credential | Frequency | Script |
|-----------|-----------|--------|
| Database Password | 90 days | `./scripts/rotate-db-password.sh` |
| JWT Signing Keys | 90 days | `./scripts/rotate-jwt-keys.sh` |
| API Keys (Stripe, Twitch, OpenAI) | 90-180 days | `./scripts/rotate-api-keys.sh` |
| Vault AppRole | 30 days | Manual (see runbook) |

#### Quick Rotation Examples

**Database Password:**
```bash
cd /opt/clipper
./scripts/rotate-db-password.sh
```

**JWT Keys:**
```bash
cd /opt/clipper
./scripts/rotate-jwt-keys.sh
```

**API Keys:**
```bash
cd /opt/clipper
# Stripe
./scripts/rotate-api-keys.sh --service stripe

# Twitch
./scripts/rotate-api-keys.sh --service twitch

# OpenAI
./scripts/rotate-api-keys.sh --service openai
```

#### Automated Rotation Monitoring

Install the systemd timer for weekly rotation reminders:

```bash
sudo cp backend/scripts/systemd/clipper-rotation-reminder.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now clipper-rotation-reminder.timer
```

#### Testing Secret Retrieval

Validate all secrets are properly configured:

```bash
cd /opt/clipper
./scripts/test-secrets-retrieval.sh
```

### 5. Secure Password Generation

Use strong, random passwords for all secrets:

```bash
# Generate secure random password (32 characters)
openssl rand -base64 32

# Generate hex password (64 characters)
openssl rand -hex 32

# Generate alphanumeric password
< /dev/urandom tr -dc A-Za-z0-9 | head -c 32
```

### 6. Access Control

Limit who can access secrets:

1. **Principle of Least Privilege:**
   - Only grant access to those who need it
   - Use role-based access control (RBAC)
   - Audit access logs regularly

2. **Multi-Factor Authentication:**
   - Require MFA for accessing secrets managers
   - Require MFA for production server access

3. **SSH Key-Based Authentication:**
   - Disable password authentication for servers
   - Use SSH keys with passphrases
   - Rotate SSH keys regularly

### 7. Monitoring and Auditing

Monitor secret usage and access:

1. **Log Secret Access:**
   - Enable audit logging in secrets manager
   - Monitor for unauthorized access attempts
   - Alert on suspicious patterns

2. **Regular Security Audits:**
   - Review who has access to secrets
   - Check for unused or stale credentials
   - Verify rotation schedules are followed

## Secret Validation Checklist

Before deploying to production:

- [ ] All secrets use strong, random values
- [ ] No secrets are committed to version control
- [ ] Secrets are stored in a secure secrets manager
- [ ] Access to secrets is restricted and logged
- [ ] Rotation schedule is established and documented
- [ ] Backup secrets are encrypted
- [ ] Local development uses different secrets than production
- [ ] CI/CD pipelines use separate credentials
- [ ] All team members are trained on secrets management
- [ ] Incident response plan includes secret compromise scenarios

## Emergency Procedures

### If Secrets are Compromised

**See detailed emergency procedures:** [Break-Glass Emergency Procedures](./break-glass-procedures.md)

**Immediate actions:**

1. **Immediately rotate all affected secrets**
   ```bash
   ./scripts/rotate-db-password.sh
   ./scripts/rotate-jwt-keys.sh
   ./scripts/rotate-api-keys.sh --service [stripe|twitch|openai]
   ```

2. **Revoke compromised credentials** in third-party services
3. **Review access logs** for unauthorized usage:
   ```bash
   vault audit list
   docker compose logs backend | grep -i "authentication\|unauthorized"
   ```
4. **Notify affected users** if necessary
5. **Conduct post-incident review**
6. **Update security procedures** to prevent recurrence

### Contact Information

For security concerns or suspected compromises:

- **Security Team:** <security@clipper.gg>
- **On-Call Engineer:** See PagerDuty or [break-glass-procedures.md](./break-glass-procedures.md)
- **Emergency Documentation:** [Break-Glass Emergency Procedures](./break-glass-procedures.md)

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
