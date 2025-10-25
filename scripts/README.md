# Deployment Scripts

This directory contains automation scripts for deploying, managing, and maintaining the Clipper application.

## Scripts Overview

| Script | Purpose | Requires Sudo |
|--------|---------|---------------|
| `deploy.sh` | Deploy application with automated backup and rollback | No |
| `rollback.sh` | Rollback to a previous version | No |
| `health-check.sh` | Run health checks on all services | No |
| `backup.sh` | Backup database and configuration | No |
| `setup-ssl.sh` | Set up SSL/TLS certificates | Yes |

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
sudo DOMAIN=clipper.example.com EMAIL=admin@example.com ./scripts/setup-ssl.sh

# Or export variables first
export DOMAIN=clipper.example.com
export EMAIL=admin@example.com
sudo ./scripts/setup-ssl.sh
```

**Environment Variables**:

- `DOMAIN`: Your domain name (default: `clipper.example.com`)
- `EMAIL`: Admin email for Let's Encrypt (default: `admin@example.com`)
- `WEBROOT`: Webroot for ACME challenge (default: `/var/www/certbot`)

**Requirements**:

- Domain must resolve to the server
- Port 80 must be open and accessible
- Nginx must be running
- Must run as root (use sudo)

**Example Output**:

```
=== SSL/TLS Certificate Setup (Let's Encrypt) ===
Domain: clipper.example.com
Email: admin@example.com

[INFO] Checking if clipper.example.com resolves to this server...
[INFO] Obtaining SSL certificate from Let's Encrypt...
[INFO] Certificate obtained successfully!
[INFO] Setting up automatic certificate renewal...
[INFO] Automatic renewal timer created and enabled
[INFO] Testing certificate renewal (dry run)...
[INFO] Certificate renewal test passed

Certificate Information:
  Certificate Name: clipper.example.com
    Serial Number: 1234567890abcdef
    Domains: clipper.example.com www.clipper.example.com
    Expiry Date: 2024-04-01 00:00:00+00:00 (89 days)

Certificate files location:
  Certificate: /etc/letsencrypt/live/clipper.example.com/fullchain.pem
  Private Key: /etc/letsencrypt/live/clipper.example.com/privkey.pem
  Chain: /etc/letsencrypt/live/clipper.example.com/chain.pem

Next steps:
  1. Update your nginx configuration to use the SSL certificate
  2. Test nginx config: nginx -t
  3. Reload nginx: systemctl reload nginx
  4. Test SSL: https://clipper.example.com

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
dig +short clipper.example.com
```

Check port 80:

```bash
sudo netstat -tlnp | grep :80
```

Test Certbot manually:

```bash
sudo certbot certonly --dry-run --nginx -d clipper.example.com
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
