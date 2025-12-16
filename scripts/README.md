# Deployment Scripts

This directory contains automation scripts for deploying, managing, and maintaining the Clipper application.

## Scripts Overview

| Script | Purpose | Requires Sudo |
|--------|---------|---------------|
| `deploy.sh` | Deploy application with automated backup and rollback | No |
| `rollback.sh` | Rollback to a previous version | No |
| **`blue-green-deploy.sh`** | **Zero-downtime blue/green deployment** | **No** |
| **`rollback-blue-green.sh`** | **Rollback blue/green deployment** | **No** |
| **`check-migration-compatibility.sh`** | **Check database migrations for backward compatibility** | **No** |
| **`test-blue-green-deployment.sh`** | **Test blue/green deployment in staging** | **No** |
| `preflight-check.sh` | Run comprehensive pre-deployment validation | No |
| `staging-rehearsal.sh` | Complete staging deployment rehearsal | No |
| `health-check.sh` | Run health checks on all services | No |
| `backup.sh` | Backup database and configuration | No |
| `setup-ssl.sh` | Set up SSL/TLS certificates | Yes |

## Blue/Green Deployment Scripts (NEW)

### blue-green-deploy.sh

**Zero-downtime deployment** using blue/green strategy. Automatically switches between two production environments.

**Features**:
- Automatic active/target environment detection
- Pull latest images for target environment
- Health check verification (30 retries with 10s intervals)
- Database migration execution
- Traffic switching via Caddy proxy
- Post-switch monitoring (30s)
- Automatic rollback on failure
- Deployment notifications (if monitoring enabled)

**Usage**:

```bash
# Standard deployment
cd /opt/clipper
./scripts/blue-green-deploy.sh

# Deploy specific version
IMAGE_TAG=v1.2.3 ./scripts/blue-green-deploy.sh

# Deploy with monitoring notifications
MONITORING_ENABLED=true WEBHOOK_URL="https://hooks.slack.com/..." ./scripts/blue-green-deploy.sh

# Custom configuration
DEPLOY_DIR=/opt/clipper \
HEALTH_CHECK_RETRIES=60 \
HEALTH_CHECK_INTERVAL=5 \
./scripts/blue-green-deploy.sh
```

**Environment Variables**:
- `DEPLOY_DIR`: Deployment directory (default: `/opt/clipper`)
- `COMPOSE_FILE`: Compose file name (default: `docker-compose.blue-green.yml`)
- `REGISTRY`: Container registry (default: `ghcr.io/subculture-collective/clipper`)
- `IMAGE_TAG`: Image tag to deploy (default: `latest`)
- `HEALTH_CHECK_RETRIES`: Max health check attempts (default: `30`)
- `HEALTH_CHECK_INTERVAL`: Seconds between checks (default: `10`)
- `BACKUP_DIR`: Backup directory (default: `/opt/clipper/backups`)
- `MONITORING_ENABLED`: Enable notifications (default: `false`)
- `WEBHOOK_URL`: Webhook for notifications (if monitoring enabled)

**Example Output**:

```
╔════════════════════════════════════════════════╗
║   Clipper Blue-Green Deployment Script        ║
╚════════════════════════════════════════════════╝

[INFO] Running pre-deployment checks...
[SUCCESS] Prerequisites check passed
[STEP] Detecting active environment...
[INFO] Active environment: blue
[INFO] Target environment: green

[STEP] Creating backup...
[SUCCESS] Backup created: /opt/clipper/backups/deployment-20250116-120000.tar.gz

[STEP] Pulling latest images for green environment...
[SUCCESS] Images pulled successfully

[STEP] Running database migrations...
[SUCCESS] Database migration check complete

[STEP] Starting green environment...
[SUCCESS] green environment started

[INFO] Waiting for green environment to initialize...

[STEP] Running health checks for green environment...
[INFO] Backend health check passed (attempt 1/30)
[SUCCESS] green environment is healthy

[STEP] Switching traffic to green environment...
[SUCCESS] Traffic switched to green environment

[STEP] Monitoring new environment for 30 seconds...

[SUCCESS] green environment is healthy

[STEP] Stopping blue environment...
[SUCCESS] blue environment stopped

╔════════════════════════════════════════════════╗
║   Deployment Successful! ✓                     ║
╚════════════════════════════════════════════════╝

[SUCCESS] Blue-Green deployment completed successfully
[INFO] Previous environment: blue (stopped)
[INFO] Current environment: green (active)
[INFO] Backup: /opt/clipper/backups/deployment-20250116-120000.tar.gz
```

### rollback-blue-green.sh

**Quick rollback** for blue/green deployments. Switches traffic back to the previous stable environment.

**Features**:
- Automatic active/target environment detection
- Start target environment if not running
- Health check verification before switch
- Traffic switching with verification
- Post-rollback monitoring
- Optional old environment cleanup
- Confirmation prompts (can be skipped with `-y`)

**Usage**:

```bash
# Interactive rollback with confirmations
./scripts/rollback-blue-green.sh

# Automatic rollback (skip confirmations)
./scripts/rollback-blue-green.sh --yes

# Custom deployment directory
DEPLOY_DIR=/opt/clipper ./scripts/rollback-blue-green.sh -y
```

**Options**:
- `-y, --yes`: Skip confirmation prompts
- `-h, --help`: Show help message

**Example Output**:

```
╔════════════════════════════════════════════════╗
║   Clipper Blue-Green Rollback Script          ║
╚════════════════════════════════════════════════╝

[WARN] Current environment: green
[INFO] Target environment: blue

WARNING: This will switch traffic from green to blue
Are you sure you want to proceed? (yes/no): yes

[INFO] blue environment is already running

[INFO] Waiting for blue environment to initialize...

[INFO] Checking health of blue environment...
[SUCCESS] blue environment is healthy

[INFO] Switching traffic to blue environment...
[SUCCESS] Caddy restarted with blue configuration
[SUCCESS] Traffic switched successfully to blue

[INFO] Monitoring blue environment for 30 seconds...

[INFO] Checking health of blue environment...
[SUCCESS] blue environment is healthy

Stop green environment? (yes/no): yes
[INFO] Stopping green environment...
[SUCCESS] green environment stopped

╔════════════════════════════════════════════════╗
║   Rollback Completed Successfully! ✓          ║
╚════════════════════════════════════════════════╝

[SUCCESS] Rollback completed successfully
[INFO] Previous environment: green
[INFO] Current environment: blue (active)

[INFO] Next steps:
  1. Monitor application metrics
  2. Check error logs: docker compose logs --tail=100
  3. Investigate cause of original deployment issue
  4. Document incident and lessons learned
```

### check-migration-compatibility.sh

**Analyze database migrations** for backward compatibility issues before blue/green deployment.

**Features**:
- Scan all migration files in migrations directory
- Detect potentially breaking changes
- Identify safe operations
- Provide recommendations for backward-compatible migrations
- Generate compatibility report

**Usage**:

```bash
# Check migrations in default directory
./scripts/check-migration-compatibility.sh

# Check custom migrations directory
MIGRATIONS_DIR=/path/to/migrations ./scripts/check-migration-compatibility.sh
```

**Environment Variables**:
- `MIGRATIONS_DIR`: Path to migrations directory (default: `./backend/migrations`)
- `DB_CONNECTION`: Database connection string (optional, for version checks)

**Example Output**:

```
╔════════════════════════════════════════════════╗
║  Database Migration Compatibility Checker      ║
╚════════════════════════════════════════════════╝

[INFO] Scanning migrations in: ./backend/migrations

[INFO] Analyzing: 001_create_users.up.sql
  ✓ Creates new table (safe)

[INFO] Analyzing: 002_add_featured_column.up.sql
  ✓ Adds column with default (safe)

[INFO] Analyzing: 003_add_index.up.sql
  ✓ Creates index (safe)

════════════════════════════════════════════════

[INFO] Analyzed 3 migration(s)
[SUCCESS] No backward compatibility issues detected
[SUCCESS] Migrations appear safe for blue-green deployment

╔════════════════════════════════════════════════════════════════╗
║  Backward Compatible Migration Guidelines                     ║
╚════════════════════════════════════════════════════════════════╝

✓ SAFE operations for blue-green deployment:
  - CREATE TABLE (new tables)
  - ADD COLUMN (with DEFAULT value or NULL allowed)
  - CREATE INDEX (improves performance)
  - INSERT data (add new reference data)

✗ UNSAFE operations (require two-phase migration):
  - DROP TABLE
  - DROP COLUMN
  - RENAME TABLE/COLUMN
  - ALTER COLUMN to NOT NULL (without default)
  - Change column types

🔄 Two-phase migration pattern:
  Phase 1 (before old version stops):
    - ADD new columns/tables
    - Keep old columns/tables
    - Update code to write to both old and new

  Phase 2 (after new version is stable):
    - Remove old columns/tables
    - Clean up deprecated code
```

### test-blue-green-deployment.sh

**Comprehensive test suite** for blue/green deployment functionality in staging.

**Features**:
- Test all deployment components
- Verify both environments can run simultaneously
- Test traffic switching in both directions
- Measure zero-downtime capability
- Test rollback functionality
- Generate test report
- Automatic cleanup

**Usage**:

```bash
# Run full test suite
./scripts/test-blue-green-deployment.sh

# Test in specific directory
DEPLOY_DIR=/opt/clipper-staging ./scripts/test-blue-green-deployment.sh

# Custom environment name
TEST_ENV=staging ./scripts/test-blue-green-deployment.sh
```

**Environment Variables**:
- `TEST_ENV`: Environment name (default: `staging`)
- `DEPLOY_DIR`: Deployment directory (default: `.`)
- `COMPOSE_FILE`: Compose file name (default: `docker-compose.blue-green.yml`)

**Tests Included**:
1. Prerequisites installed
2. Compose file valid
3. Shared services start
4. Blue environment starts
5. Blue health checks pass
6. Caddy proxy starts
7. Traffic flows through blue
8. Green environment starts
9. Green health checks pass
10. Both environments run simultaneously
11. Traffic switches to green
12. Traffic switches back to blue
13. Zero downtime during switch
14. Rollback functionality
15. Environment cleanup

**Example Output**:

```
╔════════════════════════════════════════════════╗
║  Blue-Green Deployment Test Suite             ║
╚════════════════════════════════════════════════╝

[INFO] Testing environment: staging
[INFO] Deploy directory: .

[TEST] Running: Prerequisites installed
[PASS] Prerequisites installed
[TEST] Running: Compose file valid
[PASS] Compose file valid
...
[TEST] Running: Zero downtime during switch
[PASS] Zero downtime during switch
...

════════════════════════════════════════════════

Blue-Green Deployment Test Report
==================================
Date: Mon Jan 16 12:00:00 UTC 2025
Environment: staging

Test Results:
  Total Tests: 15
  Passed: 15
  Failed: 0
  Success Rate: 100%

Status: ✓ ALL TESTS PASSED

[INFO] Report saved to: /tmp/blue-green-test-results/test-report-20250116-120000.txt

╔════════════════════════════════════════════════╗
║  All Tests Passed! ✓                           ║
╚════════════════════════════════════════════════╝
```

## Usage

### deploy.sh

Deploys the application with automated backup, migration, and health checks.

**Features**:

- Pre-deployment checks (Docker, docker-compose, deployment directory)
- Automatic backup of current deployment
- Pull latest images from registry
- Run database migrations (if available)
- Deploy new version
- Health check verification
- Automatic rollback on failure
- Cleanup of old images

**Usage**:

```bash
# Deploy to production
cd /opt/clipper
./scripts/deploy.sh

# Deploy with custom settings
DEPLOY_DIR=/opt/clipper ENVIRONMENT=production ./scripts/deploy.sh
```

**Environment Variables**:

- `DEPLOY_DIR`: Deployment directory (default: `/opt/clipper`)
- `REGISTRY`: Container registry (default: `ghcr.io/subculture-collective/clipper`)
- `ENVIRONMENT`: Environment name (default: `production`)

**Example Output**:

```
=== Clipper Deployment Script ===
Environment: production
Deploy Directory: /opt/clipper

[INFO] Running pre-deployment checks...
[INFO] Creating backup of current deployment...
[INFO] Backed up clipper-backend:latest -> clipper-backend:backup-20240101-120000
[INFO] Pulling latest images from registry...
[INFO] Deploying new version...
[INFO] Waiting for services to start...
[INFO] Running health checks...
[INFO] Backend health check passed
[INFO] Frontend health check passed
[INFO] Deployment successful!
```

### rollback.sh

Rollback to a previous version using backup tags.

**Features**:

- List available backups
- Restore from backup images
- Health check after rollback
- Confirmation prompt

**Usage**:

```bash
# Rollback to latest backup
./scripts/rollback.sh

# Rollback to specific backup tag
./scripts/rollback.sh backup-20240101-120000

# Rollback with custom deployment directory
DEPLOY_DIR=/opt/clipper ./scripts/rollback.sh backup-20240101-120000
```

**Environment Variables**:

- `DEPLOY_DIR`: Deployment directory (default: `/opt/clipper`)

**Example Output**:

```
=== Clipper Rollback Script ===
Deploy Directory: /opt/clipper
Backup Tag: backup-20240101-120000

WARNING: This will rollback to the backup version.
Images to restore:
  - clipper-backend:backup-20240101-120000
  - clipper-frontend:backup-20240101-120000

Are you sure you want to continue? (yes/no): yes
[INFO] Stopping current containers...
[INFO] Restoring from backup...
[INFO] Restored backend from backup
[INFO] Restored frontend from backup
[INFO] Starting containers...
[INFO] Backend health check passed
=== Rollback Complete ===
```

### health-check.sh

Run health checks on all services.

**Features**:

- Check backend health endpoint
- Check frontend health endpoint
- Retry logic (3 attempts by default)
- Configurable timeout
- Exit codes for automation

**Usage**:

```bash
# Run health checks
./scripts/health-check.sh

# Custom configuration
BACKEND_URL=http://localhost:8080 FRONTEND_URL=http://localhost:80 TIMEOUT=5 MAX_RETRIES=5 ./scripts/health-check.sh
```

**Environment Variables**:

- `BACKEND_URL`: Backend URL (default: `http://localhost:8080`)
- `FRONTEND_URL`: Frontend URL (default: `http://localhost:80`)
- `TIMEOUT`: Request timeout in seconds (default: `10`)
- `MAX_RETRIES`: Maximum retry attempts (default: `3`)

**Exit Codes**:

- `0`: All services healthy
- `1`: Some services unhealthy
- `2`: Neither curl nor wget available

**Example Output**:

```
=== Clipper Health Check ===
Backend URL: http://localhost:8080
Frontend URL: http://localhost:80
Timeout: 10s
Max Retries: 3

[INFO] Backend is healthy
[INFO] Frontend is healthy

✓ All services are healthy
```

### backup.sh

Backup database, Redis data, and configuration files.

**Features**:

- PostgreSQL database backup (compressed with gzip)
- Redis data backup
- Configuration files backup
- Backup manifest with restore instructions
- Automatic cleanup of old backups (30 days retention by default)
- Size reporting

**Usage**:

```bash
# Run backup
./scripts/backup.sh

# Custom configuration
DEPLOY_DIR=/opt/clipper BACKUP_DIR=/var/backups/clipper RETENTION_DAYS=30 ./scripts/backup.sh
```

**Environment Variables**:

- `DEPLOY_DIR`: Deployment directory (default: `/opt/clipper`)
- `BACKUP_DIR`: Backup directory (default: `/var/backups/clipper`)
- `RETENTION_DAYS`: Backup retention in days (default: `30`)

**Scheduled Backups**:

```bash
# Set up daily backups at 2 AM
sudo crontab -e

# Add this line:
0 2 * * * /opt/clipper/scripts/backup.sh
```

**Backup Structure**:

```
/var/backups/clipper/
├── db-20240101-120000.sql.gz         # Database backup
├── redis-20240101-120000/
│   └── dump.rdb                       # Redis data
└── config-20240101-120000/
    ├── docker-compose.yml
    ├── .env
    ├── nginx.conf
    └── manifest.txt                   # Restore instructions
```

**Example Output**:

```
=== Clipper Backup Script ===
Deploy Directory: /opt/clipper
Backup Directory: /var/backups/clipper
Retention: 30 days

[INFO] Backing up PostgreSQL database...
[INFO] Database backup saved: /var/backups/clipper/db-20240101-120000.sql.gz
[INFO] Size: 15M
[INFO] Backing up Redis data...
[INFO] Redis backup saved: /var/backups/clipper/redis-20240101-120000/dump.rdb
[INFO] Size: 2.3M
[INFO] Backing up configuration files...
[INFO] Backup Summary:
[INFO]   Database backups: 7
[INFO]   Redis backups: 7
[INFO]   Config backups: 7
[INFO]   Total backup size: 120M
=== Backup Complete ===
```

### setup-ssl.sh

Set up SSL/TLS certificates using Let's Encrypt.

**Features**:

- Install Certbot if not present
- Obtain SSL certificate from Let's Encrypt
- Set up automatic renewal with systemd timer
- Test certificate renewal
- DNS verification

**Usage**:

```bash
# Set up SSL certificate
sudo DOMAIN=clpr.tv EMAIL=admin@clpr.tv ./scripts/setup-ssl.sh

# Or export variables first
export DOMAIN=clpr.tv
export EMAIL=admin@clpr.tv
sudo ./scripts/setup-ssl.sh
```

**Environment Variables**:

- `DOMAIN`: Your domain name (default: `clpr.tv`)
- `EMAIL`: Admin email for Let's Encrypt (default: `admin@clpr.tv`)
- `WEBROOT`: Webroot for ACME challenge (default: `/var/www/certbot`)

**Requirements**:

- Domain must resolve to the server
- Port 80 must be open and accessible
- Nginx must be running
- Must run as root (use sudo)

**Example Output**:

```
=== SSL/TLS Certificate Setup (Let's Encrypt) ===
Domain: clpr.tv
Email: admin@clpr.tv

[INFO] Checking if clpr.tv resolves to this server...
[INFO] Obtaining SSL certificate from Let's Encrypt...
[INFO] Certificate obtained successfully!
[INFO] Setting up automatic certificate renewal...
[INFO] Automatic renewal timer created and enabled
[INFO] Testing certificate renewal (dry run)...
[INFO] Certificate renewal test passed

Certificate Information:
  Certificate Name: clpr.tv
    Serial Number: 1234567890abcdef
    Domains: clpr.tv www.clpr.tv
    Expiry Date: 2024-04-01 00:00:00+00:00 (89 days)

Certificate files location:
  Certificate: /etc/letsencrypt/live/clpr.tv/fullchain.pem
  Private Key: /etc/letsencrypt/live/clpr.tv/privkey.pem
  Chain: /etc/letsencrypt/live/clpr.tv/chain.pem

Next steps:
  1. Update your nginx configuration to use the SSL certificate
  2. Test nginx config: nginx -t
  3. Reload nginx: systemctl reload nginx
  4. Test SSL: https://clpr.tv

=== SSL Setup Complete ===
```

## Integration with CI/CD

These scripts are used by GitHub Actions workflows but can also be run manually for troubleshooting or emergency deployments.

### Deploy from CI/CD

```yaml
# In .github/workflows/deploy-production.yml
- name: Deploy to Production Server
  uses: appleboy/ssh-action@v1.2.0
  with:
    host: ${{ secrets.PRODUCTION_HOST }}
    username: deploy
    key: ${{ secrets.DEPLOY_SSH_KEY }}
    script: |
      cd /opt/clipper
      ./scripts/deploy.sh
```

## Troubleshooting

### Script Exits with "Permission Denied"

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

### Docker Commands Fail

Ensure user is in docker group:

```bash
sudo usermod -aG docker $USER
# Log out and back in
```

### Health Checks Fail

Check if services are running:

```bash
docker-compose ps
docker-compose logs -f
```

Test endpoints manually:

```bash
curl http://localhost:8080/health
curl http://localhost:80/health.html
```

### Backup Fails

Check disk space:

```bash
df -h
```

Check PostgreSQL container:

```bash
docker-compose ps postgres
docker-compose logs postgres
```

### SSL Setup Fails

Verify DNS:

```bash
dig +short clpr.tv
```

Check port 80:

```bash
sudo netstat -tlnp | grep :80
```

Test Certbot manually:

```bash
sudo certbot certonly --dry-run --nginx -d clpr.tv
```

## Best Practices

1. **Always backup before deployment**:

   ```bash
   ./scripts/backup.sh
   ./scripts/deploy.sh
   ```

2. **Test on staging first**:

   ```bash
   # Deploy to staging
   ENVIRONMENT=staging ./scripts/deploy.sh
   
   # Verify it works
   ./scripts/health-check.sh
   
   # Then deploy to production
   ```

3. **Keep backups for at least 30 days**:

   ```bash
   RETENTION_DAYS=30 ./scripts/backup.sh
   ```

4. **Monitor logs during deployment**:

   ```bash
   # In another terminal
   docker-compose logs -f
   ```

5. **Have rollback plan ready**:

   ```bash
   # Note the backup tag before deployment
   docker images | grep clipper
   
   # If needed, rollback
   ./scripts/rollback.sh backup-20240101-120000
   ```

## Security Considerations

- Keep scripts readable only by deploy user: `chmod 750 scripts/*.sh`
- Store sensitive variables in `.env` file, not in scripts
- Use SSH keys for authentication, not passwords
- Regularly rotate SSL certificates (automated with certbot)
- Review scripts for security issues before running
- Test in staging before production

## Additional Resources

- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Infrastructure Guide](../docs/INFRASTRUCTURE.md)
- [Deployment Runbook](../docs/RUNBOOK.md)
- [Docker Documentation](https://docs.docker.com/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

### preflight-check.sh

**NEW** - Comprehensive pre-deployment validation script that checks all critical configurations and dependencies.

**Features**:

- System requirements validation (Docker, disk space, memory)
- Environment variable validation
- Database connectivity and migration status checks
- Redis connectivity checks
- External service reachability (Twitch API, Stripe, etc.)
- Security configuration validation (SSL, secrets)
- Backup verification
- Generates detailed pass/fail report

**Usage**:

```bash
# Full preflight check for production
./scripts/preflight-check.sh --env production --level full

# Quick check for staging
./scripts/preflight-check.sh --env staging --level quick

# Generate report to file
./scripts/preflight-check.sh --env production --report preflight-report.txt

# Install required dependencies
./scripts/preflight-check.sh --install

# Show help
./scripts/preflight-check.sh --help
```

**Environment Variables**:

Uses environment variables from `.env` file or system environment.

**Exit Codes**:

- `0`: All checks passed
- `1`: One or more checks failed

**Example Output**:

```
╔════════════════════════════════════════╗
║   Clipper Preflight Check v1.0.0      ║
╚════════════════════════════════════════╝

=== Loading Environment ===
[✓] Loading environment from backend/.env
[✓] Environment: production

=== System Requirements ===
[•] Checking: Docker installation
[✓] Docker installed: 24.0.7
[•] Checking: Docker Compose installation
[✓] Docker Compose installed: v2.23.0
[•] Checking: Disk space
[✓] Disk space: 45% used (>20% free)

=== Environment Variables ===
[•] Checking: Database configuration
[✓] Database variables configured
[✓] Database SSL mode: require
[•] Checking: Redis configuration
[✓] Redis variables configured

=== Database Connectivity ===
[•] Checking: Database connection
[✓] Database connection successful
[•] Checking: Database version
[✓] PostgreSQL version: 17.1
[•] Checking: Migration status
[✓] Current migration version: 000020
[✓] Migration state: clean

=== Preflight Check Summary ===

Environment: production
Check Level: full

Total Checks: 25
  Passed: 25
  Warnings: 0
  Failed: 0

✓ All preflight checks passed!
Deployment may proceed.
```

See [Preflight Checklist](../docs/PREFLIGHT_CHECKLIST.md) for detailed documentation.

### staging-rehearsal.sh

**NEW** - Complete staging deployment rehearsal automation that simulates a full production deployment.

**Features**:

- Runs preflight checks
- Creates pre-deployment backup
- Checks current application state
- Validates database state
- Pulls latest Docker images
- Runs database migrations
- Deploys new version
- Waits for service stabilization
- Runs health checks
- Executes smoke tests
- Tests rollback procedure
- Monitors logs for errors
- Generates rehearsal summary

**Usage**:

```bash
# Run full rehearsal
./scripts/staging-rehearsal.sh

# Skip test execution for faster run
./scripts/staging-rehearsal.sh --skip-tests

# Skip backup creation
./scripts/staging-rehearsal.sh --skip-backup

# Show help
./scripts/staging-rehearsal.sh --help
```

**Environment Variables**:

- `ENVIRONMENT`: Environment name (default: `staging`)
- Uses `.env` file for database and service configuration

**Exit Codes**:

- `0`: Rehearsal successful, ready for production
- `1`: Rehearsal failed, do not proceed to production

**Example Output**:

```
╔════════════════════════════════════════╗
║  Staging Deployment Rehearsal         ║
╚════════════════════════════════════════╝
Environment: staging
Date: 2024-11-14 18:30:00

[Step 1] Running preflight checks
[✓] Step completed

[Step 2] Creating backup
[✓] Step completed
[✓] Backup tag: 20241114-183000

[Step 3] Checking current application state
[✓] Backend is healthy
[✓] Frontend is accessible
[✓] Step completed

[Step 4] Checking database state
[✓] Database connection successful
[✓] Current migration version: 000020
[✓] Database migration state: clean
[✓] Step completed

[Step 5] Pulling latest Docker images
[✓] Docker images pulled successfully
[✓] Step completed

[Step 6] Running database migrations
[✓] No new migrations to apply
[✓] Step completed

[Step 7] Deploying new version
[✓] Deployment successful
[✓] Step completed

[Step 8] Waiting for services to stabilize
[✓] Waiting 15 seconds...
[✓] Step completed

[Step 9] Running post-deployment health checks
[✓] Health checks passed
[✓] Step completed

[Step 10] Running smoke tests
[✓] ✓ Homepage loads
[✓] ✓ API ping successful
[✓] ✓ Health endpoint responds
[✓] ✓ Database accessible
[✓] ✓ Redis accessible
[✓] All smoke tests passed
[✓] Step completed

[Step 11] Testing rollback procedure (dry run)
[✓] Rollback script found: ./scripts/rollback.sh
[✓] To rollback: ./scripts/rollback.sh 20241114-183000
[✓] Step completed

[Step 12] Monitoring logs for errors
[✓] No errors found in recent logs
[✓] Step completed

╔════════════════════════════════════════╗
║  Rehearsal Summary                     ║
╚════════════════════════════════════════╝

Total Steps: 12
  Completed: 12
  Failed: 0

✓ Staging rehearsal completed successfully!

Next steps:
  1. Review the deployment process
  2. Test critical user flows manually
  3. Schedule production deployment
  4. Notify team of deployment plan
```

See [Migration Plan](../docs/MIGRATION_PLAN.md) for detailed procedures.

