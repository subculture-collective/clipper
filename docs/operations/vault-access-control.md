<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Vault Access Control and Policies](#vault-access-control-and-policies)
  - [Overview](#overview)
  - [Current Access Control Structure](#current-access-control-structure)
  - [Vault Policies](#vault-policies)
    - [Backend Policy (clipper-backend.hcl)](#backend-policy-clipper-backendhcl)
    - [Frontend Policy (clipper-frontend.hcl)](#frontend-policy-clipper-frontendhcl)
    - [Admin Policy (Recommended)](#admin-policy-recommended)
    - [CI/CD Policy (Optional)](#cicd-policy-optional)
  - [AppRole Configuration](#approle-configuration)
  - [User Access Management](#user-access-management)
  - [Audit Logging](#audit-logging)
  - [Access Review Procedures](#access-review-procedures)
  - [Least Privilege Examples](#least-privilege-examples)
  - [Emergency Access](#emergency-access)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Vault Access Control and Policies"
summary: "Access control policies and procedures for HashiCorp Vault"
tags: ['operations', 'security']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-15
---

# Vault Access Control and Policies

## Overview

This document describes the access control policies implemented for HashiCorp Vault in the Clipper application. All access follows the principle of least privilege.

## Current Access Control Structure

```
Vault Root
├── kv/ (KV v2 secrets engine)
│   └── clipper/
│       ├── backend (AppRole: clipper-backend)
│       └── frontend (AppRole: clipper-frontend)
│
└── auth/
    ├── approle/ (Application authentication)
    │   ├── clipper-backend
    │   └── clipper-frontend
    └── userpass/ (Human user authentication - if enabled)
```

## Vault Policies

### Backend Policy (clipper-backend.hcl)

**Location:** `vault/policies/clipper-backend.hcl`

**Purpose:** Grants the backend application read and update access to its secrets.

```hcl
# Read and update backend secrets
path "kv/data/clipper/backend" {
  capabilities = ["read", "create", "update"]
}

# Read backend secret metadata
path "kv/metadata/clipper/backend" {
  capabilities = ["read"]
}
```

**Permissions:**
- ✅ Read backend secrets
- ✅ Update backend secrets (for automated rotation)
- ✅ Read metadata (versions, timestamps)
- ❌ Delete secrets
- ❌ Access other paths

**Used by:**
- Backend application via AppRole
- Vault-agent for secret rendering

### Frontend Policy (clipper-frontend.hcl)

**Location:** `vault/policies/clipper-frontend.hcl`

**Purpose:** Grants frontend build process read-only access to frontend secrets.

```hcl
# Read-only access to frontend secrets
path "kv/data/clipper/frontend" {
  capabilities = ["read"]
}

# Read frontend secret metadata
path "kv/metadata/clipper/frontend" {
  capabilities = ["read"]
}
```

**Permissions:**
- ✅ Read frontend secrets (Sentry credentials)
- ✅ Read metadata
- ❌ Update or delete secrets
- ❌ Access other paths

**Used by:**
- Frontend build process
- Vault-agent during frontend build

### Admin Policy (Recommended)

**Location:** Create as `vault/policies/clipper-admin.hcl`

**Purpose:** Grants administrative access for secret management and rotation.

```hcl
# Full access to clipper secrets
path "kv/data/clipper/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Full access to metadata
path "kv/metadata/clipper/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Ability to destroy secret versions
path "kv/destroy/clipper/*" {
  capabilities = ["update"]
}

# Read audit status
path "sys/audit" {
  capabilities = ["read"]
}

# Read policies
path "sys/policies/acl/*" {
  capabilities = ["read"]
}

# Read AppRole role IDs (not secret IDs)
path "auth/approle/role/*/role-id" {
  capabilities = ["read"]
}

# Generate new secret IDs for rotation
path "auth/approle/role/*/secret-id" {
  capabilities = ["create"]
}
```

**Create and apply:**
```bash
# Create policy file
cat > vault/policies/clipper-admin.hcl << 'EOF'
# ... content above ...
EOF

# Apply policy
vault policy write clipper-admin vault/policies/clipper-admin.hcl

# Create user with admin policy (if using userpass auth)
vault write auth/userpass/users/admin \
  password="<secure-password>" \
  policies="clipper-admin"
```

**Permissions:**
- ✅ Manage all Clipper secrets
- ✅ Rotate secrets
- ✅ View audit logs
- ✅ Regenerate AppRole credentials
- ❌ Cannot change root token
- ❌ Cannot modify Vault configuration

**Used by:**
- DevOps team members
- Automated rotation scripts (with separate AppRole)

### CI/CD Policy (Optional)

**Location:** Create as `vault/policies/clipper-ci-cd.hcl`

**Purpose:** Read-only access for CI/CD pipelines if integrated with Vault.

```hcl
# Read-only access to CI/CD secrets
path "kv/data/clipper/ci-cd/*" {
  capabilities = ["read"]
}

path "kv/metadata/clipper/ci-cd/*" {
  capabilities = ["read"]
}
```

## AppRole Configuration

### Backend AppRole

```bash
# Create/update backend AppRole
vault write auth/approle/role/clipper-backend \
  token_policies="clipper-backend" \
  token_ttl="24h" \
  token_max_ttl="72h" \
  secret_id_ttl="24h" \
  secret_id_num_uses=0 \
  bind_secret_id=true

# Get role_id (semi-static identifier)
vault read -field=role_id auth/approle/role/clipper-backend/role-id

# Generate secret_id (rotated regularly)
vault write -field=secret_id -f auth/approle/role/clipper-backend/secret-id
```

**Settings:**
- `token_ttl`: 24 hours - tokens expire daily
- `token_max_ttl`: 72 hours - maximum token lifetime
- `secret_id_ttl`: 24 hours - secret_id expires daily (auto-renewal by vault-agent)
- `secret_id_num_uses`: 0 - unlimited uses (recommended for continuous operation)
- `bind_secret_id`: true - requires both role_id and secret_id

### Frontend AppRole

```bash
# Create/update frontend AppRole
vault write auth/approle/role/clipper-frontend \
  token_policies="clipper-frontend" \
  token_ttl="1h" \
  token_max_ttl="2h" \
  secret_id_ttl="24h" \
  secret_id_num_uses=10

# Get credentials
vault read -field=role_id auth/approle/role/clipper-frontend/role-id
vault write -field=secret_id -f auth/approle/role/clipper-frontend/secret-id
```

**Settings:**
- `token_ttl`: 1 hour - short-lived for build process
- `secret_id_num_uses`: 10 - limited uses for build only

## User Access Management

### For Human Users (Optional - UserPass Auth)

If you want to give team members Vault access:

```bash
# Enable userpass auth (if not already enabled)
vault auth enable userpass

# Create admin user
vault write auth/userpass/users/alice \
  password="<secure-password>" \
  policies="clipper-admin"

# Create read-only user
vault write auth/userpass/users/bob \
  password="<secure-password>" \
  policies="clipper-backend"

# User login
vault login -method=userpass username=alice
```

### Using Root Token (Not Recommended for Regular Use)

```bash
# Root token should only be used for:
# 1. Initial setup
# 2. Emergency recovery
# 3. Policy management

# Store root token securely offline
# Create admin users instead for day-to-day management
```

## Audit Logging

### Enable Audit Logging

```bash
# Enable file-based audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Verify audit is enabled
vault audit list

# View recent audit entries
docker exec clipper-vault tail -n 100 /vault/logs/audit.log
```

### Audit Log Contents

Each audit entry includes:
- **Time:** Timestamp of operation
- **Type:** request or response
- **Auth:** Authentication method and identity
- **Path:** Vault path accessed
- **Operation:** read, create, update, delete, list
- **Result:** Success or failure
- **Metadata:** Client IP, additional context

### Reviewing Audit Logs

```bash
# Search for unauthorized access attempts
cat /vault/logs/audit.log | jq 'select(.error != null)'

# View who accessed specific secret
cat /vault/logs/audit.log | jq 'select(.request.path == "kv/data/clipper/backend")'

# List all users who authenticated today
cat /vault/logs/audit.log | \
  jq -r 'select(.time > "'$(date -u +%Y-%m-%d)'") | select(.request.operation == "update" and .request.path == "auth/userpass/login/.*") | .auth.display_name' | \
  sort -u
```

## Access Review Procedures

### Monthly Access Review

```bash
# List all policies
vault policy list

# Review policy contents
vault policy read clipper-backend
vault policy read clipper-frontend
vault policy read clipper-admin

# List all AppRoles
vault list auth/approle/role

# Review AppRole configuration
vault read auth/approle/role/clipper-backend
vault read auth/approle/role/clipper-frontend

# List all userpass users (if enabled)
vault list auth/userpass/users
```

### Quarterly Security Audit

1. **Review all policies:**
   - Ensure policies follow least privilege
   - Remove unused policies
   - Update policies for new requirements

2. **Review all users and AppRoles:**
   - Remove access for departed team members
   - Audit AppRole secret_id usage
   - Rotate all AppRole credentials

3. **Review audit logs:**
   - Check for unauthorized access attempts
   - Identify unusual access patterns
   - Verify all accesses are legitimate

4. **Test access controls:**
   - Attempt to access secrets with wrong credentials
   - Verify denials are logged
   - Test that deleted users cannot access

## Least Privilege Examples

### ✅ Good: Separate Policies for Each Service

```hcl
# backend-db.hcl - only DB secrets
path "kv/data/clipper/backend/database" {
  capabilities = ["read"]
}

# backend-api.hcl - only API keys
path "kv/data/clipper/backend/api-keys" {
  capabilities = ["read"]
}
```

### ❌ Bad: Single Policy with Full Access

```hcl
# DON'T DO THIS
path "kv/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
```

### ✅ Good: Read-Only for Most Services

```hcl
# Service only needs to read secrets
path "kv/data/clipper/backend" {
  capabilities = ["read"]
}
```

### ✅ Good: Time-Limited Tokens

```bash
# Short TTL for high-privilege operations
vault write auth/approle/role/rotation-script \
  token_policies="clipper-admin" \
  token_ttl="10m" \
  token_max_ttl="30m"
```

## Emergency Access

### Break-Glass Root Token Generation

If all admin users are locked out:

```bash
# Requires 3 of 5 unseal keys (stored securely offline)
vault operator generate-root -init
vault operator generate-root -nonce=<nonce> <unseal_key_1>
vault operator generate-root -nonce=<nonce> <unseal_key_2>
vault operator generate-root -nonce=<nonce> <unseal_key_3>

# Decode root token
vault operator generate-root -decode=<encoded_token> -otp=<otp>
```

**Important:**
- Use root token only for recovery
- Create new admin user immediately
- Revoke root token after use
- Document the incident

### Revoking Compromised Access

```bash
# Revoke specific token
vault token revoke <token>

# Revoke all tokens for a user
vault token revoke -mode path auth/userpass/login/alice

# Revoke all tokens for an AppRole
vault token revoke -mode path auth/approle/login

# Regenerate AppRole secret_id
vault write -f auth/approle/role/clipper-backend/secret-id > vault/approle/secret_id
```

---

**Key Principles:**

1. ✅ **Least Privilege:** Grant only necessary permissions
2. ✅ **Separation of Duties:** Different roles for different services
3. ✅ **Time-Limited Access:** Short-lived tokens where possible
4. ✅ **Audit Everything:** Enable and review audit logs
5. ✅ **Regular Reviews:** Monthly access reviews, quarterly audits
6. ✅ **Emergency Procedures:** Document and test break-glass procedures

**References:**
- [Vault Policies Documentation](https://www.vaultproject.io/docs/concepts/policies)
- [AppRole Auth Method](https://www.vaultproject.io/docs/auth/approle)
- [Vault Audit Devices](https://www.vaultproject.io/docs/audit)
