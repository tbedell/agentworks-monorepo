#!/bin/bash
# AgentWorks Production Database Seeding Script
# WARNING: Only run this ONCE when setting up a new environment!
# Running multiple times may cause issues with duplicate data.

set -e

echo "============================================"
echo "   AgentWorks Production Database Seeding"
echo "============================================"
echo ""
echo "WARNING: This script seeds initial data into production."
echo "         Only run this ONCE per environment!"
echo ""
echo "This will create:"
echo "   - Agent configurations (15 agents)"
echo "   - Billing plans (Starter, Pro, Max)"
echo "   - Provider configurations"
echo "   - Platform settings"
echo ""

read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Check for DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    echo ""
    echo "ERROR: DB_PASSWORD environment variable not set."
    echo ""
    echo "Usage:"
    echo "   DB_PASSWORD=your_password ./scripts/deploy/seed-production.sh"
    echo ""
    echo "Or get it from Secret Manager:"
    echo "   export DB_PASSWORD=\$(gcloud secrets versions access latest --secret=AGENTWORKS_DATABASE_URL | grep -oP '(?<=:)[^@]+(?=@)')"
    exit 1
fi

CLOUD_SQL_INSTANCE=${CLOUD_SQL_INSTANCE:-engagesuite-prod:us-central1:agentworks-db}
PROXY_PORT=${PROXY_PORT:-5434}

echo ""
echo "Starting Cloud SQL Proxy..."
echo "   Instance: $CLOUD_SQL_INSTANCE"
echo "   Port: $PROXY_PORT"

# Start Cloud SQL Proxy in background
cloud_sql_proxy -instances=$CLOUD_SQL_INSTANCE=tcp:$PROXY_PORT &
PROXY_PID=$!

# Wait for proxy to be ready
sleep 5

# Check if proxy is running
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "ERROR: Cloud SQL Proxy failed to start"
    exit 1
fi

echo "   Proxy started (PID: $PROXY_PID)"
echo ""

# Set DATABASE_URL for Prisma
export DATABASE_URL="postgresql://agentworks:$DB_PASSWORD@127.0.0.1:$PROXY_PORT/agentworks"

echo "Running database seed..."
cd /AgentWorks/packages/db

# Generate Prisma client if needed
npx prisma generate

# Run the seed
npx prisma db seed

# Cleanup
echo ""
echo "Stopping Cloud SQL Proxy..."
kill $PROXY_PID 2>/dev/null || true

echo ""
echo "============================================"
echo "   Seeding Complete!"
echo "============================================"
echo ""
echo "Production database now has:"
echo "   - Agent configurations"
echo "   - Billing plans"
echo "   - Provider settings"
echo "   - Platform configuration"
echo ""
