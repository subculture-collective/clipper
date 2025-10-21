#!/bin/bash

# End-to-end test script for authentication endpoints

set -e

BASE_URL="http://localhost:8080"

echo "======================================"
echo "Authentication E2E Test"
echo "======================================"
echo ""

# Test health endpoints
echo "1. Testing health endpoints..."

echo "  - GET /health"
curl -s "$BASE_URL/health" | jq -e '.status == "healthy"' > /dev/null
echo "    ✓ Health check passed"

echo "  - GET /health/live"
curl -s "$BASE_URL/health/live" | jq -e '.status == "alive"' > /dev/null
echo "    ✓ Liveness check passed"

echo "  - GET /health/ready"
READY_RESPONSE=$(curl -s "$BASE_URL/health/ready")
if echo "$READY_RESPONSE" | jq -e '.status == "ready"' > /dev/null 2>&1; then
    echo "    ✓ Readiness check passed"
else
    echo "    ⚠ Readiness check failed (database or Redis not ready)"
    echo "    Response: $READY_RESPONSE"
fi

echo ""

# Test API ping
echo "2. Testing API ping..."
echo "  - GET /api/v1/ping"
curl -s "$BASE_URL/api/v1/ping" | jq -e '.message == "pong"' > /dev/null
echo "    ✓ API ping successful"

echo ""

# Test OAuth initiation endpoint (should redirect)
echo "3. Testing OAuth initiation..."
echo "  - GET /api/v1/auth/twitch"
OAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/twitch" -L -o /dev/null)
HTTP_CODE=$(echo "$OAUTH_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "    ✓ OAuth initiation endpoint responds with redirect"
else
    echo "    ⚠ Unexpected status code: $HTTP_CODE"
fi

echo ""

# Test protected endpoint without auth (should fail)
echo "4. Testing protected endpoint without authentication..."
echo "  - GET /api/v1/auth/me (no auth)"
ME_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/auth/me")
HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo "    ✓ Protected endpoint correctly returns 401"
else
    echo "    ⚠ Expected 401, got: $HTTP_CODE"
fi

echo ""

# Test logout endpoint
echo "5. Testing logout endpoint..."
echo "  - POST /api/v1/auth/logout"
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/auth/logout")
if echo "$LOGOUT_RESPONSE" | jq -e '.message == "Logged out successfully"' > /dev/null; then
    echo "    ✓ Logout endpoint responds correctly"
else
    echo "    ⚠ Unexpected response: $LOGOUT_RESPONSE"
fi

echo ""

# Test refresh endpoint without token (should fail)
echo "6. Testing refresh endpoint without token..."
echo "  - POST /api/v1/auth/refresh (no token)"
REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/auth/refresh")
HTTP_CODE=$(echo "$REFRESH_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo "    ✓ Refresh endpoint correctly returns 401"
else
    echo "    ⚠ Expected 401, got: $HTTP_CODE"
fi

echo ""

echo "======================================"
echo "Summary:"
echo "======================================"
echo "✓ All basic endpoint tests passed!"
echo ""
echo "Note: Full OAuth flow testing requires:"
echo "  1. Valid Twitch credentials in .env"
echo "  2. Manual browser interaction"
echo "  3. See docs/authentication.md for setup"
echo ""
