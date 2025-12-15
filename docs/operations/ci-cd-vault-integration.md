<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [CI/CD Integration with Vault](#cicd-integration-with-vault)
  - [Overview](#overview)
  - [Current State vs. Target State](#current-state-vs-target-state)
  - [GitHub Actions Integration](#github-actions-integration)
    - [Option 1: Vault Agent in Deployment Pipeline](#option-1-vault-agent-in-deployment-pipeline)
    - [Option 2: GitHub OIDC with Vault](#option-2-github-oidc-with-vault)
    - [Option 3: Continue Using GitHub Secrets (Recommended for Now)](#option-3-continue-using-github-secrets-recommended-for-now)
  - [Deployment Workflow Updates](#deployment-workflow-updates)
    - [Production Deployment](#production-deployment)
    - [Staging Deployment](#staging-deployment)
  - [Secrets Synchronization](#secrets-synchronization)
  - [Migration Plan](#migration-plan)
  - [Security Considerations](#security-considerations)
  - [Troubleshooting](#troubleshooting)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "CI/CD Integration with Vault"
summary: "Guide for integrating HashiCorp Vault with CI/CD pipelines"
tags: ['operations', 'ci-cd']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-15
---

# CI/CD Integration with Vault

## Overview

This document describes how the Clipper CI/CD pipeline integrates with HashiCorp Vault for secrets management. The goal is to ensure all deployment secrets are centrally managed and automatically rotated.

## Current State vs. Target State

### Current State (Hybrid Approach)

- **Production/Staging Runtime:** Secrets are fetched from Vault via vault-agent
- **CI/CD Pipeline:** Uses GitHub Actions secrets for deployment credentials
- **Build-time Secrets:** Frontend uses vault for Sentry credentials via build script

### Target State (Fully Vault-Integrated)

- **Production/Staging Runtime:** ✅ Already using Vault
- **CI/CD Pipeline:** Could use Vault via OIDC (future enhancement)
- **Build-time Secrets:** ✅ Already using Vault for frontend builds
- **Deployment Secrets:** Use Vault for SSH keys and deployment credentials (optional)

## GitHub Actions Integration

There are three approaches to integrate Vault with GitHub Actions:

### Option 1: Vault Agent in Deployment Pipeline

**How it works:**
- Deploy workflow authenticates to Vault using AppRole
- Fetches secrets during deployment
- Injects secrets into deployment process

**Pros:**
- Full Vault integration
- Centralized secret management
- Automatic rotation support

**Cons:**
- More complex deployment workflow
- Requires Vault AppRole for CI/CD
- Network dependency on Vault during deployment

**Example Workflow:**
```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Vault CLI
        run: |
          wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
          echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
          sudo apt-get update && sudo apt-get install vault
      
      - name: Authenticate to Vault
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
          VAULT_ROLE_ID: ${{ secrets.VAULT_ROLE_ID }}
          VAULT_SECRET_ID: ${{ secrets.VAULT_SECRET_ID }}
        run: |
          vault write auth/approle/login \
            role_id=$VAULT_ROLE_ID \
            secret_id=$VAULT_SECRET_ID > /tmp/vault-token.json
          echo "VAULT_TOKEN=$(jq -r .auth.client_token /tmp/vault-token.json)" >> $GITHUB_ENV
      
      - name: Fetch SSH Key from Vault
        run: |
          vault kv get -field=ssh_private_key kv/clipper/ci-cd > /tmp/deploy_key
          chmod 600 /tmp/deploy_key
      
      - name: Deploy to Production
        run: |
          ssh -i /tmp/deploy_key deploy@production-server \
            "cd /opt/clipper && git pull && docker compose up -d"
```

### Option 2: GitHub OIDC with Vault

**How it works:**
- GitHub Actions uses OIDC to authenticate to Vault
- No long-lived credentials needed
- Dynamic, short-lived tokens

**Pros:**
- No static credentials in GitHub
- More secure authentication
- Automatic token expiration

**Cons:**
- Requires Vault Enterprise or Vault 1.9+ with JWT auth
- More complex initial setup
- Requires OIDC configuration in Vault

**Setup Steps:**

1. **Enable JWT auth in Vault:**
   ```bash
   vault auth enable jwt
   
   vault write auth/jwt/config \
     bound_issuer="https://token.actions.githubusercontent.com" \
     oidc_discovery_url="https://token.actions.githubusercontent.com"
   ```

2. **Create Vault role for GitHub Actions:**
   ```bash
   vault write auth/jwt/role/clipper-ci \
     role_type="jwt" \
     bound_audiences="https://github.com/subculture-collective" \
     bound_claims='{"repository":"subculture-collective/clipper"}' \
     user_claim="repository" \
     token_policies="clipper-ci" \
     token_ttl="10m"
   ```

3. **Update workflow:**
   ```yaml
   - name: Get Vault Token via OIDC
     uses: hashicorp/vault-action@v2
     with:
       url: https://vault.subcult.tv
       method: jwt
       path: jwt
       role: clipper-ci
       secrets: |
         kv/data/clipper/ci-cd ssh_private_key | DEPLOY_KEY
   ```

### Option 3: Continue Using GitHub Secrets (Recommended for Now)

**How it works:**
- Keep deployment credentials in GitHub Secrets
- Use Vault only for runtime secrets on servers
- Manually rotate GitHub secrets when Vault secrets are rotated

**Pros:**
- Simple and proven approach
- No additional dependencies
- Works with current setup

**Cons:**
- Secrets exist in two places (GitHub + Vault)
- Manual synchronization needed
- Less automated rotation

**Recommendation:**
This is the recommended approach for now because:
1. Production/staging already use Vault for runtime secrets
2. Deployment only needs SSH keys, which are less frequently rotated
3. Simpler to maintain and troubleshoot
4. GitHub Secrets are already encrypted and secure

## Deployment Workflow Updates

### Production Deployment

Current `deploy-production.yml` uses GitHub Secrets for SSH access. This is acceptable because:

1. **Deployment secrets are different from runtime secrets:**
   - SSH keys for deployment (stored in GitHub Secrets)
   - Application secrets (stored in Vault, fetched at runtime)

2. **Rotation strategy:**
   - SSH keys rotated less frequently (every 180-365 days)
   - Application secrets rotated more frequently (30-180 days)

**No changes needed to existing deployment workflows.**

### Staging Deployment

Same approach as production - continue using GitHub Secrets for deployment credentials.

## Secrets Synchronization

When rotating secrets in Vault that might be needed in CI/CD:

### 1. Deployment SSH Keys

If SSH keys are rotated:

```bash
# Generate new SSH key pair
ssh-keygen -t ed25519 -f /tmp/clipper-deploy -N "" -C "github-actions-deploy"

# Add public key to server
ssh-copy-id -i /tmp/clipper-deploy.pub deploy@production-server

# Update GitHub Secret
gh secret set DEPLOY_SSH_KEY < /tmp/clipper-deploy

# Test deployment
git push origin main

# Remove old public key from server after verification
```

### 2. Sentry Tokens (Frontend Build)

Frontend builds already use Vault via the build script:

```bash
# Frontend build script authenticates to Vault
cd frontend
./scripts/build-with-vault.sh
```

**No synchronization needed** - build script fetches directly from Vault.

### 3. Other CI/CD Secrets

For secrets that must be in both places:

```bash
# Get secret from Vault
SECRET_VALUE=$(vault kv get -field=KEY_NAME kv/clipper/backend)

# Update GitHub Secret
gh secret set SECRET_NAME --body "$SECRET_VALUE"

# Or via GitHub UI: Settings → Secrets and variables → Actions
```

## Migration Plan

If you decide to fully migrate to Vault for CI/CD:

### Phase 1: Audit Current Secrets

```bash
# List all GitHub Secrets
gh secret list

# Compare with Vault secrets
vault kv list kv/clipper/
```

### Phase 2: Create CI/CD AppRole

```bash
# Create policy for CI/CD
vault policy write clipper-ci-cd - <<EOF
path "kv/data/clipper/ci-cd/*" {
  capabilities = ["read"]
}
EOF

# Create AppRole
vault write auth/approle/role/clipper-ci-cd \
  token_policies="clipper-ci-cd" \
  token_ttl="10m" \
  token_max_ttl="30m" \
  secret_id_ttl="0" \
  secret_id_num_uses=0

# Get credentials
vault read -field=role_id auth/approle/role/clipper-ci-cd/role-id
vault write -field=secret_id -f auth/approle/role/clipper-ci-cd/secret-id
```

### Phase 3: Update Workflows

Update each deployment workflow to:
1. Install Vault CLI
2. Authenticate with AppRole
3. Fetch secrets from Vault
4. Use secrets in deployment

### Phase 4: Migrate Secrets

```bash
# Move each secret to Vault
vault kv put kv/clipper/ci-cd/production \
  ssh_private_key="$(cat ~/.ssh/deploy_key)" \
  ssh_known_hosts="$(cat ~/.ssh/known_hosts)"
```

### Phase 5: Test and Verify

1. Test deployment workflows
2. Verify secret rotation works
3. Document new procedures
4. Train team on new process

### Phase 6: Remove GitHub Secrets

After verification:
```bash
# Remove old GitHub Secrets (keep backups!)
gh secret delete SECRET_NAME
```

## Security Considerations

### Current Security Posture

✅ **Good:**
- Runtime secrets managed in Vault
- Vault AppRole authentication
- Secrets rotated on schedule
- No secrets in version control

⚠️ **Acceptable:**
- Deployment SSH keys in GitHub Secrets
- Manual synchronization needed
- GitHub Secrets are encrypted at rest and in transit

### Best Practices

1. **Principle of Least Privilege:**
   - CI/CD AppRole has read-only access
   - Separate policies for different environments
   - Time-limited tokens

2. **Secret Rotation:**
   - Rotate deployment SSH keys annually
   - Rotate Vault AppRole credentials quarterly
   - Monitor for unauthorized access

3. **Audit Logging:**
   - Enable Vault audit logging
   - Monitor GitHub Actions logs
   - Alert on failed authentications

4. **Backup and Recovery:**
   - Keep encrypted backups of deployment keys
   - Document recovery procedures
   - Test disaster recovery regularly

## Troubleshooting

### Deployment Fails with SSH Error

```bash
# Test SSH access manually
ssh -i ~/.ssh/deploy_key deploy@production-server

# Check SSH key in GitHub Secret
gh secret list | grep DEPLOY_SSH_KEY

# Verify public key on server
cat ~/.ssh/authorized_keys | grep github-actions
```

### Vault Authentication Fails in CI/CD

```bash
# Test Vault connectivity
curl -k https://vault.subcult.tv/v1/sys/health

# Test AppRole authentication
vault write auth/approle/login \
  role_id=$ROLE_ID \
  secret_id=$SECRET_ID

# Check AppRole policy
vault read auth/approle/role/clipper-ci-cd
```

### Secrets Out of Sync

```bash
# Compare secrets
echo "Vault DB_PASSWORD: $(vault kv get -field=DB_PASSWORD kv/clipper/backend | cut -c1-4)..."
echo "GitHub Secret: Check in Settings → Secrets"

# Sync if needed
vault kv get -field=KEY kv/clipper/backend | gh secret set KEY --body -
```

---

## Summary

**Current Recommended Approach:**

1. ✅ Keep using Vault for runtime secrets (backend, frontend)
2. ✅ Keep using GitHub Secrets for deployment SSH keys
3. ✅ Rotate both according to schedule
4. ✅ Document synchronization procedures

**Future Enhancement (Optional):**

Consider migrating to full Vault integration via OIDC if:
- Team is comfortable with the complexity
- Want fully automated secret rotation in CI/CD
- Need to eliminate GitHub Secrets entirely

**References:**
- [Vault GitHub Actions Integration](https://www.vaultproject.io/docs/platform/github-actions)
- [GitHub OIDC with Vault](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-hashicorp-vault)
- [HashiCorp Vault Action](https://github.com/hashicorp/vault-action)
