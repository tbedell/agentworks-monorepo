#!/bin/bash
# AgentWorks Database Migration Script
# SAFE: Only applies NEW migrations that haven't been run yet
# Can be run on every deployment without risk of data loss

set -e

echo "============================================"
echo "   AgentWorks Database Migrations"
echo "============================================"
echo ""

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL environment variable not set."
    echo ""
    echo "For local development:"
    echo "   export DATABASE_URL='postgresql://agentworks:dev_password@localhost:5432/agentworks'"
    echo ""
    echo "For production (via Cloud SQL Proxy):"
    echo "   export DATABASE_URL='postgresql://agentworks:PASSWORD@127.0.0.1:5434/agentworks'"
    exit 1
fi

echo "Running Prisma migrate deploy..."
echo "   This only applies NEW migrations (existing data is preserved)"
echo ""

cd /AgentWorks/packages/db

# Generate Prisma client
npx prisma generate

# Apply migrations (safe - only new ones)
npx prisma migrate deploy

echo ""
echo "============================================"
echo "   Migrations Complete!"
echo "============================================"
echo ""
echo "Note: Only NEW migrations were applied."
echo "      Existing data was NOT modified."
echo ""
