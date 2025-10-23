# Infrastructure Guide

This guide covers production infrastructure setup, configuration, and maintenance for the Clipper application.

## Table of Contents
- [Overview](#overview)
- [Hosting Platform Options](#hosting-platform-options)
- [Server Setup](#server-setup)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Reverse Proxy & SSL](#reverse-proxy--ssl)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Security](#security)

## Overview

The Clipper application consists of:
- **Backend**: Go API server (port 8080)
- **Frontend**: React SPA served by Nginx (port 80/443)
- **PostgreSQL**: Database (port 5436)
- **Redis**: Cache and session store (port 6379)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │   Nginx (443)   │  ◄── SSL/TLS Termination
            │   Load Balancer │      Rate Limiting
            └────────┬────────┘      Caching
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  Frontend (80)  │    │  Backend (8080) │
│  Nginx + React  │    │   Go + Gin      │
└─────────────────┘    └────────┬────────┘
                                │
                    ┌───────────┴──────────┐
                    │                      │
                    ▼                      ▼
         ┌──────────────────┐   ┌──────────────────┐
         │ PostgreSQL:5436  │   │   Redis:6379     │
         │   Database       │   │   Cache          │
         └──────────────────┘   └──────────────────┘
```

## Hosting Platform Options

### Option 1: VPS (Recommended for starting)

**Providers**: DigitalOcean, Linode, Vultr, Hetzner

**Pros**:
- Full control over the server
- Cost-effective ($5-20/month for basic setup)
- Simple and predictable pricing
- Easy to understand and maintain

**Cons**:
- Requires DevOps knowledge
- Manual scaling
- You manage backups and monitoring

**Recommended Configuration**:
- **Starter**: 2 CPU, 4GB RAM, 80GB SSD ($12/month)
- **Production**: 4 CPU, 8GB RAM, 160GB SSD ($24/month)

**Setup Instructions**: [VPS Setup](#vps-setup)

### Option 2: Cloud Platform (Scalable)

**Providers**: AWS (EC2, RDS, ElastiCache), GCP, Azure

**Pros**:
- Highly scalable
- Managed services available
- Global infrastructure
- Advanced features (auto-scaling, load balancing)

**Cons**:
- More complex setup
- Higher cost
- Steeper learning curve

**Recommended Configuration**:
- **Compute**: t3.small or t3.medium EC2 instances
- **Database**: RDS PostgreSQL (db.t3.small)
- **Cache**: ElastiCache Redis (cache.t3.micro)
- **Load Balancer**: Application Load Balancer
- **Storage**: S3 for backups and assets

**Estimated Cost**: $50-150/month

### Option 3: Platform as a Service (Easiest)

**Providers**: Fly.io, Railway, Render

**Pros**:
- Extremely easy deployment
- Automatic scaling
- Built-in SSL, monitoring
- Git-based deployments

**Cons**:
- Less control
- Can be expensive at scale
- Limited customization

**Recommended**: Best for MVP and getting started quickly

## Server Setup

### VPS Setup

#### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Create deploy user
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

# Set up SSH key authentication
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
# Add your public key to /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# Disable password authentication
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

#### 2. Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install -y nginx

# Install other utilities
sudo apt install -y curl wget git htop ufw fail2ban
```

#### 3. Configure Firewall

```bash
# Set up UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

#### 4. Set up Fail2ban

```bash
# Configure fail2ban for SSH protection
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create jail configuration
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF

sudo systemctl restart fail2ban
```

#### 5. Enable Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Database Configuration

### Option 1: Managed Database (Recommended)

Use managed PostgreSQL from:
- **DigitalOcean Managed Databases**: Starting at $15/month
- **AWS RDS**: Starting at $15/month
- **GCP Cloud SQL**: Starting at $10/month

**Benefits**:
- Automatic backups
- Point-in-time recovery
- Automatic updates
- High availability
- No maintenance required

### Option 2: Self-Hosted PostgreSQL

If using Docker Compose (included in `docker-compose.prod.yml`):

```bash
# Already configured in docker-compose.prod.yml
# Data is persisted in postgres_data volume
# Backups handled by scripts/backup.sh
```

**Configuration Best Practices**:

```bash
# Set proper PostgreSQL configuration
# Edit docker-compose.prod.yml to add:
environment:
  - POSTGRES_INITDB_ARGS=--encoding=UTF8 --lc-collate=C --lc-ctype=C
  - POSTGRES_MAX_CONNECTIONS=100
  - POSTGRES_SHARED_BUFFERS=256MB
```

### Connection Pooling with PgBouncer

For production, use connection pooling:

```yaml
# Add to docker-compose.prod.yml
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      - DATABASES_HOST=postgres
      - DATABASES_PORT=5436
      - DATABASES_USER=clipper
      - DATABASES_PASSWORD=${POSTGRES_PASSWORD}
      - DATABASES_DBNAME=clipper
      - PGBOUNCER_POOL_MODE=transaction
      - PGBOUNCER_MAX_CLIENT_CONN=1000
      - PGBOUNCER_DEFAULT_POOL_SIZE=25
    ports:
      - "6432:6432"
    depends_on:
      - postgres
```

Then update `DATABASE_URL` to use port 6432.

### Database Migrations

Create migration strategy:

```bash
# 1. Test migrations on staging first
# 2. Backup database before production migration
# 3. Use migration tool (goose, migrate, etc.)

# Example migration workflow:
./scripts/backup.sh              # Backup before migration
./scripts/migrate.sh up          # Run migrations
./scripts/health-check.sh        # Verify app still works
```

## Redis Configuration

### Option 1: Managed Redis

- **DigitalOcean Managed Redis**: Starting at $15/month
- **AWS ElastiCache**: Starting at $15/month
- **Redis Cloud**: Free tier available

### Option 2: Self-Hosted Redis

Already configured in `docker-compose.prod.yml`:

```yaml
redis:
  image: redis:8-alpine
  command: >
    redis-server
    --appendonly yes
    --appendfilename "appendonly.aof"
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
```

**Redis Security**:

```bash
# Update .env with strong Redis password
REDIS_PASSWORD=your_secure_redis_password
REDIS_URL=redis://:your_secure_redis_password@redis:6379
```

## Reverse Proxy & SSL

### Nginx Setup

#### 1. Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Copy SSL configuration
sudo cp nginx/nginx-ssl.conf /etc/nginx/sites-available/clipper
sudo ln -s /etc/nginx/sites-available/clipper /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

#### 2. Obtain SSL Certificate

```bash
# Set your domain and email
export DOMAIN=clipper.example.com
export EMAIL=admin@example.com

# Run SSL setup script
sudo ./scripts/setup-ssl.sh
```

**Manual SSL Setup**:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d clipper.example.com -d www.clipper.example.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### SSL/TLS Best Practices

- ✅ Use TLS 1.2 and 1.3 only
- ✅ Enable HSTS with preload
- ✅ Enable OCSP stapling
- ✅ Use strong cipher suites
- ✅ Redirect HTTP to HTTPS
- ✅ Set up automatic certificate renewal

### CDN Integration (Optional)

Use Cloudflare for additional benefits:

1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers
4. Enable:
   - SSL/TLS (Full or Full Strict)
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - Brotli compression
   - Cache static assets

## Monitoring & Logging

### Application Monitoring

#### Option 1: Self-Hosted (Prometheus + Grafana)

```yaml
# Add to docker-compose.prod.yml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
```

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'clipper-backend'
    static_configs:
      - targets: ['backend:8080']
```

#### Option 2: Managed Services

- **Datadog**: Full-stack monitoring ($15/host/month)
- **New Relic**: Application performance monitoring (free tier available)
- **Sentry**: Error tracking (free tier available)

### Logging

#### Centralized Logging with Loki

```yaml
# Add to docker-compose.prod.yml
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

### Alerts Configuration

Set up alerts for:

```yaml
# Example Prometheus alert rules
groups:
  - name: clipper_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        annotations:
          summary: "High response time detected"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        annotations:
          summary: "Service is down"
```

## Backup & Recovery

### Automated Backups

```bash
# Set up automated backups with cron
sudo crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/clipper/scripts/backup.sh

# Add weekly full backup on Sunday at 3 AM
0 3 * * 0 /opt/clipper/scripts/backup.sh
```

### Backup to S3 (Recommended)

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Modify backup.sh to upload to S3
# Add at the end of backup.sh:
aws s3 sync $BACKUP_DIR s3://your-bucket/clipper-backups/ --storage-class STANDARD_IA
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective)**: < 1 hour
**RPO (Recovery Point Objective)**: < 5 minutes (with WAL archiving)

**Recovery Steps**:

1. **Provision New Server**:
   ```bash
   # Follow server setup steps
   # Install Docker and dependencies
   ```

2. **Restore Database**:
   ```bash
   # Download latest backup
   aws s3 cp s3://your-bucket/clipper-backups/db-latest.sql.gz .
   
   # Restore
   gunzip < db-latest.sql.gz | docker-compose exec -T postgres psql -U clipper -d clipper
   ```

3. **Restore Configuration**:
   ```bash
   # Copy configuration files
   aws s3 sync s3://your-bucket/clipper-backups/config-latest/ /opt/clipper/
   ```

4. **Start Services**:
   ```bash
   cd /opt/clipper
   docker-compose up -d
   ./scripts/health-check.sh
   ```

5. **Update DNS** (if needed):
   - Update A records to point to new server
   - Wait for propagation (5-60 minutes)

### Backup Testing

Test recovery quarterly:

```bash
# 1. Create test environment
# 2. Restore latest backup
# 3. Verify application functionality
# 4. Document any issues
# 5. Update recovery procedures
```

## Security

### Security Checklist

- [ ] SSH key-only authentication
- [ ] Firewall configured (UFW)
- [ ] Fail2ban enabled
- [ ] Automatic security updates enabled
- [ ] Strong passwords for all services
- [ ] SSL/TLS with strong configuration
- [ ] Security headers in Nginx
- [ ] Rate limiting enabled
- [ ] Regular security audits
- [ ] Dependency updates (Dependabot)
- [ ] CodeQL security scanning
- [ ] Container vulnerability scanning (Trivy)

### Security Updates

```bash
# Check for security updates
sudo apt update
sudo apt list --upgradable

# Apply updates
sudo apt upgrade -y

# Reboot if kernel updated
sudo reboot
```

### Security Monitoring

Monitor for:
- Failed login attempts
- Unusual traffic patterns
- High error rates
- Slow response times
- Disk space issues
- Memory/CPU usage

### Incident Response

1. **Identify**: Monitor alerts and logs
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore from backups
5. **Document**: Write incident report
6. **Improve**: Update security measures

## Maintenance

### Regular Maintenance Tasks

**Daily**:
- Monitor health checks
- Review error logs
- Check backup status

**Weekly**:
- Review security logs
- Check disk space
- Review performance metrics
- Update dependencies

**Monthly**:
- Review and rotate logs
- Update system packages
- Review and optimize database
- Test backup restoration
- Review access logs

**Quarterly**:
- Security audit
- Performance review
- Disaster recovery test
- Update documentation

### Scaling Considerations

**Vertical Scaling** (Increase server resources):
- Upgrade to larger server
- Add more CPU/RAM
- Faster disks (SSD)

**Horizontal Scaling** (Add more servers):
- Multiple backend instances
- Load balancer (Nginx/HAProxy)
- Database replication
- Redis clustering

## Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting guide.

## Support

For infrastructure issues:
1. Check logs: `docker-compose logs -f`
2. Check health: `./scripts/health-check.sh`
3. Review documentation
4. Open issue on GitHub

## Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [CI-CD.md](./CI-CD.md) - CI/CD pipeline details
- [SETUP.md](./SETUP.md) - Development setup
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
