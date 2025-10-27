# CI/CD Secrets Setup Guide

This document outlines all the secrets required for CI/CD pipelines and how to configure them.

## Overview

The Clipper project uses GitHub Actions for CI/CD with encrypted secrets. This guide helps repository administrators set up and manage these secrets securely.

## Required Secrets

### Repository Secrets (Settings → Secrets and variables → Actions)

Configure the following secrets in your GitHub repository:

#### Code Coverage & Quality

| Secret Name | Description | Required For | How to Get |
|------------|-------------|--------------|------------|
| `CODECOV_TOKEN` | Token for uploading code coverage reports to Codecov | CI workflow | 1. Sign in to [Codecov](https://codecov.io/)<br>2. Add repository<br>3. Copy upload token from Settings |

#### Deployment

| Secret Name | Description | Required For | How to Get |
|------------|-------------|--------------|------------|
| `STAGING_HOST` | Hostname of staging server | Staging deployments | Your staging server's hostname (e.g., `staging.clipper.example.com`) |
| `PRODUCTION_HOST` | Hostname of production server | Production deployments | Your production server's hostname (e.g., `clipper.example.com`) |
| `DEPLOY_SSH_KEY` | Private SSH key for deployment access | Staging & Production deployments | Generate with: `ssh-keygen -t ed25519 -C "github-actions-deploy"`<br>Add public key to server's `~/.ssh/authorized_keys` |

#### Monitoring (Optional)

| Secret Name | Description | Required For | How to Get |
|------------|-------------|--------------|------------|
| `SENTRY_AUTH_TOKEN` | Sentry API token for sourcemap uploads | Frontend production builds | 1. Go to [Sentry Settings](https://sentry.io/settings/)<br>2. Auth Tokens → New Token<br>3. Scopes: `project:releases`, `org:read`<br>4. Copy token |
| `SENTRY_ORG` | Sentry organization slug | Frontend production builds | Found in Sentry URL: `sentry.io/organizations/{org-slug}/` |
| `SENTRY_PROJECT` | Sentry project slug | Frontend production builds | Found in Sentry project settings |

#### Secrets Scanning (Optional)

| Secret Name | Description | Required For | How to Get |
|------------|-------------|--------------|------------|
| `GITLEAKS_LICENSE` | Gitleaks Pro license key (optional) | Enhanced secrets scanning | Purchase from [Gitleaks](https://gitleaks.io/) (optional, OSS version works without) |

## Environment Secrets

For environment-specific secrets (staging/production), use GitHub Environment Secrets:

1. Go to **Settings → Environments**
2. Create/edit `staging` or `production` environment
3. Add environment-specific secrets

### Staging Environment Secrets

Create a `staging` environment with these secrets:

- `STAGING_HOST`: Staging server hostname
- Any other staging-specific credentials

### Production Environment Secrets

Create a `production` environment with these secrets:

- `PRODUCTION_HOST`: Production server hostname
- Any other production-specific credentials

**Recommended:** Enable protection rules for production:
- Require approval before deployment
- Limit to protected branches only (`main` branch)

## Setting Up Secrets

### Via GitHub Web Interface

1. Navigate to repository on GitHub
2. Go to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Enter secret name and value
5. Click **Add secret**

### Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Add a secret
gh secret set CODECOV_TOKEN --body "your-token-here"

# Add secret from file
gh secret set DEPLOY_SSH_KEY < ~/.ssh/github_actions_deploy

# Add secret from stdin
echo "your-token" | gh secret set SENTRY_AUTH_TOKEN

# List all secrets
gh secret list
```

## Generating Secrets

### SSH Keys for Deployment

```bash
# Generate a new SSH key pair
ssh-keygen -t ed25519 -C "github-actions-deploy" -f github_actions_deploy

# Copy public key to clipboard (macOS)
pbcopy < github_actions_deploy.pub

# Copy public key to clipboard (Linux)
xclip -selection clipboard < github_actions_deploy.pub

# Add public key to server
ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys" < github_actions_deploy.pub

# Add private key to GitHub secrets
gh secret set DEPLOY_SSH_KEY < github_actions_deploy

# Remove local keys for security
rm github_actions_deploy github_actions_deploy.pub
```

### Sentry Auth Token

```bash
# 1. Go to https://sentry.io/settings/account/api/auth-tokens/
# 2. Click "Create New Token"
# 3. Name: "GitHub Actions - Clipper"
# 4. Scopes:
#    - project:releases
#    - project:write
#    - org:read
# 5. Click "Create Token"
# 6. Copy the token immediately (it won't be shown again)

# Add to GitHub
gh secret set SENTRY_AUTH_TOKEN
# Paste the token when prompted
```

## Verification

### Test CI Workflows

After setting up secrets, verify they work:

```bash
# Trigger CI workflow manually
gh workflow run ci.yml

# Check workflow status
gh run list --workflow=ci.yml

# View workflow logs
gh run view --log
```

### Test Deployment Workflows

```bash
# Test staging deployment (requires staging environment setup)
gh workflow run deploy-staging.yml

# Test production deployment (requires production environment setup and approval)
gh workflow run deploy-production.yml
```

## Secret Rotation

Regular rotation of secrets is critical for security. See [SECRETS_MANAGEMENT.md](./SECRETS_MANAGEMENT.md) for detailed rotation procedures.

### Rotation Schedule

| Secret | Rotation Frequency | Next Review |
|--------|-------------------|-------------|
| Deploy SSH Keys | Every 90 days | Check deploy logs |
| Sentry Auth Token | Annually or on team changes | Annual review |
| Codecov Token | On compromise only | Monitor for leaks |

### How to Rotate Secrets

1. **Generate new secret** (using methods above)
2. **Add new secret to GitHub** with same name (overwrites old value)
3. **Test in staging** if applicable
4. **Verify CI/CD pipelines** work with new secret
5. **Revoke old secret** at the source (e.g., delete old SSH key from servers)
6. **Document rotation** in your security log

## Security Best Practices

### ✅ Do's

- **Use GitHub's encrypted secrets** for all sensitive data
- **Rotate secrets regularly** (every 90 days minimum)
- **Use environment-specific secrets** for staging/production
- **Enable environment protection rules** for production
- **Audit secret access** regularly in workflow logs
- **Use least-privilege principle** (only grant necessary scopes)
- **Document all secrets** and their purpose
- **Test secret rotation** in staging first

### ❌ Don'ts

- **Never commit secrets** to version control
- **Never print secrets** in workflow logs
- **Never use production secrets** in staging/development
- **Never share secrets** via insecure channels (email, Slack, etc.)
- **Never reuse secrets** across different services
- **Never store secrets** in workflow files or code

## Secret Masking in Workflows

GitHub Actions automatically masks secrets registered in the repository. For additional protection:

```yaml
# Mask additional sensitive values in logs
- name: Run command with sensitive data
  run: |
    # Mask the value
    echo "::add-mask::$SENSITIVE_VALUE"
    
    # Now use it safely
    command --secret "$SENSITIVE_VALUE"
```

Examples in our workflows:

```yaml
# Mask database connection strings
- name: Run integration tests
  env:
    TEST_DATABASE_URL: postgresql://user:pass@localhost:5432/db
  run: |
    echo "::add-mask::$TEST_DATABASE_URL"
    go test -v ./...
```

## Troubleshooting

### Secret Not Available in Workflow

**Problem**: Workflow fails with "secret not found"

**Solutions**:
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is set at repository level, not user level
3. For environment secrets, ensure environment name matches
4. Verify workflow has required permissions

### Deployment Fails with SSH Error

**Problem**: Deployment fails with "Permission denied (publickey)"

**Solutions**:
1. Verify public key is added to server's `~/.ssh/authorized_keys`
2. Check private key is correctly added to GitHub secret
3. Ensure key format is correct (no extra spaces/newlines)
4. Test SSH connection manually: `ssh -i key user@host`

### Codecov Upload Fails

**Problem**: Coverage upload fails with "invalid token"

**Solutions**:
1. Verify token is correctly copied from Codecov dashboard
2. Check token hasn't expired
3. Ensure repository is added in Codecov
4. Verify `CODECOV_TOKEN` secret is set in GitHub

### Sentry Sourcemap Upload Fails

**Problem**: Sentry sourcemap upload fails

**Solutions**:
1. Verify all three secrets are set: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
2. Check token has required scopes: `project:releases`, `org:read`
3. Verify organization and project slugs are correct
4. Ensure Sentry project exists and is accessible

## Monitoring & Auditing

### View Secret Usage

```bash
# View recent workflow runs
gh run list --limit 10

# Check workflow logs for secret-related issues
gh run view <run-id> --log | grep -i secret

# List all configured secrets (names only, not values)
gh secret list
```

### Audit Secret Access

1. Go to **Settings → Actions → General**
2. Scroll to **Audit log**
3. Filter by "secrets" actions
4. Review who accessed/modified secrets and when

### Set Up Alerts

Configure GitHub notifications for security events:

1. Go to **Settings → Notifications**
2. Enable **Security alerts**
3. Set up email/Slack notifications via webhooks

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Clipper Secrets Management Guide](./SECRETS_MANAGEMENT.md)
- [Clipper Deployment Guide](./DEPLOYMENT.md)
- [Clipper Runbook](./RUNBOOK.md)

## Support

For security concerns or help with secrets setup:

- **Security Issues**: Report via [Security Advisory](https://github.com/subculture-collective/clipper/security/advisories/new)
- **Setup Help**: Open an issue with `ci/cd` label
- **Emergency**: See [RUNBOOK.md](./RUNBOOK.md) for incident response procedures
