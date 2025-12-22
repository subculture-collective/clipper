#!/bin/bash
# test-stripe-webhooks.sh
# 
# This script tests all supported Stripe webhook event types using Stripe CLI
# 
# Prerequisites:
# 1. Stripe CLI installed (https://stripe.com/docs/stripe-cli)
# 2. Authenticated with `stripe login`
# 3. Backend server running on localhost:8080
# 4. Webhook secret configured in .env

set -e

echo "=========================================="
echo "Stripe Webhook Testing Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}Error: Stripe CLI is not installed${NC}"
    echo "Install from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health/live | grep -q "200"; then
    echo -e "${RED}Error: Backend server is not running on localhost:8080${NC}"
    echo "Start the backend server first: go run cmd/api/main.go"
    exit 1
fi
echo -e "${GREEN}✓ Backend server is running${NC}"
echo ""

# Array of webhook events to test
events=(
  "customer.subscription.created"
  "customer.subscription.updated"
  "customer.subscription.deleted"
  "invoice.payment_succeeded"
  "invoice.payment_failed"
  "invoice.finalized"
  "charge.dispute.created"
)

echo "Testing ${#events[@]} webhook event types..."
echo ""

success_count=0
fail_count=0
failed_events=()

# Test each event
for event in "${events[@]}"; do
  echo -e "${YELLOW}Testing: $event${NC}"
  
  if stripe trigger "$event" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Success${NC}"
    ((success_count++))
  else
    echo -e "${RED}✗ Failed${NC}"
    ((fail_count++))
    failed_events+=("$event")
  fi
  
  # Wait between events to avoid rate limiting
  sleep 2
  echo ""
done

# Print summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total Tests:   ${#events[@]}"
echo -e "Passed:        ${GREEN}${success_count}${NC}"
echo -e "Failed:        ${RED}${fail_count}${NC}"

if [ $fail_count -gt 0 ]; then
  echo ""
  echo -e "${RED}Failed Events:${NC}"
  for failed_event in "${failed_events[@]}"; do
    echo "  - $failed_event"
  done
  echo ""
  echo "Check backend logs for error details"
  exit 1
else
  echo ""
  echo -e "${GREEN}All webhook tests completed successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Check backend logs to verify webhook processing"
  echo "2. Verify database entries for subscriptions and events"
  echo "3. Check audit logs for recorded events"
  exit 0
fi
