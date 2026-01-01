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
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ Loaded environment variables from .env"
else
    echo "WARNING: No .env file found. Using default values."
    echo "Create .env from .env.example and update the passwords."
    METABASE_DB_NAME=${METABASE_DB_NAME:-metabase}
    METABASE_DB_USER=${METABASE_DB_USER:-metabase}
    METABASE_DB_PASSWORD=${METABASE_DB_PASSWORD:-changeme}
fi

echo ""
echo "Creating Metabase database..."
echo "Database: $METABASE_DB_NAME"
echo "User: $METABASE_DB_USER"
echo ""

# Create Metabase database and user
docker exec -i clipper-postgres psql -U clipper -d clipper_db <<EOF
-- Check if database exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$METABASE_DB_NAME') THEN
        CREATE DATABASE $METABASE_DB_NAME;
        RAISE NOTICE 'Created database: $METABASE_DB_NAME';
    ELSE
        RAISE NOTICE 'Database $METABASE_DB_NAME already exists';
    END IF;
END
\$\$;

-- Check if user exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_user WHERE usename = '$METABASE_DB_USER') THEN
        CREATE USER $METABASE_DB_USER WITH ENCRYPTED PASSWORD '$METABASE_DB_PASSWORD';
        RAISE NOTICE 'Created user: $METABASE_DB_USER';
    ELSE
        RAISE NOTICE 'User $METABASE_DB_USER already exists';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $METABASE_DB_NAME TO $METABASE_DB_USER;
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
