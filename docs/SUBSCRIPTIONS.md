# Stripe Subscriptions

This document describes how to set up and manage Stripe subscriptions in the Clipper application.

> **📋 See [Subscription Privileges Matrix](./SUBSCRIPTION_PRIVILEGES_MATRIX.md) for a complete breakdown of features, limits, and gates for each subscription tier.**

## Overview

Clipper uses Stripe for subscription management, supporting monthly and yearly Pro subscription plans. The implementation includes:

- Stripe Checkout for subscription signup
- Customer Portal for subscription management
- Webhooks for automated subscription lifecycle handling
- Feature gating for Pro-only features
- Audit logging for all subscription events

## Getting Started

### 1. Create a Stripe Account

1. Sign up for a Stripe account at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Use **Test Mode** for development (toggle in the dashboard)
3. Never use Live Mode keys in development or testing environments

### 2. Get Your API Keys

1. Go to [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Secret key** (starts with `sk_test_`)
3. Add it to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 3. Create Products and Prices

#### Create Pro Monthly Plan

1. Go to [Products](https://dashboard.stripe.com/test/products) in Stripe Dashboard
2. Click **Add product**
3. Fill in:
   - **Name**: Clipper Pro Monthly
   - **Description**: Monthly Pro subscription for Clipper
   - **Pricing model**: Standard pricing
   - **Price**: $9.99 (or your desired amount)
   - **Billing period**: Monthly
   - **Currency**: USD
4. Click **Save product**
5. Copy the **Price ID** (starts with `price_`) and add to `.env`:

```env
STRIPE_PRO_MONTHLY_PRICE_ID=price_your_monthly_price_id
```

#### Create Pro Yearly Plan

1. In the same product, click **Add another price**
2. Fill in:
   - **Price**: $99.99 (or your desired amount)
   - **Billing period**: Yearly
3. Click **Add price**
4. Copy the **Price ID** and add to `.env`:

```env
STRIPE_PRO_YEARLY_PRICE_ID=price_your_yearly_price_id
```

### 4. Set Up Webhooks

1. Go to [Webhooks](https://dashboard.stripe.com/test/webhooks) in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your webhook URL: `https://your-domain.com/api/v1/webhooks/stripe`
   - For local testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`) and add to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Note:** The webhook system includes automatic retry with exponential backoff and a dead-letter queue for failed events. See [Webhook Retry Documentation](./WEBHOOK_RETRY.md) for details.

### 5. Configure Redirect URLs

Add these to your `.env` file:

```env
STRIPE_SUCCESS_URL=http://localhost:5173/subscription/success
STRIPE_CANCEL_URL=http://localhost:5173/subscription/cancel
```

For production, update these to your production URLs.

## Testing with Stripe CLI (Local Development)

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-brew/stripe

# Linux
# Replace v1.21.0 with the latest tested version as needed
wget https://github.com/stripe/stripe-cli/releases/download/v1.21.0/stripe_linux_amd64.tar.gz
tar -xvf stripe_linux_amd64.tar.gz
sudo mv stripe /usr/local/bin
### Forward Webhooks to Local Server

```bash
# Login to Stripe CLI
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe

# Copy the webhook signing secret and add to your .env file
```

This will display webhook events in your terminal as they occur.

## Test Cards

Use these test cards in Stripe Checkout (Test Mode only):

| Card Number          | Description                  | CVC   | Date       |
|---------------------|------------------------------|-------|------------|
| 4242 4242 4242 4242 | Successful payment           | Any 3 | Any future |
| 4000 0000 0000 0002 | Card declined                | Any 3 | Any future |
| 4000 0000 0000 9995 | Payment requires auth (3DS)  | Any 3 | Any future |
| 4000 0025 0000 3155 | Payment fails                | Any 3 | Any future |

More test cards: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

## API Endpoints

### Create Checkout Session

Creates a Stripe Checkout session for subscription signup.

**Endpoint**: `POST /api/v1/subscriptions/checkout`

**Authentication**: Required

**Request Body**:

```json
{
  "price_id": "price_your_monthly_or_yearly_price_id",
  "coupon_code": "OPTIONAL_COUPON_CODE"
}
```

**Response**:

```json
{
  "session_id": "cs_test_...",
  "session_url": "https://checkout.stripe.com/..."
}
```

**Usage**:

```javascript
// Without coupon
const response = await fetch('/api/v1/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    price_id: 'price_your_monthly_price_id'
  })
});

// With coupon code
const response = await fetch('/api/v1/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    price_id: 'price_your_monthly_price_id',
    coupon_code: 'LAUNCH25'
  })
});

const { session_url } = await response.json();
window.location.href = session_url; // Redirect to Stripe Checkout
```

**Notes**:

- The `coupon_code` field is optional
- Checkout also supports promotion codes entered by users during checkout
- Invalid coupon codes will be rejected by Stripe during checkout

### Create Customer Portal Session

Creates a Stripe Customer Portal session for managing subscriptions.

**Endpoint**: `POST /api/v1/subscriptions/portal`

**Authentication**: Required

**Response**:

```json
{
  "portal_url": "https://billing.stripe.com/..."
}
```

**Usage**:

```javascript
const response = await fetch('/api/v1/subscriptions/portal', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { portal_url } = await response.json();
window.location.href = portal_url; // Redirect to Customer Portal
```

### Get Current Subscription

Retrieves the authenticated user's subscription information.

**Endpoint**: `GET /api/v1/subscriptions/me`

**Authentication**: Required

**Response**:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_...",
  "stripe_price_id": "price_...",
  "status": "active",
  "tier": "pro",
  "current_period_start": "2024-01-01T00:00:00Z",
  "current_period_end": "2024-02-01T00:00:00Z",
  "cancel_at_period_end": false,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Change Subscription Plan

Changes the user's subscription plan (e.g., from monthly to yearly) with automatic proration.

**Endpoint**: `POST /api/v1/subscriptions/change-plan`

**Authentication**: Required

**Request Body**:

```json
{
  "price_id": "price_new_plan_price_id"
}
```

**Response**:

```json
{
  "message": "Subscription plan changed successfully"
}
```

**Usage**:

```javascript
const response = await fetch('/api/v1/subscriptions/change-plan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    price_id: 'price_your_yearly_price_id'
  })
});

const result = await response.json();
console.log(result.message); // "Subscription plan changed successfully"
```

**Notes**:

- This endpoint handles plan changes with automatic proration
- Proration is calculated and invoiced immediately
- The user will receive an invoice for any prorated charges
- Switching from monthly to yearly (upgrade) charges the prorated difference
- Switching from yearly to monthly (downgrade) credits the prorated amount
- The change takes effect immediately

### Webhook Handler

Processes Stripe webhook events.

**Endpoint**: `POST /api/v1/webhooks/stripe`

**Authentication**: None (validated via Stripe signature)

**Headers**:

- `Stripe-Signature`: Webhook signature from Stripe

This endpoint is called automatically by Stripe. Do not call it manually.

## Subscription Status Values

- `active`: Subscription is active and user has access to Pro features
- `trialing`: User is in trial period
- `past_due`: Payment failed, subscription is past due
- `canceled`: Subscription has been canceled
- `unpaid`: Payment failed and all retry attempts exhausted
- `inactive`: No active subscription (default for free users)

## Coupons and Discounts

### Creating Coupons in Stripe

1. Go to [Coupons](https://dashboard.stripe.com/test/coupons) in Stripe Dashboard
2. Click **Create coupon**
3. Configure:
   - **ID**: Coupon code (e.g., `LAUNCH25`, `SAVE20`)
   - **Type**: Percentage off or Amount off
   - **Value**: Discount amount (e.g., 25% or $5.00)
   - **Duration**: Once, Forever, or Multiple months
   - **Redemption limits**: Optional max redemptions
4. Click **Create coupon**

### Using Coupons in Checkout

#### Option 1: Pre-applied Coupon

```javascript
// Apply coupon in checkout request
const response = await fetch('/api/v1/subscriptions/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    price_id: 'price_your_monthly_price_id',
    coupon_code: 'LAUNCH25'
  })
});
```

#### Option 2: User-entered Promotion Code

The checkout session automatically allows users to enter promotion codes during checkout. Enable this feature in your Stripe Dashboard:

1. Go to Settings > Checkout
2. Enable "Allow promotion codes"

### Common Coupon Patterns

**Launch Discount (25% off first year)**:

- ID: `LAUNCH25`
- Type: Percentage
- Value: 25%
- Duration: Once

**Referral Discount (20% off)**:

- ID: `REFERRAL20`
- Type: Percentage
- Value: 20%
- Duration: Forever

**Student Discount (50% off)**:

- ID: `STUDENT50`
- Type: Percentage
- Value: 50%
- Duration: Forever

## Proration

### How Proration Works

When a user changes their subscription plan, Stripe automatically calculates proration:

1. **Upgrading** (monthly → yearly):
   - User is credited for the unused time on the current plan
   - User is charged for the new plan
   - Net difference is invoiced immediately

2. **Downgrading** (yearly → monthly):
   - User is credited for unused time on the current plan
   - Credit is applied to future invoices
   - Change takes effect immediately

### Proration Behavior

The implementation uses `always_invoice` proration behavior:

- Changes are invoiced immediately
- Users receive a clear breakdown of charges and credits
- No surprises at the next billing cycle

### Testing Proration

1. Create a subscription with a monthly plan
2. Use the change plan endpoint to switch to yearly:

   ```javascript
   fetch('/api/v1/subscriptions/change-plan', {
     method: 'POST',
     body: JSON.stringify({ price_id: 'price_yearly' })
   })
   ```

3. Check the invoice in Stripe Dashboard to see proration breakdown

## Feature Gating

To protect endpoints with subscription requirements, use the feature gating middleware:

### Require Pro Subscription

```go
// Require active Pro subscription
subscriptions := v1.Group("/premium")
subscriptions.Use(middleware.AuthMiddleware(authService))
subscriptions.Use(middleware.RequireProSubscription(subscriptionService))
{
    subscriptions.GET("/advanced-search", advancedSearchHandler)
    subscriptions.POST("/favorites/sync", favoriteSyncHandler)
}
```

### Require Any Active Subscription

```go
// Require any active subscription (future-proof for multiple tiers)
subscriptions := v1.Group("/subscriber")
subscriptions.Use(middleware.AuthMiddleware(authService))
subscriptions.Use(middleware.RequireActiveSubscription(subscriptionService))
{
    subscriptions.GET("/no-ads", noAdsHandler)
}
```

## Webhook Events

The application listens for these Stripe webhook events:

### customer.subscription.created

Fired when a new subscription is created. Updates the subscription record with:

- Stripe subscription ID
- Price ID
- Status
- Tier
- Current period dates
- Trial information (if applicable)

### customer.subscription.updated

Fired when a subscription is updated (e.g., upgraded, downgraded, or period renewed).

### customer.subscription.deleted

Fired when a subscription is canceled. Sets status to `canceled` and tier to `free`.

### invoice.paid

Fired when an invoice payment succeeds. Logs the successful payment event.

### invoice.payment_failed

Fired when an invoice payment fails. Updates subscription status to `past_due`.

## Audit Logging

All subscription events are logged for audit purposes:

- `customer_created`: Stripe customer account created
- `checkout_session_created`: Checkout session initiated
- `portal_session_created`: Customer Portal session created
- `subscription_created`: New subscription created
- `subscription_updated`: Subscription modified
- `subscription_deleted`: Subscription canceled
- `invoice_paid`: Invoice payment succeeded
- `invoice_payment_failed`: Invoice payment failed

Logs can be viewed in the Admin dashboard under Audit Logs.

## Idempotency

The implementation includes idempotency handling:

- **Checkout sessions**: Uses idempotency keys based on user ID, price ID, and timestamp
- **Webhooks**: Checks for duplicate Stripe event IDs before processing

## Security Best Practices

1. **Never commit API keys**: Keep `.env` files out of version control
2. **Use test mode**: Always use test mode keys for development
3. **Verify webhooks**: All webhook requests are verified using Stripe signatures
4. **Protect endpoints**: Use authentication and subscription middleware
5. **Audit logging**: All subscription events are logged with metadata

## Troubleshooting

### Webhooks not working

1. Check webhook signature is correct in `.env`
2. Verify webhook URL is publicly accessible
3. For local development, use Stripe CLI to forward webhooks
4. Check backend logs for webhook errors

### Subscription not updating

1. Check webhook events are being received (Stripe Dashboard > Webhooks)
2. Verify webhook endpoint is returning 200 OK
3. Check backend logs for processing errors
4. Ensure database migrations have been run

### Payment fails in test mode

1. Use valid test card numbers from [Stripe Testing](https://stripe.com/docs/testing)
2. Check Stripe Dashboard for error messages
3. Verify price IDs are correct in `.env`

## Production Deployment

Before deploying to production:

1. **Switch to Live Mode**:
   - Get live API keys from [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
   - Update `.env` with live keys (never commit these!)

2. **Create Live Products**:
   - Create products and prices in Live Mode
   - Update price IDs in production environment

3. **Configure Live Webhooks**:
   - Create webhook endpoint pointing to production URL
   - Update webhook secret in production environment

4. **Update Redirect URLs**:
   - Change success/cancel URLs to production domains

5. **Test Thoroughly**:
   - Test full subscription flow in production
   - Verify webhook processing
   - Check feature gating

## Support

For Stripe-specific issues, refer to:

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Support](https://support.stripe.com/)

For application-specific issues, create an issue in the repository.
