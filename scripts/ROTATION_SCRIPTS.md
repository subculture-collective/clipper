# Credential Rotation Scripts

This directory contains automated scripts for rotating credentials and secrets in the Clipper application.

## Available Scripts

### 1. Database Password Rotation
**Script:** `rotate-db-password.sh`

Rotates the PostgreSQL database password in Vault and updates the running application.

```bash
# Production rotation
./rotate-db-password.sh

# Test without making changes
./rotate-db-password.sh --dry-run
```

**Features:**
- Generates secure random password
- Updates PostgreSQL user password
- Updates Vault with new password
- Restarts services automatically
- Verifies connection with new password
- Automatic rollback on failure

### 2. JWT Signing Keys Rotation
**Script:** `rotate-jwt-keys.sh`

Rotates JWT signing keys with graceful migration to avoid invalidating existing user sessions.

```bash
# Production rotation
./rotate-jwt-keys.sh

# Test without making changes
./rotate-jwt-keys.sh --dry-run
```

**Features:**
- Generates new RSA 2048-bit key pair
- Stores in Vault as base64-encoded
- Backs up old keys for emergency rollback
- Restarts services automatically
- Verifies backend health
- Existing tokens remain valid until expiration

### 3. API Keys Rotation
**Script:** `rotate-api-keys.sh`

Rotates API keys for Stripe, Twitch, and OpenAI with interactive guidance.

```bash
# Rotate Stripe keys
./rotate-api-keys.sh --service stripe

# Rotate Twitch OAuth credentials
./rotate-api-keys.sh --service twitch

# Rotate OpenAI API key
./rotate-api-keys.sh --service openai

# Test without making changes
./rotate-api-keys.sh --service stripe --dry-run
```

**Features:**
- Interactive step-by-step guidance
- Validates key formats
- Updates Vault automatically
- Restarts services automatically
- Provides post-rotation verification steps
- Reminds to delete old keys from provider dashboards

### 4. Secret Retrieval Testing
**Script:** `test-secrets-retrieval.sh`

Validates that all secrets can be retrieved from Vault and checks their configuration.

```bash
# Test production secrets
./test-secrets-retrieval.sh

# Test specific environment
./test-secrets-retrieval.sh --environment staging
```

**Features:**
- Tests all critical secrets
- Tests high priority secrets
- Tests medium priority secrets
- Validates environment configuration
- Checks vault-agent integration
- Provides detailed status report

## Prerequisites

Before running any rotation script:

1. **Vault Access:**
   ```bash
   export VAULT_ADDR=https://vault.subcult.tv
   vault login
   ```

2. **Production Server Access:**
   ```bash
   ssh deploy@production-server
   cd /opt/clipper
   ```

3. **Required Tools:**
   - `vault` CLI
   - `openssl` (for key generation)
   - `curl` (for verification)
   - `docker` or `systemctl` (for service restarts)

4. **Permissions:**
   - Vault write access to `kv/clipper/backend`
   - Database admin access (for DB password rotation)
   - Admin access to third-party services (for API key rotation)

## Environment Variables

All scripts respect the following environment variables:

- `VAULT_ADDR` - Vault server address (default: `https://vault.subcult.tv`)
- `VAULT_PATH` - Vault KV path (default: `kv/clipper/backend`)
- `DB_HOST` - Database host (default: `postgres`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USER` - Database user (default: `clipper`)
- `DB_NAME` - Database name (default: `clipper_db`)

## Usage Examples

### Complete Rotation Cycle

```bash
# 1. Test current secret retrieval
./test-secrets-retrieval.sh

# 2. Rotate database password (every 90 days)
./rotate-db-password.sh

# 3. Rotate JWT keys (every 90 days)
./rotate-jwt-keys.sh

# 4. Rotate API keys (every 90-180 days)
./rotate-api-keys.sh --service stripe
./rotate-api-keys.sh --service twitch
./rotate-api-keys.sh --service openai

# 5. Verify all secrets after rotation
./test-secrets-retrieval.sh
```

### Emergency Rotation

If credentials are compromised:

```bash
# Rotate all critical credentials immediately
./rotate-db-password.sh
./rotate-jwt-keys.sh
./rotate-api-keys.sh --service stripe
./rotate-api-keys.sh --service twitch
./rotate-api-keys.sh --service openai

# Check logs for suspicious activity
docker compose logs backend | grep -i "authentication\|unauthorized"
vault audit list
```

### Dry Run Testing

Test rotation procedures without making changes:

```bash
./rotate-db-password.sh --dry-run
./rotate-jwt-keys.sh --dry-run
./rotate-api-keys.sh --service stripe --dry-run
```

## Automation

### Systemd Timer (Rotation Reminders)

Install the rotation reminder timer:

```bash
# Copy systemd files
sudo cp backend/scripts/systemd/clipper-rotation-reminder.* /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable --now clipper-rotation-reminder.timer

# Check status
sudo systemctl status clipper-rotation-reminder.timer

# View logs
sudo journalctl -u clipper-rotation-reminder.service
```

The timer runs every Monday at 9:00 AM and checks if any credentials are due for rotation within the next 7 days.

### Cron Job (Alternative)

Add to crontab for weekly reminders:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Monday at 9:00 AM)
0 9 * * 1 /opt/clipper/backend/scripts/systemd/clipper-rotation-reminder.service 2>&1 | logger -t rotation-reminder
```

## Monitoring

### Check Rotation Status

```bash
# View rotation log
cat /opt/clipper/rotation-log.txt

# Check last rotation dates
grep "Database password" /opt/clipper/rotation-log.txt | tail -1
grep "JWT signing keys" /opt/clipper/rotation-log.txt | tail -1
grep "Stripe" /opt/clipper/rotation-log.txt | tail -1
```

### Verify Services After Rotation

```bash
# Check backend health
curl http://localhost:8080/api/v1/health

# Check vault-agent
docker compose logs vault-agent --tail=20

# Check backend logs
docker compose logs backend --tail=50

# Test authentication
curl -X GET http://localhost:8080/api/v1/auth/twitch
```

## Troubleshooting

### Script Fails with "Cannot connect to Vault"

```bash
# Check Vault status
vault status

# Verify VAULT_ADDR
echo $VAULT_ADDR

# Re-authenticate
vault login
```

### Backend Won't Start After Rotation

```bash
# Check vault-agent logs
docker compose logs vault-agent

# Verify rendered secrets exist
ls -lh vault/rendered/backend.env

# Restart vault-agent
docker compose restart vault-agent
sleep 5
docker compose restart backend
```

### Database Password Rotation Fails

```bash
# Check database connectivity
docker exec -it clipper-postgres psql -U clipper -d clipper_db -c "SELECT 1;"

# Verify current password in Vault
vault kv get -field=DB_PASSWORD kv/clipper/backend

# Check PostgreSQL logs
docker compose logs postgres
```

## Documentation

For detailed rotation procedures, see:

- **[Credential Rotation Runbook](../docs/operations/credential-rotation-runbook.md)** - Comprehensive rotation guide
- **[Break-Glass Emergency Procedures](../docs/operations/break-glass-procedures.md)** - Emergency access procedures
- **[Secrets Management Guide](../docs/operations/secrets-management.md)** - General secrets management
- **[Vault README](../vault/README.md)** - Vault integration details

## Support

For issues or questions:

- **Documentation:** Check the docs above
- **Logs:** `docker compose logs backend vault-agent`
- **Security Issues:** security@clipper.gg
- **Team Channel:** #infrastructure

## Security Notes

⚠️ **Important Security Practices:**

1. **Never commit secrets** to version control
2. **Always use --dry-run** first to test
3. **Backup before rotation** - rotation scripts keep old credentials temporarily
4. **Monitor after rotation** - watch logs for 24 hours
5. **Document rotations** - update rotation-log.txt
6. **Delete old credentials** - from third-party services after verification period
7. **Keep emergency backups** - encrypted offline backups for break-glass scenarios

---

**Last Updated:** 2025-12-15
**Version:** 1.0
