#!/bin/bash
# TickTick OAuth Token Exchange Script
# Usage: ./ticktick-oauth.sh <authorization_code>

# Set these or use environment variables
CLIENT_ID="${TICKTICK_CLIENT_ID:-YOUR_CLIENT_ID}"
CLIENT_SECRET="${TICKTICK_CLIENT_SECRET:-YOUR_CLIENT_SECRET}"
REDIRECT_URI="http://127.0.0.1"

if [ -z "$1" ]; then
    echo "============================================"
    echo "TickTick OAuth Setup"
    echo "============================================"
    echo ""
    echo "Step 1: Open this URL in your browser:"
    echo ""
    echo "https://ticktick.com/oauth/authorize?scope=tasks:read%20tasks:write&client_id=${CLIENT_ID}&state=state&redirect_uri=http://127.0.0.1&response_type=code"
    echo ""
    echo "Step 2: After authorizing, copy the 'code' from the redirect URL"
    echo "        (The page won't load - that's expected)"
    echo ""
    echo "Step 3: Run this script again with the code:"
    echo "        ./ticktick-oauth.sh YOUR_CODE_HERE"
    echo ""
    exit 0
fi

CODE="$1"

echo "Exchanging authorization code for access token..."

# Base64 encode credentials for Basic auth
AUTH=$(echo -n "${CLIENT_ID}:${CLIENT_SECRET}" | base64)

curl -s -X POST "https://ticktick.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "code=${CODE}" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=${REDIRECT_URI}"

echo ""
echo ""
echo "Copy the access_token above and add it to your .env file:"
echo "TICKTICK_ACCESS_TOKEN=<your_access_token>"
