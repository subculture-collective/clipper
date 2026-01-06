#!/bin/bash

# Setup test environment with all required configurations
# This script ensures all skipped tests can run by providing necessary env vars

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up test environment...${NC}"

# Generate a 32-byte key for MFA encryption (required for MFA tests)
if [ -z "$MFA_ENCRYPTION_KEY" ]; then
    export MFA_ENCRYPTION_KEY=$(openssl rand -base64 32)
    echo -e "${GREEN}✓ Generated MFA_ENCRYPTION_KEY${NC}"
else
    echo -e "${GREEN}✓ Using existing MFA_ENCRYPTION_KEY${NC}"
fi

# Stripe webhook secret for webhook signature testing
if [ -z "$TEST_STRIPE_WEBHOOK_SECRET" ]; then
    export TEST_STRIPE_WEBHOOK_SECRET="whsec_test_$(openssl rand -hex 24)"
    echo -e "${GREEN}✓ Generated TEST_STRIPE_WEBHOOK_SECRET${NC}"
else
    echo -e "${GREEN}✓ Using existing TEST_STRIPE_WEBHOOK_SECRET${NC}"
fi

# Set Stripe webhook secret for the main config too
export STRIPE_WEBHOOK_SECRET="${TEST_STRIPE_WEBHOOK_SECRET}"

# OpenSearch/Elasticsearch configuration for semantic search
if [ -z "$OPENSEARCH_URL" ]; then
    export OPENSEARCH_URL="http://localhost:9201"
    echo -e "${GREEN}✓ Set OPENSEARCH_URL=${OPENSEARCH_URL}${NC}"
fi

# Test database configuration
export TEST_DATABASE_HOST="${TEST_DATABASE_HOST:-localhost}"
export TEST_DATABASE_PORT="${TEST_DATABASE_PORT:-5437}"
export TEST_DATABASE_USER="${TEST_DATABASE_USER:-clipper}"
export TEST_DATABASE_PASSWORD="${TEST_DATABASE_PASSWORD:-clipper_password}"
export TEST_DATABASE_NAME="${TEST_DATABASE_NAME:-clipper_test}"

# Redis test configuration
export TEST_REDIS_HOST="${TEST_REDIS_HOST:-localhost}"
export TEST_REDIS_PORT="${TEST_REDIS_PORT:-6380}"

echo -e "${GREEN}✓ Test database configured${NC}"

# JWT secrets for testing
if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET="test_jwt_secret_$(openssl rand -hex 16)"
    echo -e "${GREEN}✓ Generated JWT_SECRET${NC}"
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    export JWT_REFRESH_SECRET="test_jwt_refresh_secret_$(openssl rand -hex 16)"
    echo -e "${GREEN}✓ Generated JWT_REFRESH_SECRET${NC}"
fi

# Twitch credentials (can use test values)
export TWITCH_CLIENT_ID="${TWITCH_CLIENT_ID:-test_client_id}"
export TWITCH_CLIENT_SECRET="${TWITCH_CLIENT_SECRET:-test_client_secret}"

# Session secret
if [ -z "$SESSION_SECRET" ]; then
    export SESSION_SECRET=$(openssl rand -base64 32)
    echo -e "${GREEN}✓ Generated SESSION_SECRET${NC}"
fi

# Create .env.test file for persistence
cat > .env.test <<EOF
# Auto-generated test environment configuration
# Generated on $(date)

# MFA Configuration
MFA_ENCRYPTION_KEY=${MFA_ENCRYPTION_KEY}

# Stripe Configuration
TEST_STRIPE_WEBHOOK_SECRET=${TEST_STRIPE_WEBHOOK_SECRET}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

# OpenSearch Configuration
OPENSEARCH_URL=${OPENSEARCH_URL}

# Database Configuration
TEST_DATABASE_HOST=${TEST_DATABASE_HOST}
TEST_DATABASE_PORT=${TEST_DATABASE_PORT}
TEST_DATABASE_USER=${TEST_DATABASE_USER}
TEST_DATABASE_PASSWORD=${TEST_DATABASE_PASSWORD}
TEST_DATABASE_NAME=${TEST_DATABASE_NAME}

# Redis Configuration
TEST_REDIS_HOST=${TEST_REDIS_HOST}
TEST_REDIS_PORT=${TEST_REDIS_PORT}

# JWT Configuration
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Session Configuration
SESSION_SECRET=${SESSION_SECRET}

# Twitch Configuration
TWITCH_CLIENT_ID=${TWITCH_CLIENT_ID}
TWITCH_CLIENT_SECRET=${TWITCH_CLIENT_SECRET}
EOF

echo -e "${GREEN}✓ Created .env.test file${NC}"
echo ""
echo -e "${YELLOW}Test environment is ready!${NC}"
echo -e "${YELLOW}To use this environment in your shell, run:${NC}"
echo -e "  ${GREEN}source backend/.env.test${NC}"
echo ""
echo -e "${YELLOW}Or source it before running tests:${NC}"
echo -e "  ${GREEN}set -a; source backend/.env.test; set +a; make test INTEGRATION=1 E2E=1${NC}"
