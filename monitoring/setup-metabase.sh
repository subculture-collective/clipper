#!/bin/bash
# Setup script for Metabase initialization
# This script creates the Metabase database and starts the service

set -e

echo "================================================"
echo "Metabase Setup for Clipper"
echo "================================================"
echo ""

# Check if postgres container is running
if ! docker ps | grep -q clipper-postgres; then
    echo "ERROR: PostgreSQL container (clipper-postgres) is not running."
    echo "Please start the main Clipper services first:"
    echo "  docker-compose up -d postgres"
    exit 1
fi

echo "✓ PostgreSQL container is running"
echo ""

# Load environment variables
if [ -f .env ]; then
    # Safely load environment variables
    set -a
    source .env
    set +a
    echo "✓ Loaded environment variables from .env"
else
    echo "ERROR: No .env file found."
    echo "Create .env from .env.example and set strong values for:"
    echo "  - METABASE_DB_NAME"
    echo "  - METABASE_DB_USER"
    echo "  - METABASE_DB_PASSWORD"
    echo ""
    echo "Generate a strong password with: openssl rand -base64 32"
    exit 1
fi

# Validate required variables are set
if [ -z "${METABASE_DB_NAME:-}" ]; then
    echo "ERROR: METABASE_DB_NAME is not set in .env file"
    exit 1
fi

if [ -z "${METABASE_DB_USER:-}" ]; then
    echo "ERROR: METABASE_DB_USER is not set in .env file"
    exit 1
fi

if [ -z "${METABASE_DB_PASSWORD:-}" ]; then
    echo "ERROR: METABASE_DB_PASSWORD is not set in .env file"
    echo "Generate a strong password with: openssl rand -base64 32"
    exit 1
fi

# Validate password strength
if [ "${METABASE_DB_PASSWORD}" = "changeme" ]; then
    echo "ERROR: METABASE_DB_PASSWORD is set to a weak default value ('changeme')."
    echo "Please choose a strong password and update METABASE_DB_PASSWORD in your .env file."
    echo "Generate a strong password with: openssl rand -base64 32"
    exit 1
fi

if [ "${#METABASE_DB_PASSWORD}" -lt 12 ]; then
    echo "ERROR: METABASE_DB_PASSWORD is too short (minimum 12 characters required)."
    echo "Please choose a stronger password and update METABASE_DB_PASSWORD in your .env file."
    echo "Generate a strong password with: openssl rand -base64 32"
    exit 1
fi

echo ""
echo "Creating Metabase database..."
echo "Database: $METABASE_DB_NAME"
echo "User: $METABASE_DB_USER"
echo ""

# Create Metabase database and user using psql variables for safety
docker exec -i clipper-postgres psql -U clipper -d clipper_db \
    -v db_name="$METABASE_DB_NAME" \
    -v db_user="$METABASE_DB_USER" \
    -v db_password="$METABASE_DB_PASSWORD" <<'EOF'
-- Check if database exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name') THEN
        EXECUTE format('CREATE DATABASE %I', :'db_name');
        RAISE NOTICE 'Created database: %', :'db_name';
    ELSE
        RAISE NOTICE 'Database % already exists', :'db_name';
    END IF;
END
$$;

-- Check if user exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = :'db_user') THEN
        EXECUTE format('CREATE USER %I WITH ENCRYPTED PASSWORD %L', :'db_user', :'db_password');
        RAISE NOTICE 'Created user: %', :'db_user';
    ELSE
        RAISE NOTICE 'User % already exists', :'db_user';
    END IF;
END
$$;

-- Grant privileges
DO $$
BEGIN
    EXECUTE format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db_name', :'db_user');
END
$$;
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Metabase database created successfully"
else
    echo ""
    echo "ERROR: Failed to create Metabase database"
    exit 1
fi

echo ""
echo "Starting Metabase container..."
docker-compose -f docker-compose.monitoring.yml up -d metabase

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✓ Metabase setup complete!"
    echo "================================================"
    echo ""
    echo "Access Metabase at: http://localhost:13000"
    echo ""
    echo "Next steps:"
    echo "1. Wait 30-60 seconds for Metabase to start"
    echo "2. Open http://localhost:13000 in your browser"
    echo "3. Create an admin account"
    echo "4. Connect to the Clipper database:"
    echo "   - Host: postgres"
    echo "   - Port: 5432"
    echo "   - Database: clipper_db"
    echo "   - User: clipper"
    echo "   - Password: <your clipper db password>"
    echo ""
    echo "For dashboard setup, see: monitoring/metabase/README.md"
    echo "================================================"
else
    echo ""
    echo "ERROR: Failed to start Metabase container"
    exit 1
fi
