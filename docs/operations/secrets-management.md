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

Regular rotation of secrets is critical for security:

#### Twitch API Credentials Rotation

Rotate Twitch credentials every 90 days or immediately if compromised:

1. **Generate new credentials:**
   - Go to [Twitch Developer Console](https://dev.twitch.tv/console/apps)
   - Create a new application or regenerate client secret
   - Note the new Client ID and Secret

2. **Update production environment:**

   ```bash
   # SSH to production server
   ssh deploy@production-server
   cd /opt/clipper
   
   # Edit environment file
   nano .env
   
   # Update these values:
   TWITCH_CLIENT_ID=<new-client-id>
   TWITCH_CLIENT_SECRET=<new-client-secret>
   
   # Restart services
   docker-compose restart backend
   ```

3. **Verify functionality:**

   ```bash
   # Test authentication flow
   curl -X GET https://clpr.tv/api/v1/auth/twitch
   
   # Check logs for errors
   docker-compose logs -f backend | grep -i twitch
   ```

4. **Document rotation:**
   - Update your password manager
   - Log the rotation date
   - Schedule next rotation

#### Database Password Rotation

1. **Create new database user with same privileges:**

   ```sql
   CREATE USER clipper_new WITH PASSWORD 'new-secure-password';
   GRANT ALL PRIVILEGES ON DATABASE clipper_db TO clipper_new;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO clipper_new;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO clipper_new;
   ```

2. **Update application configuration:**

   ```bash
   DB_USER=clipper_new
   DB_PASSWORD=new-secure-password
   ```

3. **Restart application and verify:**

   ```bash
   docker-compose restart backend
   ./scripts/health-check.sh
   ```

4. **Remove old user after verification:**

   ```sql
   DROP USER clipper;
   ```

#### JWT Key Rotation

1. **Generate new RSA key pair:**

   ```bash
   openssl genrsa -out private_new.pem 2048
   openssl rsa -in private_new.pem -pubout -out public_new.pem
   ```

2. **Implement dual-key verification:**
   - Keep old public key for verifying existing tokens
   - Use new private key for signing new tokens
   - Tokens will naturally expire and rotate over time

3. **Update after grace period:**
   - After token expiration period (e.g., 24 hours), fully switch to new keys
   - Remove old keys from configuration

#### Redis Password Rotation

1. **Add password to Redis:**

   ```bash
   # Update docker-compose.yml
   command: redis-server --requirepass new-secure-password --appendonly yes
   
   # Or via redis.conf
   requirepass new-secure-password
   ```

2. **Update application configuration:**

   ```bash
   REDIS_PASSWORD=new-secure-password
   ```

3. **Rolling restart:**

   ```bash
   docker-compose restart redis
   docker-compose restart backend
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

1. **Immediately rotate all affected secrets**
2. **Revoke compromised credentials**
3. **Review access logs for unauthorized usage**
4. **Notify affected users if necessary**
5. **Conduct post-incident review**
6. **Update security procedures to prevent recurrence**

### Contact Information

For security concerns or suspected compromises:

- Security Team: <security@example.com>
- On-Call Engineer: See [RUNBOOK.md](./RUNBOOK.md)
- Emergency Hotline: [Your emergency contact]

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
