#!/bin/bash
# Script to push database schema changes to Railway PostgreSQL
# Usage: ./scripts/db-push.sh

# Railway PostgreSQL connection string
DATABASE_URL="postgresql://postgres:SqysbRiTfTrmbUStgiPDktFqAPOgjyZT@nozomi.proxy.rlwy.net:48746/railway"

echo "🚀 Pushing database schema to Railway..."
echo ""

# Run drizzle-kit push with the DATABASE_URL
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push

echo ""
echo "✅ Database schema push complete!"
