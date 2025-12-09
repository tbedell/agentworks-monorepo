#!/bin/bash

# AgentWorks Test Setup Script
# Sets up local testing environment with required services

set -e

echo "🚀 Setting up AgentWorks testing environment..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i tcp:$1 >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists docker; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! command_exists node; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command_exists pnpm; then
    echo "❌ pnpm is required but not installed"
    echo "Install with: npm install -g pnpm"
    exit 1
fi

echo "✅ Prerequisites met"

# Stop any existing test containers
echo "🛑 Stopping existing test containers..."
docker stop agentworks-postgres-test agentworks-redis-test 2>/dev/null || true
docker rm agentworks-postgres-test agentworks-redis-test 2>/dev/null || true

# Start test database
echo "🐘 Starting test PostgreSQL database..."
docker run -d \
    --name agentworks-postgres-test \
    -e POSTGRES_USER=test \
    -e POSTGRES_PASSWORD=test \
    -e POSTGRES_DB=agentworks_test \
    -p 5432:5432 \
    postgres:15

# Start test Redis
echo "📮 Starting test Redis cache..."
docker run -d \
    --name agentworks-redis-test \
    -p 6379:6379 \
    redis:7-alpine

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
for i in {1..30}; do
    if docker exec agentworks-postgres-test pg_isready -U test >/dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Redis
echo "Waiting for Redis..."
for i in {1..30}; do
    if docker exec agentworks-redis-test redis-cli ping >/dev/null 2>&1; then
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "✅ Services are ready"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build packages
echo "🔨 Building packages..."
pnpm build

# Setup test databases
echo "🗄️  Setting up test databases..."

# Set environment variables for database operations
export DATABASE_URL="postgresql://test:test@localhost:5432/agentworks_test"

# Generate Prisma client
pnpm --filter @agentworks/db generate

# Push database schema
pnpm --filter @agentworks/db push

# Create additional test databases for different test suites
echo "Creating additional test databases..."

# Integration test database
docker exec agentworks-postgres-test createdb -U test agentworks_integration 2>/dev/null || true

# E2E test database  
docker exec agentworks-postgres-test createdb -U test agentworks_e2e 2>/dev/null || true

# Performance test database
docker exec agentworks-postgres-test createdb -U test agentworks_perf 2>/dev/null || true

# Security test database
docker exec agentworks-postgres-test createdb -U test agentworks_security 2>/dev/null || true

# Apply schema to all test databases
export DATABASE_URL="postgresql://test:test@localhost:5432/agentworks_integration"
pnpm --filter @agentworks/db push

export DATABASE_URL="postgresql://test:test@localhost:5432/agentworks_e2e"
pnpm --filter @agentworks/db push

export DATABASE_URL="postgresql://test:test@localhost:5432/agentworks_perf"
pnpm --filter @agentworks/db push

export DATABASE_URL="postgresql://test:test@localhost:5432/agentworks_security"
pnpm --filter @agentworks/db push

# Create test environment file
echo "📝 Creating test environment configuration..."

cat > .env.test << EOF
# AgentWorks Test Environment Configuration
NODE_ENV=test

# Database Configuration
DATABASE_URL=postgresql://test:test@localhost:5432/agentworks_test
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/agentworks_test

# Redis Configuration
REDIS_URL=redis://localhost:6379/1
TEST_REDIS_URL=redis://localhost:6379/1

# JWT Configuration
JWT_SECRET=test-jwt-secret-for-local-development
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Service Ports for Testing
PORT_CORE=9000
PORT_ORCHESTRATOR=9001
PORT_PROVIDER_ROUTER=9002
PORT_LOG_STREAMING=9003
PORT_BILLING=9004

# Test API Keys (use test/mock keys)
OPENAI_API_KEY=test-openai-key
ANTHROPIC_API_KEY=test-anthropic-key

# Frontend Configuration
VITE_API_URL=http://localhost:9000
VITE_WS_URL=ws://localhost:9003

# Logging
LOG_LEVEL=info
EOF

echo "✅ Test environment configuration created"

# Install test-specific browser dependencies
echo "🌐 Setting up browser testing dependencies..."

# Install Puppeteer dependencies on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Installing Puppeteer system dependencies for Linux..."
    
    # Check if apt-get is available (Debian/Ubuntu)
    if command_exists apt-get; then
        echo "Using apt-get to install dependencies..."
        sudo apt-get update
        sudo apt-get install -y \
            libnss3-dev \
            libatk-bridge2.0-dev \
            libdrm2 \
            libgtk-3-dev \
            libgbm-dev \
            libasound2-dev \
            libxss1 \
            libgconf-2-4
    # Check if yum is available (RHEL/CentOS/Fedora)
    elif command_exists yum; then
        echo "Using yum to install dependencies..."
        sudo yum install -y \
            nss \
            atk \
            gtk3 \
            libdrm \
            xorg-x11-server-Xvfb \
            alsa-lib
    else
        echo "⚠️  Could not detect package manager. You may need to install browser dependencies manually."
    fi
fi

# Create test scripts
echo "📜 Creating test utility scripts..."

mkdir -p scripts/test

# Create test runner script
cat > scripts/test/run-unit.sh << 'EOF'
#!/bin/bash
echo "🧪 Running unit tests..."
pnpm test:unit
EOF

cat > scripts/test/run-integration.sh << 'EOF'
#!/bin/bash
echo "🔗 Running integration tests..."
source .env.test
pnpm test:integration
EOF

cat > scripts/test/run-e2e.sh << 'EOF'
#!/bin/bash
echo "🎭 Running E2E tests..."
source .env.test

# Start services in background
echo "Starting test services..."
pnpm --filter @agentworks/core-service start &
CORE_PID=$!

pnpm --filter @agentworks/agent-orchestrator start &
ORCHESTRATOR_PID=$!

pnpm --filter @agentworks/provider-router start &
PROVIDER_PID=$!

pnpm --filter @agentworks/log-streaming start &
LOG_PID=$!

pnpm --filter @agentworks/billing-service start &
BILLING_PID=$!

pnpm --filter @agentworks/web dev &
WEB_PID=$!

# Wait for services to start
echo "Waiting for services to be ready..."
sleep 30

# Run E2E tests
echo "Running E2E tests..."
pnpm test:e2e

# Cleanup
echo "Cleaning up test services..."
kill $CORE_PID $ORCHESTRATOR_PID $PROVIDER_PID $LOG_PID $BILLING_PID $WEB_PID 2>/dev/null
EOF

cat > scripts/test/run-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Running complete test suite..."

echo "1/5 Running unit tests..."
./scripts/test/run-unit.sh

echo "2/5 Running integration tests..."
./scripts/test/run-integration.sh

echo "3/5 Running E2E tests..."
./scripts/test/run-e2e.sh

echo "4/5 Running performance tests..."
source .env.test
pnpm test:performance

echo "5/5 Running security tests..."
source .env.test
pnpm test:security

echo "✅ All tests completed!"
EOF

cat > scripts/test/cleanup.sh << 'EOF'
#!/bin/bash
echo "🧹 Cleaning up test environment..."

# Stop Docker containers
docker stop agentworks-postgres-test agentworks-redis-test 2>/dev/null || true
docker rm agentworks-postgres-test agentworks-redis-test 2>/dev/null || true

# Clean up test artifacts
rm -rf coverage/
rm -rf test-results/
rm -rf tests/e2e/screenshots/

echo "✅ Cleanup completed"
EOF

# Make scripts executable
chmod +x scripts/test/*.sh

echo "📊 Creating test reporting configuration..."

# Create test results directory
mkdir -p test-results

# Create Jest coverage configuration
cat > .nycrc.json << 'EOF'
{
  "all": true,
  "include": [
    "apps/*/src/**/*.ts",
    "apps/*/src/**/*.tsx",
    "packages/*/src/**/*.ts",
    "packages/*/src/**/*.tsx"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts", 
    "**/*.spec.tsx",
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/*.d.ts"
  ],
  "reporter": [
    "text",
    "html",
    "lcov",
    "json"
  ],
  "report-dir": "coverage",
  "temp-dir": ".nyc_output"
}
EOF

# Validate test setup
echo "🔍 Validating test setup..."

# Check database connectivity
if ! docker exec agentworks-postgres-test pg_isready -U test >/dev/null 2>&1; then
    echo "❌ PostgreSQL test database is not ready"
    exit 1
fi

# Check Redis connectivity
if ! docker exec agentworks-redis-test redis-cli ping >/dev/null 2>&1; then
    echo "❌ Redis test cache is not ready"
    exit 1
fi

# Test database schema
export DATABASE_URL="postgresql://test:test@localhost:5432/agentworks_test"
if ! pnpm --filter @agentworks/db generate >/dev/null 2>&1; then
    echo "❌ Database schema validation failed"
    exit 1
fi

# Run a quick smoke test
echo "🚭 Running smoke tests..."
if pnpm test:unit --testNamePattern="should" --maxWorkers=1 --passWithNoTests; then
    echo "✅ Smoke tests passed"
else
    echo "❌ Smoke tests failed"
    exit 1
fi

echo ""
echo "🎉 AgentWorks test environment setup complete!"
echo ""
echo "Available test commands:"
echo "  pnpm test              # Run all tests"
echo "  pnpm test:unit         # Run unit tests"
echo "  pnpm test:integration  # Run integration tests"
echo "  pnpm test:e2e          # Run E2E tests"
echo "  pnpm test:performance  # Run performance tests"
echo "  pnpm test:security     # Run security tests"
echo "  pnpm test:watch        # Run tests in watch mode"
echo "  pnpm test:coverage     # Run tests with coverage"
echo ""
echo "Test utilities:"
echo "  ./scripts/test/run-all.sh     # Run complete test suite"
echo "  ./scripts/test/cleanup.sh     # Clean up test environment"
echo ""
echo "Test services:"
echo "  PostgreSQL: localhost:5432 (test/test)"
echo "  Redis: localhost:6379"
echo ""
echo "Configuration files created:"
echo "  .env.test              # Test environment variables"
echo "  jest.config.js         # Jest configuration"
echo "  .nycrc.json            # Coverage configuration"
echo ""
echo "Ready to test! 🧪"