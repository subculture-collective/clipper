#!/bin/bash
set -euo pipefail

# Staging Environment Setup Script
# This script sets up a complete staging environment that mirrors production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
STAGING_DIR="${STAGING_DIR:-/opt/clipper-staging}"
STAGING_DOMAIN="${STAGING_DOMAIN:-staging.clpr.tv}"
SKIP_DOCKER_INSTALL="${SKIP_DOCKER_INSTALL:-false}"
SKIP_SSL_SETUP="${SKIP_SSL_SETUP:-false}"
SKIP_SEED="${SKIP_SEED:-false}"

# Usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Setup script for Clipper staging environment.

OPTIONS:
    --staging-dir PATH      Installation directory (default: /opt/clipper-staging)
    --domain DOMAIN         Staging domain (default: staging.clpr.tv)
    --skip-docker          Skip Docker installation
    --skip-ssl             Skip SSL certificate setup
    --skip-seed            Skip database seeding
    -h, --help             Show this help message

EXAMPLES:
    $0
    $0 --staging-dir /home/deploy/staging --domain staging.example.com
    $0 --skip-docker --skip-ssl

PREREQUISITES:
    - Root or sudo access
    - Ubuntu 20.04+ or Debian 11+
    - Internet connectivity
    - DNS A record pointing to server IP

EOF
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --staging-dir)
            STAGING_DIR="$2"
            shift 2
            ;;
        --domain)
            STAGING_DOMAIN="$2"
            shift 2
            ;;
        --skip-docker)
            SKIP_DOCKER_INSTALL=true
            shift
            ;;
        --skip-ssl)
            SKIP_SSL_SETUP=true
            shift
            ;;
        --skip-seed)
            SKIP_SEED=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            ;;
    esac
done

# Logging functions
log_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
}

log_step() {
    echo -e "\n${BLUE}[Step]${NC} $1"
}

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running as root or with sudo
check_privileges() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi
}

log_header "Clipper Staging Environment Setup"
echo "Staging Directory: $STAGING_DIR"
echo "Staging Domain: $STAGING_DOMAIN"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Step 1: Check prerequisites
log_step "Checking prerequisites"
check_privileges
log_info "Running with sufficient privileges"

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    log_info "Operating System: $NAME $VERSION"
else
    log_warn "Could not detect OS version"
fi

# Step 2: Install Docker (if needed)
if [ "$SKIP_DOCKER_INSTALL" = false ]; then
    log_step "Installing Docker"
    
    if command_exists docker; then
        log_info "Docker already installed: $(docker --version)"
    else
        log_info "Installing Docker..."
        
        # Update package index
        apt-get update -qq
        
        # Install prerequisites
        apt-get install -y -qq \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release
        
        # Add Docker's official GPG key
        mkdir -p /etc/apt/keyrings
        
        # Detect OS and use appropriate repository
        if [ -f /etc/debian_version ]; then
            OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')
            if [ "$OS_ID" = "ubuntu" ]; then
                curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
                    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                echo \
                    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
                    $(lsb_release -cs) stable" | \
                    tee /etc/apt/sources.list.d/docker.list > /dev/null
            elif [ "$OS_ID" = "debian" ]; then
                curl -fsSL https://download.docker.com/linux/debian/gpg | \
                    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
                echo \
                    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
                    $(lsb_release -cs) stable" | \
                    tee /etc/apt/sources.list.d/docker.list > /dev/null
            else
                log_error "Unsupported OS: $OS_ID"
                exit 1
            fi
        else
            log_error "Could not detect Debian-based OS"
            exit 1
        fi
        
        # Install Docker
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
        
        # Enable Docker service
        systemctl enable docker
        systemctl start docker
        
        log_info "Docker installed: $(docker --version)"
    fi
    
    # Check Docker Compose
    if docker compose version >/dev/null 2>&1; then
        log_info "Docker Compose available: $(docker compose version)"
    else
        log_error "Docker Compose plugin not available"
        exit 1
    fi
else
    log_info "Skipping Docker installation (--skip-docker flag)"
fi

# Step 3: Create staging directory
log_step "Creating staging directory"

if [ ! -d "$STAGING_DIR" ]; then
    mkdir -p "$STAGING_DIR"
    log_info "Created directory: $STAGING_DIR"
else
    log_info "Directory already exists: $STAGING_DIR"
fi

cd "$STAGING_DIR"

# Step 4: Copy configuration files
log_step "Copying configuration files"

# Copy docker-compose file
if [ -f "$PROJECT_ROOT/docker-compose.staging.yml" ]; then
    cp "$PROJECT_ROOT/docker-compose.staging.yml" "$STAGING_DIR/docker-compose.yml"
    log_info "Copied docker-compose.staging.yml"
else
    log_error "docker-compose.staging.yml not found in project root"
    exit 1
fi

# Copy Caddyfile
if [ -f "$PROJECT_ROOT/Caddyfile.staging" ]; then
    cp "$PROJECT_ROOT/Caddyfile.staging" "$STAGING_DIR/Caddyfile.staging"
    # Update domain in Caddyfile
    sed -i "s/staging\.clpr\.tv/$STAGING_DOMAIN/g" "$STAGING_DIR/Caddyfile.staging"
    log_info "Copied and configured Caddyfile.staging"
else
    log_error "Caddyfile.staging not found in project root"
    exit 1
fi

# Copy Dockerfile.postgres if needed
if [ -f "$PROJECT_ROOT/Dockerfile.postgres" ]; then
    cp "$PROJECT_ROOT/Dockerfile.postgres" "$STAGING_DIR/Dockerfile.postgres"
    log_info "Copied Dockerfile.postgres"
fi

# Step 5: Create .env file
log_step "Creating environment configuration"

if [ ! -f "$STAGING_DIR/.env" ]; then
    if [ -f "$PROJECT_ROOT/.env.staging.example" ]; then
        cp "$PROJECT_ROOT/.env.staging.example" "$STAGING_DIR/.env"
        log_info "Created .env from example"
        log_warn "IMPORTANT: Edit $STAGING_DIR/.env with your actual values"
        log_warn "Generate secure passwords: openssl rand -base64 32"
        log_warn "Generate JWT keys: $PROJECT_ROOT/backend/scripts/generate-jwt-keys.sh"
    else
        log_error ".env.staging.example not found"
        exit 1
    fi
else
    log_info ".env file already exists"
fi

# Step 6: Set up SSL certificates
if [ "$SKIP_SSL_SETUP" = false ]; then
    log_step "Setting up SSL certificates"
    
    # Check if certbot is installed
    if ! command_exists certbot; then
        log_info "Installing certbot..."
        apt-get install -y -qq certbot
    fi
    
    log_info "SSL certificate will be automatically obtained by Caddy"
    log_info "Ensure DNS A record for $STAGING_DOMAIN points to this server"
else
    log_info "Skipping SSL setup (--skip-ssl flag)"
fi

# Step 7: Create external network
log_step "Creating Docker network"

if ! docker network inspect web >/dev/null 2>&1; then
    docker network create web
    log_info "Created 'web' network"
else
    log_info "'web' network already exists"
fi

# Step 8: Pull Docker images
log_step "Pulling Docker images"

cd "$STAGING_DIR"
if docker compose pull 2>&1 | grep -v "Pulling"; then
    log_info "Docker images pulled"
else
    log_error "Failed to pull Docker images"
    log_error "Check network connectivity and registry access"
    exit 1
fi

# Step 9: Create deployment user
log_step "Creating deployment user"

if ! id -u deploy >/dev/null 2>&1; then
    useradd -m -s /bin/bash -G docker deploy
    log_info "Created 'deploy' user"
    
    # Set up SSH directory
    mkdir -p /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chown deploy:deploy /home/deploy/.ssh
    
    log_info "SSH directory created for deploy user"
    log_warn "Add your public SSH key to /home/deploy/.ssh/authorized_keys"
else
    log_info "'deploy' user already exists"
fi

# Set ownership
chown -R deploy:deploy "$STAGING_DIR"

# Step 10: Generate JWT keys (if not present in .env)
log_step "Checking JWT keys"

if grep -q "CHANGEME" "$STAGING_DIR/.env"; then
    log_warn "JWT keys not configured in .env"
    
    if [ -f "$PROJECT_ROOT/backend/scripts/generate-jwt-keys.sh" ]; then
        log_info "Run this to generate JWT keys:"
        echo "  cd $PROJECT_ROOT/backend/scripts && ./generate-jwt-keys.sh"
        echo "  Then update $STAGING_DIR/.env with the generated keys"
    fi
fi

# Step 11: Create backup directories
log_step "Creating backup directories"

mkdir -p "$STAGING_DIR/backups/db"
mkdir -p "$STAGING_DIR/backups/configs"
mkdir -p /var/backups/clipper-staging

chown -R deploy:deploy "$STAGING_DIR/backups"
chown -R deploy:deploy /var/backups/clipper-staging

log_info "Backup directories created"

# Step 12: Set up log rotation
log_step "Setting up log rotation"

cat > /etc/logrotate.d/clipper-staging << 'LOGROTATE'
/var/log/caddy/staging-*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
    sharedscripts
    postrotate
        docker exec clipper-staging-caddy caddy reload --config /etc/caddy/Caddyfile || true
    endscript
}
LOGROTATE

log_info "Log rotation configured"

# Summary
log_header "Setup Complete!"

echo ""
echo "Next steps:"
echo ""
echo "1. Configure environment variables:"
echo "   sudo nano $STAGING_DIR/.env"
echo ""
echo "2. Update these required values:"
echo "   - POSTGRES_PASSWORD"
echo "   - REDIS_PASSWORD"
echo "   - JWT_PRIVATE_KEY and JWT_PUBLIC_KEY"
echo "   - TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET"
echo ""
echo "3. Start the services:"
echo "   cd $STAGING_DIR"
echo "   docker compose up -d"
echo ""
echo "4. Seed the database (optional):"
echo "   $SCRIPT_DIR/seed-staging.sh"
echo ""
echo "5. Verify the deployment:"
echo "   curl https://$STAGING_DOMAIN/health"
echo ""
echo "6. Set up GitHub secrets for CI/CD:"
echo "   STAGING_HOST: $(hostname -I | awk '{print $1}')"
echo "   DEPLOY_SSH_KEY: /home/deploy/.ssh/id_rsa"
echo ""
echo "Documentation: $PROJECT_ROOT/docs/operations/staging-environment.md"
echo ""
