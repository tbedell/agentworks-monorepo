#!/bin/bash
set -e

echo "🚀 AgentWorks Development Setup"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is required but not installed.${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ $1 found${NC}"
    return 0
}

echo ""
echo "Checking prerequisites..."
echo "-------------------------"

check_command "node" || exit 1
check_command "pnpm" || { echo "Install with: npm install -g pnpm"; exit 1; }
check_command "psql" || { echo -e "${YELLOW}⚠ PostgreSQL not found. Please install it:${NC}"; echo "  macOS: brew install postgresql@16"; echo "  Ubuntu: sudo apt install postgresql-16"; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

echo ""
echo "Setting up environment..."
echo "-------------------------"

# Copy env files if they don't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi

if [ ! -f "packages/db/.env" ]; then
    cp packages/db/.env.example packages/db/.env
    echo -e "${GREEN}✓ Created packages/db/.env${NC}"
else
    echo -e "${YELLOW}⚠ packages/db/.env already exists, skipping${NC}"
fi

echo ""
echo "Setting up PostgreSQL..."
echo "------------------------"

# Check if PostgreSQL is running
if pg_isready -q; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL is not running. Starting...${NC}"
    # Try to start PostgreSQL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || true
    else
        sudo systemctl start postgresql 2>/dev/null || sudo service postgresql start 2>/dev/null || true
    fi
    sleep 2
fi

# Create database and user
echo "Creating database and user..."
psql postgres -c "CREATE USER agentworks WITH PASSWORD 'agentworks' CREATEDB;" 2>/dev/null || echo "  User may already exist"
psql postgres -c "CREATE DATABASE agentworks OWNER agentworks;" 2>/dev/null || echo "  Database may already exist"
echo -e "${GREEN}✓ Database ready${NC}"

echo ""
echo "Installing dependencies..."
echo "--------------------------"
pnpm install

echo ""
echo "Generating Prisma client..."
echo "---------------------------"
pnpm --filter @agentworks/db generate

echo ""
echo "Running database migrations..."
echo "------------------------------"
pnpm --filter @agentworks/db push

echo ""
echo "Seeding database..."
echo "-------------------"
pnpm --filter @agentworks/db exec -- npx tsx prisma/seed.ts

echo ""
echo "Creating storage directory..."
echo "-----------------------------"
mkdir -p .storage
echo -e "${GREEN}✓ Created .storage directory${NC}"

echo ""
echo "================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To start development:"
echo "  pnpm dev"
echo ""
echo "This will start:"
echo "  - API server at http://localhost:3010"
echo "  - Web app at http://localhost:5173"
echo ""
echo "Don't forget to add your API keys to .env:"
echo "  - OPENAI_API_KEY"
echo "  - ANTHROPIC_API_KEY"
echo "================================"
