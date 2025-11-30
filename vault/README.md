# Vault Integration for Clipper Backend

This directory contains the files required to fetch runtime secrets for the Clipper backend from
HashiCorp Vault.

## Layout

- `config/clipper-backend-agent.hcl` – Vault agent configuration (AppRole auth + template rendering).
- `templates/backend.env.ctmpl` – Consul-template file that renders the environment variables consumed by the backend.
- `rendered/` – Output directory for the processed `backend.env` file (ignored by git).
- `approle/` – Placeholders for the AppRole `role_id` and `secret_id` files (ignored by git).
- `policies/clipper-backend.hcl` – Vault policy granting the backend read-only access to `kv/clipper/backend`.

## Bootstrapping Steps

1. **Initialize and unseal Vault** (if you haven't already) and set `VAULT_ADDR=https://vault.subcult.tv` on the machine that
   runs the commands below.
2. **Enable KV v2** (run once):

   ```bash
   vault secrets enable -path=kv kv-v2
   ```

3. **Write the backend secret data** (replace the placeholder values with the real ones):

   ```bash
   vault kv put kv/clipper/backend \
     PORT=8080 \
     GIN_MODE=release \
     ENVIRONMENT=production \
     BASE_URL=https://clpr.tv \
     LOG_LEVEL=info \
     DB_HOST=postgres \
     DB_PORT=5432 \
     DB_USER=clipper \
     DB_PASSWORD='changeme' \
     DB_NAME=clipper_db \
     DB_SSLMODE=disable \
     REDIS_HOST=redis \
     REDIS_PORT=6379 \
     REDIS_PASSWORD='' \
     REDIS_DB=0 \
     TWITCH_CLIENT_ID='...' \
     TWITCH_CLIENT_SECRET='...' \
     TWITCH_REDIRECT_URI=https://clpr.tv/api/v1/auth/twitch/callback \
     CORS_ALLOWED_ORIGINS=https://clpr.tv \
     OPENSEARCH_URL=http://opensearch:9200 \
     OPENSEARCH_INSECURE_SKIP_VERIFY=false
   ```

4. **Create the policy**:

   ```bash
   vault policy write clipper-backend vault/policies/clipper-backend.hcl
   ```

5. **Create the AppRole** (run once):

   ```bash
   vault write auth/approle/role/clipper-backend \
     token_policies="clipper-backend" \
     token_ttl="24h" \
     token_max_ttl="72h" \
     secret_id_ttl="24h" \
     secret_id_num_uses=0
   ```

6. **Capture AppRole credentials** and place them in `vault/approle/`:

   ```bash
   vault read -field=role_id auth/approle/role/clipper-backend/role-id > vault/approle/role_id
   vault write -field=secret_id -f auth/approle/role/clipper-backend/secret-id > vault/approle/secret_id
   ```

   > Treat `role_id` and `secret_id` like passwords. The directory is git-ignored by default.

7. **(Optional) Rotate secrets** by re-running step 6 whenever you want to mint a new `secret_id`.

Once the files exist, `docker compose` (or the `clipper-prod` systemd unit) will start the `clipper-vault-agent`
sidecar, which writes `vault/rendered/backend.env`. The backend container waits for that file, sources it, and then
starts the API process with the injected configuration.

## Expected Keys

The secret at `kv/clipper/backend` mirrors every variable in `backend/.env.example` (plus a few infrastructure
helpers like `POSTGRES_PASSWORD`). The rendered template now includes:

- Core service settings (`PORT`, `BASE_URL`, `ENVIRONMENT`, etc.)
- Database/Redis credentials (`DB_*`, `REDIS_*`, `POSTGRES_PASSWORD`)
- JWT key pair placeholders (`JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`)
- Twitch, Stripe, Sentry, SendGrid, and OpenAI credentials
- Feature flags and scheduler knobs (`FEATURE_*`, `HOT_CLIPS_*`, `WEBHOOK_*`, etc.)

Run the following to review what is currently stored:

```bash
export VAULT_ADDR=https://vault.subcult.tv
vault login
vault kv get kv/clipper/backend
```

To update individual values, use `vault kv patch kv/clipper/backend KEY=value`. For example:

```bash
vault kv patch kv/clipper/backend \
   STRIPE_SECRET_KEY="sk_live_xxx" \
   STRIPE_WEBHOOK_SECRET="whsec_primary" \
   STRIPE_WEBHOOK_SECRET_ALT="whsec_secondary" \
   STRIPE_WEBHOOK_SECRETS="whsec_old1,whsec_old2" \
   SENTRY_DSN="https://example@o123.ingest.sentry.io/456"
```

Vault is now the only source of truth for backend secrets—do **not** maintain production `.env` files anymore.
