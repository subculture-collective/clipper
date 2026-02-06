#!/bin/bash

# Clipper Moderation API - Bash Examples
# 
# Usage: 
#   export API_TOKEN="your_jwt_token_here"
#   ./moderation-api-examples.sh

set -e

# Configuration
API_BASE="${API_BASE:-https://api.clpr.tv/api/v1/moderation}"
API_TOKEN="${API_TOKEN:-}"

if [ -z "$API_TOKEN" ]; then
    echo "Error: API_TOKEN environment variable is required"
    echo "Usage: export API_TOKEN='your_token' && ./moderation-api-examples.sh"
    exit 1
fi

# Helper function for API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X "$method" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            "${API_BASE}${endpoint}"
    else
        curl -s -X "$method" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "${API_BASE}${endpoint}"
    fi
}

# Example 1: Sync Bans from Twitch
echo "=== Example 1: Sync Bans from Twitch ==="
CHANNEL_ID="${CHANNEL_ID:-123e4567-e89b-12d3-a456-426614174000}"
response=$(api_call POST "/sync-bans" "{\"channel_id\": \"$CHANNEL_ID\"}")
echo "$response" | jq '.'
echo ""

# Example 2: List Bans for a Channel
echo "=== Example 2: List Bans for a Channel ==="
response=$(api_call GET "/bans?channelId=$CHANNEL_ID&limit=10&offset=0")
echo "$response" | jq '.'
echo ""

# Example 3: Create a Ban
echo "=== Example 3: Create a Ban ==="
USER_TO_BAN="${USER_TO_BAN:-user-uuid-to-ban}"
ban_data="{
  \"channelId\": \"$CHANNEL_ID\",
  \"userId\": \"$USER_TO_BAN\",
  \"reason\": \"Violation of community guidelines\"
}"
response=$(api_call POST "/ban" "$ban_data")
echo "$response" | jq '.'
BAN_ID=$(echo "$response" | jq -r '.id')
echo ""

# Example 4: Get Ban Details
if [ "$BAN_ID" != "null" ] && [ -n "$BAN_ID" ]; then
    echo "=== Example 4: Get Ban Details ==="
    response=$(api_call GET "/ban/$BAN_ID")
    echo "$response" | jq '.'
    echo ""
fi

# Example 5: List Moderators
echo "=== Example 5: List Moderators ==="
response=$(api_call GET "/moderators?channelId=$CHANNEL_ID&limit=10")
echo "$response" | jq '.'
echo ""

# Example 6: Add a Moderator
echo "=== Example 6: Add a Moderator ==="
USER_TO_MODERATE="${USER_TO_MODERATE:-user-uuid-to-moderate}"
mod_data="{
  \"userId\": \"$USER_TO_MODERATE\",
  \"channelId\": \"$CHANNEL_ID\",
  \"reason\": \"Trusted community member\"
}"
response=$(api_call POST "/moderators" "$mod_data")
echo "$response" | jq '.'
MODERATOR_ID=$(echo "$response" | jq -r '.moderator.id')
echo ""

# Example 7: List Audit Logs
echo "=== Example 7: List Audit Logs ==="
response=$(api_call GET "/audit-logs?action=ban_user&limit=10")
echo "$response" | jq '.'
echo ""

# Example 8: Export Audit Logs to CSV
echo "=== Example 8: Export Audit Logs to CSV ==="
START_DATE=$(date -d "30 days ago" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)
curl -s -X GET \
    -H "Authorization: Bearer $API_TOKEN" \
    "${API_BASE}/audit-logs/export?start_date=$START_DATE&end_date=$END_DATE" \
    -o audit-logs-export.csv
echo "Exported audit logs to: audit-logs-export.csv"
echo ""

# Example 9: Revoke a Ban
if [ "$BAN_ID" != "null" ] && [ -n "$BAN_ID" ]; then
    echo "=== Example 9: Revoke a Ban ==="
    response=$(api_call DELETE "/ban/$BAN_ID")
    echo "$response" | jq '.'
    echo ""
fi

# Example 10: Remove a Moderator
if [ "$MODERATOR_ID" != "null" ] && [ -n "$MODERATOR_ID" ]; then
    echo "=== Example 10: Remove a Moderator ==="
    response=$(api_call DELETE "/moderators/$MODERATOR_ID")
    echo "$response" | jq '.'
    echo ""
fi

echo "=== All examples completed ==="
echo ""
echo "Note: Some examples may fail if resources don't exist or you lack permissions."
echo "Update CHANNEL_ID, USER_TO_BAN, and USER_TO_MODERATE environment variables as needed."
