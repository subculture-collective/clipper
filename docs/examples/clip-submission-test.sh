#!/bin/bash

# Clip Submission API - Example Test Script
# This script demonstrates the complete workflow for submitting a clip

set -e  # Exit on error

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080/api/v1}"
TOKEN="${CLIPPER_TOKEN:-}"
CLIP_URL="${1:-https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed.${NC}"
    echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if token is provided
if [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: JWT token is required${NC}"
    echo "Usage: $0 <clip_url>"
    echo "Set the CLIPPER_TOKEN environment variable with your JWT token:"
    echo "  export CLIPPER_TOKEN='your_jwt_token_here'"
    echo "  $0 https://clips.twitch.tv/YourClipID"
    exit 1
fi

echo -e "${YELLOW}=== Clipper Clip Submission API Test ===${NC}\n"
echo "API Base URL: $API_BASE_URL"
echo "Clip URL: $CLIP_URL"
echo ""

# Step 1: Fetch clip metadata
echo -e "${YELLOW}Step 1: Fetching clip metadata...${NC}"
METADATA_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${API_BASE_URL}/submissions/metadata?url=${CLIP_URL}" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$METADATA_RESPONSE" | tail -n1)
METADATA=$(echo "$METADATA_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ne 200 ]; then
    echo -e "${RED}✗ Failed to fetch metadata (HTTP $HTTP_CODE)${NC}"
    echo "$METADATA" | jq '.'
    exit 1
fi

SUCCESS=$(echo "$METADATA" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
    echo -e "${RED}✗ Metadata fetch failed${NC}"
    echo "$METADATA" | jq -r '.error'
    exit 1
fi

echo -e "${GREEN}✓ Metadata fetched successfully${NC}"
echo "$METADATA" | jq -r '.data | "  Title: \(.title)\n  Streamer: \(.streamer_name)\n  Game: \(.game_name)\n  Duration: \(.duration)s\n  Views: \(.view_count)"'
echo ""

# Step 2: Submit the clip
echo -e "${YELLOW}Step 2: Submitting clip...${NC}"
SUBMISSION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_BASE_URL}/submissions" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"clip_url\": \"${CLIP_URL}\",
    \"tags\": [\"epic\", \"test\"],
    \"is_nsfw\": false,
    \"submission_reason\": \"Testing clip submission API\"
  }")

HTTP_CODE=$(echo "$SUBMISSION_RESPONSE" | tail -n1)
SUBMISSION=$(echo "$SUBMISSION_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
    SUCCESS=$(echo "$SUBMISSION" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
        echo -e "${GREEN}✓ Clip submitted successfully${NC}"
        MESSAGE=$(echo "$SUBMISSION" | jq -r '.message')
        STATUS=$(echo "$SUBMISSION" | jq -r '.submission.status')
        SUBMISSION_ID=$(echo "$SUBMISSION" | jq -r '.submission.id')
        
        echo "  Message: $MESSAGE"
        echo "  Status: $STATUS"
        echo "  Submission ID: $SUBMISSION_ID"
        
        if [ "$STATUS" == "approved" ]; then
            CLIP_ID=$(echo "$SUBMISSION" | jq -r '.submission.clip_id')
            echo -e "${GREEN}  ✓ Auto-approved! Clip ID: $CLIP_ID${NC}"
        else
            echo -e "${YELLOW}  ⏳ Pending moderation review${NC}"
        fi
    else
        echo -e "${RED}✗ Submission failed${NC}"
        echo "$SUBMISSION" | jq '.'
        exit 1
    fi
elif [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${RED}✗ Validation error (HTTP $HTTP_CODE)${NC}"
    ERROR=$(echo "$SUBMISSION" | jq -r '.error')
    FIELD=$(echo "$SUBMISSION" | jq -r '.field // "unknown"')
    echo "  Error: $ERROR"
    echo "  Field: $FIELD"
    exit 1
elif [ "$HTTP_CODE" -eq 429 ]; then
    echo -e "${RED}✗ Rate limit exceeded (HTTP $HTTP_CODE)${NC}"
    ERROR=$(echo "$SUBMISSION" | jq -r '.error')
    echo "  Error: $ERROR"
    exit 1
else
    echo -e "${RED}✗ Submission failed (HTTP $HTTP_CODE)${NC}"
    echo "$SUBMISSION" | jq '.'
    exit 1
fi

echo ""

# Step 3: Get submission stats
echo -e "${YELLOW}Step 3: Fetching submission statistics...${NC}"
STATS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${API_BASE_URL}/submissions/stats" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$STATS_RESPONSE" | tail -n1)
STATS=$(echo "$STATS_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    SUCCESS=$(echo "$STATS" | jq -r '.success')
    if [ "$SUCCESS" == "true" ]; then
        echo -e "${GREEN}✓ Statistics retrieved successfully${NC}"
        echo "$STATS" | jq -r '.data | "  Total Submissions: \(.total_submissions)\n  Approved: \(.approved_submissions)\n  Rejected: \(.rejected_submissions)\n  Pending: \(.pending_submissions)\n  Approval Rate: \(.approval_rate)%\n  Total Karma Earned: \(.total_karma_earned)"'
    else
        echo -e "${RED}✗ Failed to fetch statistics${NC}"
        echo "$STATS" | jq '.'
    fi
else
    echo -e "${RED}✗ Failed to fetch statistics (HTTP $HTTP_CODE)${NC}"
    echo "$STATS" | jq '.'
fi

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
