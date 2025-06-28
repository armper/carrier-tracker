#!/bin/bash

# Run migration on deployed Vercel app
# Usage: ./scripts/run-migration.sh

echo "🚀 Running database migration on production..."

# Get the production URL
PROD_URL="https://carrier-tracker-ax3pkxmgw-armandos-projects-cca8df46.vercel.app"

# Load environment variables
source .env.local 2>/dev/null || echo "Warning: .env.local not found"

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY not set"
    echo "Set it in .env.local or export it:"
    echo "export SUPABASE_SERVICE_ROLE_KEY=your_key_here"
    exit 1
fi

echo "📡 Calling migration API..."

response=$(curl -s -w "\n%{http_code}" -X GET "${PROD_URL}/api/migrate" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json")

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract response body (all but last line)
body=$(echo "$response" | head -n -1)

echo "📊 Response (HTTP $http_code):"
echo "$body" | jq . 2>/dev/null || echo "$body"

if [ "$http_code" = "200" ]; then
    echo "✅ Migration completed successfully!"
    echo "🚛 Try searching for 'ABC' or '123456' in your app!"
else
    echo "❌ Migration failed with HTTP $http_code"
    exit 1
fi