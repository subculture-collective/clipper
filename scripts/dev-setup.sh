#!/bin/bash
# Quick dev environment startup script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Clipper Development Environment Startup ===${NC}\n"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

missing_tools=0

if ! command_exists go; then
    echo -e "${RED}✗ Go not found${NC}"
    ((missing_tools++))
else
    echo -e "${GREEN}✓ Go$(NC) $(go version | awk '{print $3}')"
fi

if ! command_exists node; then
    echo -e "${RED}✗ Node not found${NC}"
    ((missing_tools++))
else
    echo -e "${GREEN}✓ Node${NC} $(node --version)"
fi

if ! command_exists npm; then
    echo -e "${RED}✗ npm not found${NC}"
    ((missing_tools++))
else
    echo -e "${GREEN}✓ npm${NC} $(npm --version)"
fi

if ! command_exists docker; then
    echo -e "${RED}✗ Docker not found${NC}"
    ((missing_tools++))
else
    echo -e "${GREEN}✓ Docker${NC} $(docker --version | cut -d' ' -f3)"
fi

if [ $missing_tools -gt 0 ]; then
    echo -e "\n${RED}Error: Missing $missing_tools required tool(s)${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Starting Docker services...${NC}"

cd "$(dirname "$0")" || exit 1

# Start Docker services
docker compose up -d postgres redis vault-agent

# Wait for services
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Check services
echo -e "${YELLOW}Verifying services...${NC}"

if docker compose exec postgres pg_isready -U clipper -d clipper_db > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL healthy${NC}"
else
    echo -e "${RED}✗ PostgreSQL not responding${NC}"
    exit 1
fi

if docker exec clipper-redis redis-cli PING > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis healthy${NC}"
else
    echo -e "${RED}✗ Redis not responding${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Environment Ready ===${NC}\n"
echo "Next steps:"
echo "  Terminal 1 (Backend):"
echo "    cd backend && go run cmd/api/main.go"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open: http://localhost:5173"
echo ""
echo "To stop services:"
echo "  docker compose down"
echo ""
