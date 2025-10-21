#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${DOMAIN:-clipper.example.com}"
EMAIL="${EMAIL:-admin@example.com}"
WEBROOT="${WEBROOT:-/var/www/certbot}"

echo -e "${GREEN}=== SSL/TLS Certificate Setup (Let's Encrypt) ===${NC}"
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Webroot: $WEBROOT"
echo ""

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Check if certbot is installed
if ! command -v certbot >/dev/null 2>&1; then
    log_warn "Certbot is not installed. Installing..."
    
    if command -v apt-get >/dev/null 2>&1; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
        log_info "Certbot installed successfully"
    elif command -v yum >/dev/null 2>&1; then
        yum install -y certbot python3-certbot-nginx
        log_info "Certbot installed successfully"
    else
        log_error "Unable to install certbot. Please install manually."
        exit 1
    fi
fi

# Check if nginx is installed
if ! command -v nginx >/dev/null 2>&1; then
    log_error "Nginx is not installed. Please install nginx first."
    exit 1
fi

# Create webroot directory
if [ ! -d "$WEBROOT" ]; then
    log_info "Creating webroot directory: $WEBROOT"
    mkdir -p "$WEBROOT"
fi

# Check if domain resolves to this server
log_info "Checking if $DOMAIN resolves to this server..."
SERVER_IP=$(hostname -I | awk '{print $1}')
DOMAIN_IP=$(dig +short "$DOMAIN" | tail -n1)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    log_warn "Domain $DOMAIN does not appear to resolve to this server"
    log_warn "Server IP: $SERVER_IP"
    log_warn "Domain IP: $DOMAIN_IP"
    echo ""
    read -p "Continue anyway? (yes/no): " CONTINUE
    if [ "$CONTINUE" != "yes" ]; then
        log_info "Aborted"
        exit 0
    fi
fi

# Obtain certificate
log_info "Obtaining SSL certificate from Let's Encrypt..."
log_warn "Make sure port 80 is open and accessible from the internet"
echo ""

# Use certbot with nginx plugin
if certbot certonly --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"; then
    log_info "Certificate obtained successfully!"
else
    log_error "Failed to obtain certificate"
    log_info "Troubleshooting tips:"
    log_info "  1. Ensure port 80 is open and accessible"
    log_info "  2. Verify DNS is correctly configured"
    log_info "  3. Check nginx is running: systemctl status nginx"
    log_info "  4. Check nginx logs: journalctl -u nginx"
    exit 1
fi

# Set up automatic renewal
log_info "Setting up automatic certificate renewal..."

# Create systemd timer for renewal (if not exists)
if [ ! -f "/etc/systemd/system/certbot-renewal.timer" ]; then
    cat > /etc/systemd/system/certbot-renewal.timer << 'EOF'
[Unit]
Description=Certbot Renewal Timer

[Timer]
OnCalendar=daily
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
EOF

    cat > /etc/systemd/system/certbot-renewal.service << 'EOF'
[Unit]
Description=Certbot Renewal

[Service]
Type=oneshot
ExecStart=/usr/bin/certbot renew --quiet --deploy-hook "systemctl reload nginx"
EOF

    systemctl daemon-reload
    systemctl enable certbot-renewal.timer
    systemctl start certbot-renewal.timer
    
    log_info "Automatic renewal timer created and enabled"
else
    log_info "Automatic renewal timer already exists"
fi

# Test renewal
log_info "Testing certificate renewal (dry run)..."
if certbot renew --dry-run; then
    log_info "Certificate renewal test passed"
else
    log_warn "Certificate renewal test failed, but certificate is installed"
fi

# Display certificate information
echo ""
log_info "Certificate Information:"
certbot certificates

echo ""
log_info "Certificate files location:"
log_info "  Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
log_info "  Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
log_info "  Chain: /etc/letsencrypt/live/$DOMAIN/chain.pem"

echo ""
log_info "Next steps:"
log_info "  1. Update your nginx configuration to use the SSL certificate"
log_info "  2. Test nginx config: nginx -t"
log_info "  3. Reload nginx: systemctl reload nginx"
log_info "  4. Test SSL: https://$DOMAIN"

echo -e "${GREEN}=== SSL Setup Complete ===${NC}"
