# Production Deployment Preflight Checklist

This checklist ensures all critical systems, configurations, and dependencies are validated before deploying to production.

## Table of Contents

- [Overview](#overview)
- [Pre-Deployment Verification](#pre-deployment-verification)
- [Configuration Validation](#configuration-validation)
- [Database Validation](#database-validation)
- [Security Validation](#security-validation)
- [Infrastructure Checks](#infrastructure-checks)
- [Performance Validation](#performance-validation)
- [Staging Rehearsal](#staging-rehearsal)
- [Final Go/No-Go Checklist](#final-gono-go-checklist)

## Overview

This preflight checklist must be completed before **every** production deployment. All checks should pass in the staging environment before proceeding to production.

**Responsible Parties:**
- **DevOps Lead**: Infrastructure and deployment automation
- **Backend Lead**: API and database migrations
- **QA Lead**: Testing and validation
- **Security Lead**: Security scanning and compliance

**Estimated Time**: 30-60 minutes for automated checks, 2-4 hours for full staging rehearsal

## Pre-Deployment Verification

### Code Quality

- [ ] All CI/CD pipeline checks passing
  - [ ] Backend linting (golangci-lint)
  - [ ] Frontend linting (ESLint)
  - [ ] Backend tests (>80% coverage target)
  - [ ] Frontend tests
  - [ ] Build succeeds for all components
- [ ] Code review completed and approved by at least 2 reviewers
- [ ] No blocking issues or critical bugs in issue tracker
- [ ] Security scans completed and passed
  - [ ] CodeQL analysis (no high/critical findings)
  - [ ] Trivy vulnerability scan (no critical vulnerabilities)
  - [ ] Dependency audit clean
- [ ] Documentation updated
  - [ ] API documentation current
  - [ ] README updated if needed
  - [ ] CHANGELOG updated with version notes

### Version Control

- [ ] All changes merged to release branch
- [ ] Release tag created with semantic version (e.g., v1.2.3)
- [ ] Release notes prepared and reviewed
- [ ] No uncommitted or unstaged changes
- [ ] Branch is up-to-date with remote

## Configuration Validation

### Environment Variables

Run the preflight check script to validate all required environment variables:

```bash
./scripts/preflight-check.sh --env production
```

**Manual verification if script unavailable:**

- [ ] Database configuration
  - [ ] `DB_HOST` - Points to production PostgreSQL instance
  - [ ] `DB_PORT` - Correct port (default: 5432)
  - [ ] `DB_USER` - Service account with appropriate permissions
  - [ ] `DB_PASSWORD` - Secure password (>32 characters)
  - [ ] `DB_NAME` - Production database name
  - [ ] `DB_SSLMODE` - Set to `require` for production
- [ ] Redis configuration
  - [ ] `REDIS_HOST` - Points to production Redis instance
  - [ ] `REDIS_PORT` - Correct port (default: 6379)
  - [ ] `REDIS_PASSWORD` - Secure password configured
  - [ ] `REDIS_MAX_MEMORY` - Appropriate limit set
  - [ ] `REDIS_EVICTION_POLICY` - Set to `allkeys-lru`
- [ ] OpenSearch configuration
  - [ ] `OPENSEARCH_URL` - Points to production cluster
  - [ ] `OPENSEARCH_USERNAME` - Service account configured
  - [ ] `OPENSEARCH_PASSWORD` - Secure credentials
  - [ ] `OPENSEARCH_INSECURE_SKIP_VERIFY` - Set to `false` for production
- [ ] JWT configuration
  - [ ] `JWT_PRIVATE_KEY` - Production RSA private key configured
  - [ ] `JWT_PUBLIC_KEY` - Corresponding public key
  - [ ] `JWT_ACCESS_TOKEN_EXPIRY` - Appropriate expiry (24h recommended)
  - [ ] `JWT_REFRESH_TOKEN_EXPIRY` - Longer expiry (30 days)
- [ ] Twitch API configuration
  - [ ] `TWITCH_CLIENT_ID` - Production credentials
  - [ ] `TWITCH_CLIENT_SECRET` - Production secret
  - [ ] `TWITCH_REDIRECT_URI` - Production callback URL
- [ ] CORS configuration
  - [ ] `CORS_ALLOWED_ORIGINS` - Production domains only
- [ ] Stripe configuration (if enabled)
  - [ ] `STRIPE_SECRET_KEY` - Production key (sk_live_...)
  - [ ] `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret
  - [ ] `STRIPE_PRO_MONTHLY_PRICE_ID` - Production price ID
  - [ ] `STRIPE_PRO_YEARLY_PRICE_ID` - Production price ID
  - [ ] `STRIPE_SUCCESS_URL` - Production success page
  - [ ] `STRIPE_CANCEL_URL` - Production cancel page
- [ ] Monitoring configuration
  - [ ] `SENTRY_DSN` - Production Sentry project
  - [ ] `SENTRY_ENVIRONMENT` - Set to "production"
  - [ ] `SENTRY_TRACES_SAMPLE_RATE` - Conservative rate (0.1)
  - [ ] `SENTRY_ENABLED` - Set to "true"
- [ ] Email configuration (if enabled)
  - [ ] `SENDGRID_API_KEY` - Production API key
  - [ ] `EMAIL_FROM_ADDRESS` - Verified sender domain
  - [ ] `EMAIL_FROM_NAME` - Brand name
  - [ ] `EMAIL_ENABLED` - Set appropriately
  - [ ] `EMAIL_MAX_PER_HOUR` - Rate limit configured
- [ ] Feature flags
  - [ ] `FEATURE_SEMANTIC_SEARCH` - Enable/disable semantic search
  - [ ] `FEATURE_PREMIUM_SUBSCRIPTIONS` - Enable/disable subscriptions
  - [ ] `FEATURE_EMAIL_NOTIFICATIONS` - Enable/disable emails
  - [ ] `FEATURE_PUSH_NOTIFICATIONS` - Enable/disable push

### Application Configuration

- [ ] Server configuration
  - [ ] `PORT` - Correct port for production (8080)
  - [ ] `GIN_MODE` - Set to "release"
  - [ ] `LOG_LEVEL` - Set to "info" or "warn"
  - [ ] `ENVIRONMENT` - Set to "production"
- [ ] Security headers enabled
  - [ ] `SECURITY_HEADERS_ENABLED=true`
  - [ ] `HSTS_MAX_AGE=31536000` (1 year)
  - [ ] `CSP_ENABLED=true`
- [ ] Rate limiting enabled
  - [ ] `RATE_LIMIT_ENABLED=true`
  - [ ] `RATE_LIMIT_REQUESTS_PER_MINUTE` - Appropriate limit
- [ ] Cookie security
  - [ ] `COOKIE_SECURE=true`
  - [ ] `COOKIE_HTTPONLY=true`
  - [ ] `COOKIE_SAMESITE=lax`
  - [ ] `COOKIE_DOMAIN` - Production domain

## Database Validation

### Database Connectivity

- [ ] Database server accessible from application server
  ```bash
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"
  ```
- [ ] SSL/TLS connection verified
  ```bash
  psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require" -c "SELECT 1;"
  ```
- [ ] Connection pool settings appropriate
- [ ] Timeout settings configured

### Schema Validation

- [ ] Latest migration version matches expected version
  ```bash
  migrate -path backend/migrations -database "$DATABASE_URL" version
  ```
- [ ] All required tables exist
  ```bash
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backend/migrations/health_check.sql
  ```
- [ ] All required indexes exist
- [ ] Materialized views created and refreshed
  ```bash
  psql -d $DB_NAME -c "SELECT schemaname, matviewname, last_refresh FROM pg_matviews;"
  ```
- [ ] Database functions and triggers working
- [ ] Full-text search indexes built

### Performance Checks

- [ ] Analyze table statistics updated
  ```bash
  psql -d $DB_NAME -c "ANALYZE;"
  ```
- [ ] No missing indexes for common queries
- [ ] Query performance acceptable (see performance_indexes.sql)
- [ ] No long-running or blocking queries
  ```bash
  psql -d $DB_NAME -c "SELECT pid, query, state, wait_event_type, query_start FROM pg_stat_activity WHERE state != 'idle' AND query_start < now() - interval '1 minute';"
  ```

### Backup Validation

- [ ] Recent backup exists (within last 24 hours)
  ```bash
  ls -lh /var/backups/clipper/ | head -10
  ```
- [ ] Backup integrity verified
  ```bash
  gunzip -t /var/backups/clipper/db-latest.sql.gz
  ```
- [ ] Restore procedure tested in staging
- [ ] Backup size reasonable (not truncated)
- [ ] Point-in-time recovery (PITR) configured if available
- [ ] Backup retention policy active (30 days)

## Security Validation

### Secrets Management

- [ ] No secrets committed to repository
  ```bash
  git log --all -p | grep -i "password\|secret\|key" | head -20
  ```
- [ ] Environment variables stored securely (not in plain text)
- [ ] GitHub secrets configured for deployment
  - [ ] `PRODUCTION_HOST`
  - [ ] `DEPLOY_SSH_KEY`
  - [ ] `CODECOV_TOKEN`
- [ ] Secrets rotation schedule documented
- [ ] Emergency secret rotation procedure ready

### SSL/TLS Certificates

- [ ] SSL certificates valid and not expiring soon (>30 days)
  ```bash
  echo | openssl s_client -connect clipper.example.com:443 2>/dev/null | openssl x509 -noout -dates
  ```
- [ ] Certificate chain complete
- [ ] Strong ciphers enabled, weak ciphers disabled
- [ ] TLS 1.2+ only (TLS 1.0/1.1 disabled)
- [ ] HSTS header configured
- [ ] Certificate auto-renewal configured (Let's Encrypt)

### Access Control

- [ ] SSH access restricted to authorized keys only
- [ ] Database access restricted by IP/VPC
- [ ] Redis access requires authentication
- [ ] Admin panel accessible only via VPN or IP whitelist
- [ ] API rate limiting enabled
- [ ] DDoS protection active

### Security Scanning

- [ ] Latest security scan completed
- [ ] No critical or high vulnerabilities in dependencies
  ```bash
  cd backend && go list -json -m all | nancy sleuth
  cd frontend && npm audit --production
  ```
- [ ] Docker images scanned with Trivy
  ```bash
  trivy image ghcr.io/subculture-collective/clipper/backend:latest
  ```
- [ ] OWASP Top 10 vulnerabilities addressed
- [ ] Security headers tested
  ```bash
  curl -I https://clipper.example.com
  ```

## Infrastructure Checks

### Resource Availability

- [ ] Sufficient disk space (>20% free)
  ```bash
  df -h
  ```
- [ ] Sufficient memory available (>2GB free)
  ```bash
  free -h
  ```
- [ ] CPU capacity adequate (avg load < 80%)
  ```bash
  uptime
  ```
- [ ] Database storage capacity (>30% free)
- [ ] Redis memory capacity (>30% free)
- [ ] Docker storage capacity (>20% free)
  ```bash
  docker system df
  ```

### Service Dependencies

- [ ] PostgreSQL service running and healthy
  ```bash
  docker-compose ps postgres
  ```
- [ ] Redis service running and healthy
  ```bash
  docker-compose ps redis
  redis-cli ping
  ```
- [ ] OpenSearch cluster green status
  ```bash
  curl -u $OPENSEARCH_USERNAME:$OPENSEARCH_PASSWORD $OPENSEARCH_URL/_cluster/health
  ```
- [ ] Nginx/reverse proxy running (if applicable)
- [ ] External API dependencies accessible
  - [ ] Twitch API reachable
  - [ ] Stripe API reachable (if enabled)
  - [ ] SendGrid API reachable (if enabled)

### Network Configuration

- [ ] DNS records correct
  ```bash
  dig clipper.example.com
  dig www.clipper.example.com
  ```
- [ ] Load balancer configured (if applicable)
- [ ] Firewall rules appropriate
  - [ ] Port 443 (HTTPS) open
  - [ ] Port 80 (HTTP) redirect to HTTPS
  - [ ] Port 8080 (backend) restricted to internal network
  - [ ] Database ports restricted to application servers
- [ ] CDN configured (if applicable)

### Docker Infrastructure

- [ ] Docker daemon healthy
  ```bash
  docker info
  ```
- [ ] Docker Compose version compatible (v2.0+)
  ```bash
  docker compose version
  ```
- [ ] Docker images available in registry
  ```bash
  docker pull ghcr.io/subculture-collective/clipper/backend:production
  docker pull ghcr.io/subculture-collective/clipper/frontend:production
  ```
- [ ] Docker volumes configured correctly
- [ ] Docker networks configured correctly

## Performance Validation

### Load Testing

- [ ] Load tests run against staging environment
  ```bash
  make test-load-mixed
  ```
- [ ] Performance targets met
  - [ ] Feed endpoint: p95 < 100ms
  - [ ] API responses: p95 < 50ms
  - [ ] Concurrent users: 1000+
  - [ ] Requests/second: 100+
- [ ] Error rate acceptable (<0.1%)
- [ ] No memory leaks observed

### Database Performance

- [ ] Query performance tested with production-like data volume
- [ ] Connection pool size appropriate (20-50 connections)
- [ ] Slow query log reviewed (queries >1s)
- [ ] Index usage validated
- [ ] Materialized view refresh time acceptable (<5 minutes)

### Caching Strategy

- [ ] Redis cache hit rate >80%
  ```bash
  redis-cli info stats | grep keyspace
  ```
- [ ] Cache invalidation working correctly
- [ ] Cache memory usage appropriate
- [ ] Cache eviction policy active

## Staging Rehearsal

### Staging Environment Setup

- [ ] Staging environment mirrors production
  - [ ] Same OS version
  - [ ] Same Docker versions
  - [ ] Same resource allocation
  - [ ] Same database version
- [ ] Production data snapshot loaded (anonymized)
- [ ] All integrations connected to sandbox APIs
  - [ ] Twitch test application
  - [ ] Stripe test mode
  - [ ] SendGrid test credentials

### Deployment Rehearsal

- [ ] Full deployment executed on staging
  ```bash
  # On staging server
  ./scripts/preflight-check.sh --env staging
  ./scripts/backup.sh
  ./scripts/deploy.sh
  ```
- [ ] Deployment completed without errors
- [ ] Deployment time measured and acceptable (<10 minutes)
- [ ] Zero downtime achieved (if required)
- [ ] Health checks passed post-deployment
  ```bash
  ./scripts/health-check.sh
  ```

### Migration Rehearsal

- [ ] Database migration plan reviewed
- [ ] Migration executed on staging with production-like data
- [ ] Migration time measured and acceptable
- [ ] Migration rollback tested
- [ ] Application works correctly post-migration
- [ ] No data loss or corruption
- [ ] Performance acceptable post-migration

### Testing on Staging

- [ ] Smoke tests passed
- [ ] Critical user flows tested manually
  - [ ] User registration and login
  - [ ] Browse and search clips
  - [ ] Vote on clips
  - [ ] Comment on clips
  - [ ] User profile and settings
  - [ ] Premium subscription flow (if enabled)
- [ ] API endpoints tested
- [ ] Mobile app tested (if applicable)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Monitoring and alerting working
  - [ ] Error tracking (Sentry)
  - [ ] Metrics collection (if configured)
  - [ ] Log aggregation (if configured)

### Rollback Rehearsal

- [ ] Rollback procedure documented
- [ ] Rollback tested on staging
  ```bash
  ./scripts/rollback.sh
  ```
- [ ] Rollback time measured (<5 minutes)
- [ ] Application functional after rollback
- [ ] Database rollback tested (if needed)
- [ ] Rollback decision criteria defined

## Final Go/No-Go Checklist

Complete this checklist during the final deployment decision meeting.

### Technical Readiness

- [ ] All preflight checks passed in staging
- [ ] All automated tests passing
- [ ] Security scans clean
- [ ] Performance benchmarks met
- [ ] Staging rehearsal successful

### Business Readiness

- [ ] Deployment window scheduled and communicated
- [ ] Stakeholders notified (engineering, product, support)
- [ ] Support team briefed on new features/changes
- [ ] Customer communication prepared (if needed)
- [ ] Rollback criteria defined and agreed upon

### Team Readiness

- [ ] On-call engineer assigned and available
- [ ] Backup on-call engineer identified
- [ ] Deployment runbook reviewed by team
- [ ] Communication channels established (Slack, etc.)
- [ ] Incident response plan ready

### Monitoring Readiness

- [ ] Monitoring dashboards configured
- [ ] Alerts configured for critical metrics
  - [ ] Error rate spike
  - [ ] Response time degradation
  - [ ] Service downtime
  - [ ] Database connection issues
- [ ] Log aggregation working
- [ ] Metrics collection active

### Compliance & Documentation

- [ ] Change management ticket created (if required)
- [ ] Deployment documented with version, date, changes
- [ ] CHANGELOG updated
- [ ] Post-deployment validation plan ready
- [ ] Success criteria defined

## Post-Deployment Validation

After deployment, verify the following within 1 hour:

- [ ] Health check endpoints responding
  ```bash
  curl https://clipper.example.com/health
  curl https://clipper.example.com/api/v1/ping
  ```
- [ ] No error spikes in Sentry
- [ ] Response times within normal range
- [ ] Database connections stable
- [ ] Cache hit rates normal
- [ ] User login working
- [ ] Critical features functional
- [ ] Mobile app connecting successfully
- [ ] Background jobs processing
- [ ] No unusual log patterns

## Rollback Decision Criteria

Initiate rollback if any of the following occur within 1 hour of deployment:

- **Critical**: Error rate >5% on critical endpoints
- **Critical**: Complete service outage >2 minutes
- **Critical**: Data corruption or loss detected
- **Critical**: Security vulnerability exploited
- **High**: Error rate >1% on any endpoint
- **High**: Response time degradation >50% from baseline
- **High**: Database connection pool exhausted
- **Medium**: Non-critical feature completely broken
- **Medium**: Performance degradation affecting user experience

## Automated Preflight Check

Run the automated preflight check script before deployment:

```bash
# Install dependencies
./scripts/preflight-check.sh --install

# Run full preflight check
./scripts/preflight-check.sh --env production --level full

# Run quick check (essential items only)
./scripts/preflight-check.sh --env production --level quick

# Generate report
./scripts/preflight-check.sh --env production --report > preflight-report.txt
```

## References

- [Deployment Guide](./DEPLOYMENT.md)
- [Migration Plan](./MIGRATION_PLAN.md)
- [Runbook](./RUNBOOK.md)
- [Infrastructure Guide](./INFRASTRUCTURE.md)
- [Monitoring Guide](./MONITORING.md)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-14 | Initial preflight checklist | DevOps Team |

---

**Remember**: It's better to delay a deployment than to rush and cause an outage. When in doubt, don't deploy.
