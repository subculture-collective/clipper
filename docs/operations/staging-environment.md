---
title: "Staging Environment"
summary: "Complete guide to setting up and managing the Clipper staging environment"
tags: ["operations", "staging", "deployment", "infrastructure"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-16
aliases: ["staging", "staging setup", "test environment"]
---

# Staging Environment

Complete guide to setting up and managing the Clipper staging environment for safe deployment testing and validation.

## Overview

The staging environment is a production-mirror environment that enables:

- **Safe Deployment Testing**: Test deployments before production release
- **Migration Validation**: Verify database migrations don't break existing functionality
- **Feature Testing**: Test new features with real-like data and infrastructure
- **Integration Testing**: Validate third-party service integrations
- **Performance Testing**: Conduct load testing without affecting production
- **Blue/Green Testing**: Validate blue/green deployment procedures

## Architecture

Staging mirrors production architecture:

```
                         Internet
                            |
                     [DNS: staging.clpr.tv]
                            |
                    [Caddy Reverse Proxy]
                     (SSL Termination)
                            |
            ┌───────────────┴───────────────┐
            |                               |
    [Frontend Container]          [Backend Container]
     (nginx + React)                (Go API)
            |                               |
            └───────────────┬───────────────┘
                            |
                ┌───────────┼───────────┐
                |           |           |
          [PostgreSQL]  [Redis]   [OpenSearch]
           (Database)   (Cache)    (Search)
```

## Infrastructure Components

### Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Backend | clipper-staging-backend | 8080 | API server |
| Frontend | clipper-staging-frontend | 80 | React SPA |
| PostgreSQL | clipper-staging-postgres | 5437 | Database |
| Redis | clipper-staging-redis | 6379 | Cache & sessions |
| OpenSearch | clipper-staging-opensearch | 9201 | Search engine |
| Caddy | clipper-staging-caddy | 80/443 | Reverse proxy |

### Volumes

- `postgres_staging_data`: Database storage
- `postgres_staging_backups`: Database backups
- `redis_staging_data`: Redis persistence
- `opensearch_staging_data`: Search indexes
- `caddy_staging_data`: SSL certificates
- `caddy_staging_config`: Caddy configuration

## Setup Instructions

### Prerequisites

- **Server**: VPS or dedicated server (Ubuntu 20.04+ or Debian 11+)
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: Minimum 50GB SSD
- **Network**: Public IP address
- **DNS**: A record for `staging.clpr.tv` pointing to server IP
- **Access**: Root or sudo privileges

### Server Setup

1. **Choose a hosting provider**:
   - DigitalOcean (Droplet)
   - AWS (EC2)
   - Hetzner Cloud
   - Linode
   - Vultr

2. **Provision server**:
   ```bash
   # Example: 4GB RAM, 2 vCPU, 80GB SSD
   # Location: Same region as production for consistency
   ```

3. **Configure DNS**:
   ```
   A    staging.clpr.tv    →    [SERVER_IP]
   ```

### Automated Setup

Use the automated setup script (recommended):

```bash
# Clone repository
git clone https://github.com/subculture-collective/clipper.git
cd clipper

# Run setup script
sudo ./scripts/setup-staging.sh

# Follow prompts and configure as needed
```

The script will:
- ✅ Install Docker and Docker Compose
- ✅ Create staging directory structure
- ✅ Copy and configure docker-compose files
- ✅ Set up Caddyfile with SSL
- ✅ Create deployment user
- ✅ Configure log rotation
- ✅ Set up backup directories

### Manual Setup

<details>
<summary>Click to expand manual setup steps</summary>

#### 1. Install Docker

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin -y

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker
```

#### 2. Create Deployment User

```bash
# Create user
sudo useradd -m -s /bin/bash -G docker deploy

# Set up SSH
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Add your public key
sudo nano /home/deploy/.ssh/authorized_keys
# Paste your public SSH key

sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

#### 3. Create Staging Directory

```bash
sudo mkdir -p /opt/clipper-staging
sudo chown deploy:deploy /opt/clipper-staging
cd /opt/clipper-staging
```

#### 4. Copy Configuration Files

```bash
# Copy from your local machine or clone repo
# You need:
# - docker-compose.staging.yml → docker-compose.yml
# - Caddyfile.staging
# - .env.staging.example → .env
# - Dockerfile.postgres
```

#### 5. Configure Environment

```bash
# Copy environment template
cp .env.staging.example .env

# Edit with your values
nano .env
```

#### 6. Create Docker Network

```bash
docker network create web
```

</details>

## Configuration

### Environment Variables

Edit `/opt/clipper-staging/.env`:

#### Required Variables

```bash
# Database
POSTGRES_PASSWORD=<generate-secure-password>
DB_PASSWORD=<same-as-postgres-password>

# Redis
REDIS_PASSWORD=<generate-secure-password>

# JWT Keys
JWT_PRIVATE_KEY=<generate-rsa-private-key>
JWT_PUBLIC_KEY=<generate-rsa-public-key>

# Twitch API (use staging app)
TWITCH_CLIENT_ID=<staging-client-id>
TWITCH_CLIENT_SECRET=<staging-client-secret>
```

#### Generate Secure Values

```bash
# Password (32 characters)
openssl rand -base64 32

# JWT Keys
cd backend/scripts
./generate-jwt-keys.sh
# Copy output to .env
```

### Domain Configuration

Update domain in Caddyfile if not using `staging.clpr.tv`:

```bash
cd /opt/clipper-staging
sed -i 's/staging.clpr.tv/your-staging-domain.com/g' Caddyfile.staging
```

### SSL Certificate Setup

Caddy automatically obtains SSL certificates from Let's Encrypt:

1. **Verify DNS**: Ensure A record points to server
2. **Configure email** in `Caddyfile.staging`:
   ```
   tls ops@clipper.app
   ```
3. **Start Caddy**: Certificates obtained automatically

## Database Management

### Seeding Test Data

Seed the database with test data:

```bash
# Basic seed (run from project repository directory)
./scripts/seed-staging.sh

# Include comment threads
./scripts/seed-staging.sh

# Include load test data
./scripts/seed-staging.sh --load-test

# Custom seed file
./scripts/seed-staging.sh --seed-file /path/to/custom.sql
```

### Backups

Daily automatic backups are configured:

```bash
# Location
/var/backups/clipper-staging/

# Manual backup
cd /opt/clipper-staging
docker exec clipper-staging-postgres pg_dump -U clipper_staging clipper_staging_db | \
  gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Restore from backup
gunzip < backup-20231216-120000.sql.gz | \
  docker exec -i clipper-staging-postgres psql -U clipper_staging -d clipper_staging_db
```

### Migrations

Migrations run automatically during deployment:

```bash
# Manual migration
cd /opt/clipper-staging
docker exec clipper-staging-backend ./migrate up

# Check migration status
docker exec clipper-staging-backend ./migrate version

# Rollback last migration
docker exec clipper-staging-backend ./migrate down 1
```

## Deployment

### Automatic Deployment via CI/CD

Configured in `.github/workflows/deploy-staging.yml`:

**Trigger**: Push to `develop` branch

**Process**:
1. Build Docker images with `staging` tag
2. Push to GitHub Container Registry
3. SSH to staging server
4. Pull new images
5. Restart services with `docker compose up -d`
6. Run smoke tests

**Setup**:

Add GitHub secrets:
```
STAGING_HOST: staging-server-ip-or-hostname
DEPLOY_SSH_KEY: <deploy-user-private-key>
```

### Manual Deployment

```bash
# SSH to staging server
ssh deploy@staging.clpr.tv

# Navigate to staging directory
cd /opt/clipper-staging

# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

## Monitoring and Testing

### Health Checks

```bash
# Backend health
curl https://staging.clpr.tv/api/v1/health

# Frontend health
curl https://staging.clpr.tv/health.html

# Database health
docker exec clipper-staging-postgres pg_isready -U clipper_staging -d clipper_staging_db

# Redis health
docker exec clipper-staging-redis redis-cli --pass $REDIS_PASSWORD ping
```

### Smoke Tests

Run automated smoke tests:

```bash
# Run from project repository directory
./scripts/staging-rehearsal.sh
```

Manual smoke tests:
1. Visit `https://staging.clpr.tv`
2. Test user login
3. Create a submission
4. Test search functionality
5. Verify API responses

### Log Access

```bash
# All services
docker compose logs

# Specific service
docker compose logs backend
docker compose logs frontend
docker compose logs postgres

# Follow logs
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend

# Caddy access logs
sudo tail -f /var/log/caddy/staging-access.log
```

## Maintenance

### Updates

```bash
# Update Docker images
cd /opt/clipper-staging
docker compose pull
docker compose up -d

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Cleanup old images
docker system prune -a -f
```

### Data Reset

Periodically reset staging data:

```bash
# Stop services
docker compose down

# Remove data volumes
docker volume rm \
  clipper-staging_postgres_staging_data \
  clipper-staging_redis_staging_data \
  clipper-staging_opensearch_staging_data

# Start services
docker compose up -d

# Re-seed database
./scripts/seed-staging.sh
```

### Troubleshooting

#### Services Won't Start

```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check memory
free -h

# Restart all services
docker compose restart
```

#### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose logs caddy

# Verify DNS
nslookup staging.clpr.tv

# Force certificate renewal
docker exec clipper-staging-caddy caddy reload --config /etc/caddy/Caddyfile
```

#### Database Connection Issues

```bash
# Check PostgreSQL logs
docker compose logs postgres

# Verify credentials in .env
grep DB_PASSWORD /opt/clipper-staging/.env

# Test connection
docker exec clipper-staging-postgres \
  psql -U clipper_staging -d clipper_staging_db -c "SELECT 1;"
```

## Security

### Best Practices

- ✅ Use strong passwords (32+ characters)
- ✅ Enable SSL/TLS (automatic with Caddy)
- ✅ Separate credentials from production
- ✅ Rotate credentials quarterly
- ✅ Use test API keys for third-party services
- ✅ Limit SSH access (deploy user only)
- ✅ Enable firewall (UFW)
- ✅ Keep staging data non-sensitive
- ✅ Regular security updates

### Firewall Configuration

```bash
# Install UFW
sudo apt-get install ufw

# Configure rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Enable firewall
sudo ufw enable
```

## Differences from Production

| Aspect | Staging | Production |
|--------|---------|------------|
| **Domain** | staging.clpr.tv | clpr.tv |
| **Data** | Test data, seeded | Real user data |
| **API Keys** | Test/development keys | Production keys |
| **Logging** | DEBUG level | INFO level |
| **Rate Limits** | More lenient (120/min) | Strict (60/min) |
| **Feature Flags** | All enabled | Selective |
| **Backups** | 7 days retention | 30 days retention |
| **Monitoring** | Higher sample rate (50%) | Lower sample rate (10%) |
| **Resources** | 4GB RAM, 2 vCPU | 8GB+ RAM, 4+ vCPU |
| **Reset** | Periodic data reset | Never reset |

---

## Quick Reference

### Common Commands

```bash
# Status check
docker compose ps

# Restart service
docker compose restart backend

# View logs
docker compose logs -f backend

# Pull updates
docker compose pull && docker compose up -d

# Seed database
./scripts/seed-staging.sh

# Full rehearsal
./scripts/staging-rehearsal.sh

# Backup database
docker exec clipper-staging-postgres pg_dump -U clipper_staging clipper_staging_db | \
  gzip > backup-$(date +%Y%m%d).sql.gz
```

### URLs

- **Application**: https://staging.clpr.tv
- **API**: https://staging.clpr.tv/api/v1
- **Health**: https://staging.clpr.tv/api/v1/health
- **Caddy Admin**: http://localhost:2019 (server only)

### Support

- **Documentation**: `docs/operations/`
- **Scripts**: `scripts/`
- **Issues**: GitHub Issues
- **Team**: #ops-staging on Slack
