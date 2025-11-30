# Stripe Integration

Payment processing, subscription management, and webhook handling.

## Setup

1. Stripe account with test/prod API keys
2. Configure environment:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
```

3. Configure webhook endpoint in Stripe Dashboard:
   - URL: `https://api.clipper.app/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

## Checkout Flow

### 1. Create Checkout Session

```
POST /api/v1/premium/checkout
```

Request:

```json
{
  "tier_id": "pro",
  "interval": "month"
}
```

Response:

```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Backend creates Stripe Checkout Session with:
- Customer ID (or create new)
- Price ID for selected interval
- Success/cancel URLs
- Metadata: user_id, tier

### 2. User Completes Payment

Stripe redirects to success URL after payment.

### 3. Webhook Confirms Subscription

Stripe sends `checkout.session.completed` event:

```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "customer": "cus_...",
      "subscription": "sub_...",
      "metadata": { "user_id": "123", "tier": "pro" }
    }
  }
}
```

Backend handler:
1. Verify webhook signature
2. Extract user_id from metadata
3. Create/update subscription record
4. Grant entitlements

## Subscription Management

Users manage subscriptions via Stripe Customer Portal:

```
POST /api/v1/premium/portal
```

Returns portal URL for:
- View invoices
- Update payment method
- Cancel subscription
- Change plan

## Webhooks

### Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create subscription, grant entitlements |
| `customer.subscription.updated` | Update subscription status/tier |
| `customer.subscription.deleted` | Revoke entitlements |
| `invoice.payment_succeeded` | Confirm renewal |
| `invoice.payment_failed` | Mark past_due, send recovery email |

### Webhook Handler

```go
func HandleStripeWebhook(c *gin.Context) {
  payload, _ := io.ReadAll(c.Request.Body)
  sig := c.GetHeader("Stripe-Signature")
  
  event, err := webhook.ConstructEvent(payload, sig, webhookSecret)
  if err != nil {
    c.JSON(400, gin.H{"error": "Invalid signature"})
    return
  }
  
  switch event.Type {
  case "checkout.session.completed":
    handleCheckoutCompleted(event.Data.Object)
  case "customer.subscription.updated":
    handleSubscriptionUpdated(event.Data.Object)
  // ...
  }
  
  c.JSON(200, gin.H{"received": true})
}
```

## Subscription States

| Status | Description | Entitlements |
|--------|-------------|--------------|
| `active` | Paid and current | Full Pro access |
| `trialing` | Free trial period | Full Pro access |
| `past_due` | Payment failed | Grace period (7 days) |
| `canceled` | User canceled | Revoked at period end |
| `unpaid` | Payment failed, dunning exhausted | Revoked |

## Dunning

Payment failure handling:

1. Invoice fails → status `past_due`
2. Stripe retries per dunning settings (3 attempts over 7 days)
3. Send recovery emails via Stripe
4. If all retries fail → status `unpaid`, revoke entitlements

See [DUNNING.md](../../docs/DUNNING.md) for full process.

## Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

Trigger webhooks via Stripe CLI:

```bash
stripe listen --forward-to localhost:8080/webhooks/stripe
stripe trigger checkout.session.completed
```

---

Related: [[overview|Overview]] · [[tiers|Tiers]] · [[entitlements|Entitlements]]

[[../index|← Back to Index]]
