# Stripe Subscription Testing Guide

This guide walks through testing the complete Stripe subscription integration.

## Prerequisites

1. **Stripe Account**: Create a test account at https://dashboard.stripe.com
2. **Stripe CLI**: Install from https://stripe.com/docs/stripe-cli
3. **Environment Setup**: Configure `.env` with test keys
4. **Running Services**: Backend, PostgreSQL, and Redis

## Part 1: Stripe Setup

### 1. Get Test API Keys

```bash
# Login to Stripe Dashboard
# Go to: https://dashboard.stripe.com/test/apikeys
# Copy your test secret key (starts with sk_test_)
```

Add to `backend/.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 2. Create Products and Prices

See [SUBSCRIPTIONS.md](../../docs/SUBSCRIPTIONS.md) for detailed instructions.

Quick start:
```bash
stripe login
stripe products create --name="Clipper Pro Monthly"
stripe prices create --product=prod_xxx --unit-amount=999 --currency=usd --recurring[interval]=month
stripe prices create --product=prod_xxx --unit-amount=9999 --currency=usd --recurring[interval]=year
```

### 3. Create Test Coupons

Run the provided script:
```bash
cd backend
./scripts/create-stripe-coupons.sh
```

### 4. Setup Webhook Forwarding

```bash
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
# Copy the webhook signing secret to .env
```

## Part 2: Test Checklist

### ✓ Basic Subscription Flow

1. [ ] Create checkout session (without coupon)
2. [ ] Complete purchase with test card `4242 4242 4242 4242`
3. [ ] Verify subscription status is `active`
4. [ ] Check webhook events received
5. [ ] Verify database records created

### ✓ Coupon Functionality

1. [ ] Create checkout session with `LAUNCH25` coupon
2. [ ] Verify 25% discount applied in checkout
3. [ ] Complete purchase
4. [ ] Check invoice shows discount
5. [ ] Test invalid coupon code

### ✓ Plan Changes with Proration

1. [ ] Subscribe to monthly plan
2. [ ] Change to yearly plan using `/change-plan` endpoint
3. [ ] Verify proration invoice created
4. [ ] Check subscription updated to new plan
5. [ ] Test downgrade scenario (yearly → monthly)

### ✓ Customer Portal

1. [ ] Create portal session
2. [ ] Access portal URL
3. [ ] Update payment method
4. [ ] View invoices
5. [ ] Cancel subscription

### ✓ Webhook Processing

1. [ ] Verify `customer.subscription.created` event
2. [ ] Verify `customer.subscription.updated` event
3. [ ] Verify `invoice.paid` event
4. [ ] Test failed payment scenario
5. [ ] Check audit logs in database

## Part 3: Quick API Tests

```bash
# Set your token
export TOKEN="your_jwt_token"

# Test checkout without coupon
curl -X POST "http://localhost:8080/api/v1/subscriptions/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_xxx"}'

# Test checkout with coupon
curl -X POST "http://localhost:8080/api/v1/subscriptions/checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_xxx", "coupon_code": "LAUNCH25"}'

# Get subscription status
curl -X GET "http://localhost:8080/api/v1/subscriptions/me" \
  -H "Authorization: Bearer $TOKEN"

# Change plan
curl -X POST "http://localhost:8080/api/v1/subscriptions/change-plan" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price_id": "price_yyy"}'

# Get portal URL
curl -X POST "http://localhost:8080/api/v1/subscriptions/portal" \
  -H "Authorization: Bearer $TOKEN"
```

## Part 4: Expected Behaviors

### Coupon Applied
- Discount shown in checkout UI
- Invoice reflects reduced amount
- Audit log records coupon code

### Proration Example
Monthly ($9.99) → Yearly ($99.99) after 5 days:
- Credit: ~$8.33 (unused monthly time)
- Charge: $99.99 (yearly plan)
- Net: ~$91.66

### Webhook Flow
1. User completes checkout
2. Stripe sends `customer.subscription.created`
3. Backend updates database
4. Subscription status becomes `active`
5. User gains Pro features

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not working | Check `stripe listen` is running |
| Coupon invalid | Verify coupon exists in Stripe |
| Proration fails | Ensure subscription is active |
| Checkout fails | Check price IDs and API keys |

## Production Readiness

Before going live:
- [ ] Switch to live Stripe keys
- [ ] Create live products/prices
- [ ] Configure live webhooks
- [ ] Test end-to-end with real cards
- [ ] Monitor error logs

See full documentation in [SUBSCRIPTIONS.md](../../docs/SUBSCRIPTIONS.md)
