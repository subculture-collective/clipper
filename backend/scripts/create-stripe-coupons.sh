#!/bin/bash

# Stripe Coupon Creation Script
# This script creates common promotion codes in your Stripe account
# Usage: ./scripts/create-stripe-coupons.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  Clipper - Stripe Coupon Creation Script"
echo "================================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}Error: Stripe CLI is not installed${NC}"
    echo "Install it from: https://stripe.com/docs/stripe-cli"
    echo ""
    echo "macOS: brew install stripe/stripe-brew/stripe"
    echo "Linux: See installation instructions above"
    exit 1
fi

# Check if logged in - test with a simple command
if ! stripe customers list --limit 1 &> /dev/null; then
    echo -e "${RED}Error: Please login to Stripe CLI first${NC}"
    echo "Run: stripe login"
    exit 1
fi

echo -e "${YELLOW}This script will create the following coupons:${NC}"
echo "1. LAUNCH25 - 25% off, applies once (launch promotion)"
echo "2. SAVE20 - 20% off forever (general promotion)"
echo "3. STUDENT50 - 50% off forever (student discount)"
echo "4. REFERRAL20 - 20% off forever (referral program)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Creating coupons..."
echo ""

# Launch promotion - 25% off, applies once
echo -n "Creating LAUNCH25... "
if stripe coupons create \
    --id=LAUNCH25 \
    --percent-off=25 \
    --duration=once \
    --name="Launch Promotion - 25% Off" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}(already exists or error)${NC}"
fi

# General promotion - 20% off forever
echo -n "Creating SAVE20... "
if stripe coupons create \
    --id=SAVE20 \
    --percent-off=20 \
    --duration=forever \
    --name="Save 20% Forever" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}(already exists or error)${NC}"
fi

# Student discount - 50% off forever
echo -n "Creating STUDENT50... "
if stripe coupons create \
    --id=STUDENT50 \
    --percent-off=50 \
    --duration=forever \
    --name="Student Discount - 50% Off" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}(already exists or error)${NC}"
fi

# Referral program - 20% off forever
echo -n "Creating REFERRAL20... "
if stripe coupons create \
    --id=REFERRAL20 \
    --percent-off=20 \
    --duration=forever \
    --name="Referral Discount - 20% Off" \
    --max-redemptions=1000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}(already exists or error)${NC}"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "View your coupons at: https://dashboard.stripe.com/test/coupons"
echo ""
echo "To use these coupons:"
echo "1. In checkout API: { \"coupon_code\": \"LAUNCH25\" }"
echo "2. Users can enter codes during Stripe Checkout"
echo ""
