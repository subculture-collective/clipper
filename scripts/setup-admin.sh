#!/bin/bash

# Setup Admin/Moderator Users for Local Development
# This script helps set up admin and moderator users for local development

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-clipper}"
DB_USER="${DB_USER:-clipper}"
DB_CONTAINER="${DB_CONTAINER:-clipper-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Usage information
usage() {
    echo "Usage: $0 <username> [role]"
    echo ""
    echo "Arguments:"
    echo "  username    The username to update (required)"
    echo "  role        The role to assign: admin, moderator, or user (default: admin)"
    echo ""
    echo "Examples:"
    echo "  $0 myusername admin"
    echo "  $0 myusername moderator"
    echo "  $0 myusername"
    echo ""
    exit 1
}

# Check if username is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Username is required${NC}"
    usage
fi

USERNAME=$1
ROLE=${2:-admin}

# Validate role
if [[ ! "$ROLE" =~ ^(admin|moderator|user)$ ]]; then
    echo -e "${RED}Error: Invalid role '$ROLE'. Must be: admin, moderator, or user${NC}"
    exit 1
fi

echo -e "${GREEN}Setting up user '${USERNAME}' with role '${ROLE}'...${NC}"
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}Error: Docker is not running or you don't have permission${NC}"
    exit 1
fi

# Check if database container is running
if ! docker ps | grep -q "$DB_CONTAINER"; then
    echo -e "${YELLOW}Warning: Database container '$DB_CONTAINER' is not running${NC}"
    echo "Starting Docker services..."
    docker compose up -d postgres
    echo "Waiting for database to be ready..."
    sleep 5
fi

# Update user role
echo "Updating user role in database..."
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" <<EOF
DO \$\$
DECLARE
    user_count INTEGER;
BEGIN
    -- Check if user exists
    SELECT COUNT(*) INTO user_count FROM users WHERE username = '$USERNAME';
    
    IF user_count = 0 THEN
        RAISE NOTICE 'User ''%'' not found. Please log in with this user first.', '$USERNAME';
    ELSE
        -- Update the role
        UPDATE users SET role = '$ROLE' WHERE username = '$USERNAME';
        RAISE NOTICE 'Successfully updated user ''%'' to role ''%''', '$USERNAME', '$ROLE';
    END IF;
END \$\$;

-- Display updated user information
SELECT 
    username, 
    display_name, 
    role, 
    karma_points,
    created_at 
FROM users 
WHERE username = '$USERNAME';
EOF

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ User role updated successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Log out and log back in for changes to take effect"
    echo "2. Access the admin panel at http://localhost:5173/admin/dashboard"
else
    echo -e "${RED}✗ Failed to update user role${NC}"
    exit 1
fi
