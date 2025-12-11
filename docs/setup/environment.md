---
title: "Environment Variables"
summary: "Complete canonical reference for all environment variables across backend, frontend, and mobile services."
tags: ["setup", "environment", "configuration", "envvar"]
area: "setup"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
aliases: ["env vars", "config", "environment setup"]
---

# Environment Variables Reference

**This is the canonical documentation for all Clipper environment variables.** All services reference this single source of truth.

## Environment Files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env

# Mobile
cp mobile/.env.example mobile/.env
```

## Backend Environment Variables

Component:: backend-api
Required For:: All backend operations

| Variable | Required | Default | Description | Used By | Example |
|----------|----------|---------|-------------|---------|---------|
| `SERVER_PORT` | Yes | `8080` | HTTP server port | API Server | `8080` |
| `POSTGRES_URL` | Yes | - | PostgreSQL connection string | Database | `postgresql://user:pass@localhost:5432/clipper` |
| `REDIS_URL` | Yes | - | Redis connection string | Cache, Sessions | `redis://localhost:6379` |
| `OPENSEARCH_URL` | Yes | - | OpenSearch endpoint | Search Engine | `http://localhost:9200` |
| `OPENSEARCH_INSECURE_SKIP_VERIFY` | No | `false` | Skip TLS verification (dev only) | Search Engine | `true` (dev), `false` (prod) |
| `JWT_SECRET` | Yes | - | JWT signing secret | Authentication | `your-secret-key-min-32-chars` |
| `JWT_EXPIRY` | No | `24h` | JWT token expiry duration | Authentication | `24h`, `7d` |
| `TWITCH_CLIENT_ID` | Yes | - | Twitch OAuth app client ID | OAuth | From Twitch Dev Console |
| `TWITCH_SECRET` | Yes | - | Twitch OAuth app secret | OAuth | From Twitch Dev Console |
| `TWITCH_REDIRECT_URL` | Yes | - | OAuth callback URL | OAuth | `http://localhost:5173/auth/callback` |
| `CORS_ORIGINS` | No | `*` | Allowed CORS origins (comma-separated) | CORS Middleware | `http://localhost:5173,https://app.clpr.tv` |
| `RATE_LIMIT_ENABLED` | No | `true` | Enable rate limiting | Rate Limiter | `true`, `false` |
| `LOG_LEVEL` | No | `info` | Logging level | Logger | `debug`, `info`, `warn`, `error` |
| `STRIPE_SECRET_KEY` | No | - | Stripe API secret key | Premium Features | From Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | No | - | Stripe webhook endpoint secret | Webhook Handler | From Stripe Dashboard |
| `EMBEDDING_API_KEY` | No | - | OpenAI/embedding service API key | Semantic Search | From provider |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | Embedding model to use | Semantic Search | `text-embedding-3-small` |
| `ADMIN_EMAIL` | No | - | Admin notification email | Email Service | `admin@example.com` |
| `SMTP_HOST` | No | - | SMTP server hostname | Email Service | `smtp.sendgrid.net` |
| `SMTP_PORT` | No | `587` | SMTP server port | Email Service | `587` |
| `SMTP_USER` | No | - | SMTP username | Email Service | `apikey` |
| `SMTP_PASSWORD` | No | - | SMTP password | Email Service | From email provider |

## Frontend Environment Variables

Component:: frontend-web
Required For:: Web application

| Variable | Required | Default | Description | Used By | Example |
|----------|----------|---------|-------------|---------|---------|
| `VITE_API_BASE` | Yes | - | Backend API base URL | API Client | `http://localhost:8080/api/v1` |
| `VITE_TWITCH_CLIENT_ID` | Yes | - | Twitch OAuth client ID | OAuth Flow | From Twitch Dev Console |
| `VITE_OAUTH_REDIRECT_URI` | Yes | - | OAuth redirect URI | OAuth Flow | `http://localhost:5173/auth/callback` |
| `VITE_FEATURE_FLAGS` | No | `local` | Feature flag environment | Feature Toggles | `local`, `staging`, `production` |
| `VITE_ANALYTICS_ENABLED` | No | `false` | Enable analytics tracking | Analytics | `true`, `false` |
| `VITE_SENTRY_DSN` | No | - | Sentry error tracking DSN | Error Tracking | From Sentry Dashboard |
| `VITE_APP_VERSION` | No | - | Application version | Info Display | `1.0.0` |

## Mobile Environment Variables

Component:: mobile-app
Required For:: iOS and Android apps

| Variable | Required | Default | Description | Used By | Example |
|----------|----------|---------|-------------|---------|---------|
| `EXPO_PUBLIC_API_BASE` | Yes | - | Backend API base URL | API Client | `http://localhost:8080/api/v1` |
| `EXPO_PUBLIC_TWITCH_CLIENT_ID` | Yes | - | Twitch OAuth client ID | OAuth Flow | From Twitch Dev Console |
| `EXPO_PUBLIC_OAUTH_REDIRECT_URI` | Yes | - | OAuth redirect URI | OAuth Flow | `clipper://auth/callback` |
| `EXPO_PUBLIC_FEATURE_FLAGS` | No | `local` | Feature flag environment | Feature Toggles | `local`, `staging`, `production` |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | No | `false` | Enable analytics tracking | Analytics | `true`, `false` |
| `EXPO_PUBLIC_SENTRY_DSN` | No | - | Sentry error tracking DSN | Error Tracking | From Sentry Dashboard |
| `EXPO_PUBLIC_APP_VERSION` | No | - | Application version | Info Display | `1.0.0` |

## Environment-Specific Configuration

### Development

```bash
# Backend (backend/.env)
SERVER_PORT=8080
POSTGRES_URL=postgresql://clipper:clipper_password@localhost:5432/clipper_db?sslmode=disable
REDIS_URL=redis://localhost:6379
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_INSECURE_SKIP_VERIFY=true
JWT_SECRET=dev-secret-at-least-32-characters-long
LOG_LEVEL=debug

# Frontend (frontend/.env)
VITE_API_BASE=http://localhost:8080/api/v1
VITE_FEATURE_FLAGS=local

# Mobile (mobile/.env)
EXPO_PUBLIC_API_BASE=http://10.0.2.2:8080/api/v1  # Android emulator
EXPO_PUBLIC_FEATURE_FLAGS=local
```

### Staging

```bash
# Backend
SERVER_PORT=8080
POSTGRES_URL=postgresql://[managed-secret]
REDIS_URL=redis://[managed-secret]
OPENSEARCH_URL=https://search.staging.clpr.tv
OPENSEARCH_INSECURE_SKIP_VERIFY=false
JWT_SECRET=[managed-secret]
LOG_LEVEL=info
CORS_ORIGINS=https://staging.clpr.tv
RATE_LIMIT_ENABLED=true

# Frontend
VITE_API_BASE=https://api.staging.clpr.tv/v1
VITE_FEATURE_FLAGS=staging
VITE_ANALYTICS_ENABLED=true
```

### Production

```bash
# Backend
SERVER_PORT=8080
POSTGRES_URL=[managed-secret]
REDIS_URL=[managed-secret]
OPENSEARCH_URL=https://search.clpr.tv
OPENSEARCH_INSECURE_SKIP_VERIFY=false
JWT_SECRET=[managed-secret]
JWT_EXPIRY=24h
LOG_LEVEL=info
CORS_ORIGINS=https://clpr.tv,https://www.clpr.tv
RATE_LIMIT_ENABLED=true
STRIPE_SECRET_KEY=[managed-secret]
STRIPE_WEBHOOK_SECRET=[managed-secret]

# Frontend
VITE_API_BASE=https://api.clpr.tv/v1
VITE_FEATURE_FLAGS=production
VITE_ANALYTICS_ENABLED=true
VITE_SENTRY_DSN=[managed-secret]
```

## Security Best Practices

### Development
- ✅ Use example values for quick setup
- ✅ Keep `.env` files in `.gitignore`
- ⚠️ Never commit real secrets

### Staging/Production
- ✅ Use managed secret stores (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- ✅ Rotate secrets periodically (JWT_SECRET every 90 days)
- ✅ Use strong random values (min 32 characters for secrets)
- ✅ Enable TLS verification (`OPENSEARCH_INSECURE_SKIP_VERIFY=false`)
- ✅ Restrict CORS origins to known domains
- ✅ Enable rate limiting
- ✅ Use separate databases per environment
- ✅ Monitor secret access with audit logs

## Validation

Check required variables are set:

```bash
# Backend
cd backend && go run cmd/api/main.go --validate-config

# Frontend
cd frontend && npm run validate-env

# Or manually check
printenv | grep -E 'POSTGRES|REDIS|JWT|TWITCH'
```

## Troubleshooting

### Common Issues

**"Missing required environment variable"**
- Ensure `.env` file exists in the correct directory
- Check variable name spelling (case-sensitive)
- Verify `.env` is loaded (Docker Compose: `env_file` directive)

**"Database connection failed"**
- Verify `POSTGRES_URL` format and credentials
- Check database is running: `docker compose ps postgres`
- Test connection: `psql $POSTGRES_URL`

**"OAuth redirect mismatch"**
- Ensure `TWITCH_REDIRECT_URL` matches Twitch app settings
- Frontend: `VITE_OAUTH_REDIRECT_URI` must match exactly
- Mobile: Use custom URL scheme `clipper://`

**"CORS errors in browser"**
- Add frontend URL to `CORS_ORIGINS`
- Use comma-separated list: `http://localhost:5173,http://localhost:3000`
- Include protocol and port

---

**See also:**
[[development|Development Setup]] ·
[[../operations/secrets|Secrets Management]] ·
[[../operations/deployment|Deployment]] ·
[[index|Setup Hub]]
