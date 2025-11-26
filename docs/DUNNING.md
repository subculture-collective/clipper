# Dunning and Failed Payment Recovery

**Status**: ✅ Implemented
**Last Updated**: 2025-11-08
**Related**: [Premium Overview](./PREMIUM_OVERVIEW.md), [Subscriptions](./SUBSCRIPTIONS.md)

## Overview

This document describes the dunning and failed payment recovery process for Clipper's subscription system. Dunning refers to the automated process of recovering failed subscription payments while maintaining a positive user experience.

## Key Concepts

### Grace Period

When a subscription payment fails, the user enters a **7-day grace period** during which:

- Premium features remain accessible
- Multiple payment retry attempts are made automatically by Stripe
- Email notifications are sent to inform the user and encourage payment update
- The user can update their payment method at any time

### Payment Failure States

Subscriptions can be in the following states related to payment failures:

| State | Description | Premium Access | Actions |
|-------|-------------|----------------|---------|
| `active` | Subscription is current | ✅ Full access | None |
| `trialing` | In free trial period | ✅ Full access | None |
| `past_due` | Payment failed, in grace period | ✅ Full access (grace period) | Send notifications, retry payment |
| `unpaid` | Payment failed, retry exhausted | ✅ Full access (if in grace period) | Send final warnings |
| `canceled` | Grace period expired | ❌ Downgraded to free | None |

## Workflow

### 1. Payment Failure

When a payment fails (Stripe sends `invoice.payment_failed` webhook):

1. **Create Payment Failure Record**
   - Store invoice details, amount due, attempt count
   - Track next retry time from Stripe

2. **Set Grace Period**
   - If not already set, add 7 days from first failure
   - User retains full premium access during this time

3. **Send Initial Notification**
   - Email: "Payment Failed - Action Required"
   - Includes amount due, grace period end date
   - Call-to-action to update payment method

4. **Update Subscription Status**
   - Change to `past_due`
   - Log audit event for entitlement tracking

### 2. Payment Retry

When Stripe automatically retries payment (subsequent `invoice.payment_failed` events):

1. **Update Failure Record**
   - Increment attempt count
   - Update next retry time

2. **Send Retry Notification**
   - Email: "Payment Retry Scheduled"
   - Shows retry attempt number
   - Reminds user to update payment method

### 3. Grace Period Warnings

Daily job checks for subscriptions approaching grace period expiry:

1. **Check Grace Period Status**
   - Find subscriptions with 2 days or less remaining
   - Filter for those not yet downgraded

2. **Send Warning Email**
   - Email: "Your Premium Access Will End Soon"
   - Shows days remaining, features at risk
   - Urgent call-to-action to update payment

### 4. Grace Period Expiry

Hourly job checks for expired grace periods:

1. **Identify Expired Subscriptions**
   - Find subscriptions with grace period in the past
   - Still in `past_due` or `unpaid` state

2. **Downgrade to Free Tier**
   - Change tier from `pro` to `free`
   - Change status to `canceled`
   - Clear grace period end date

3. **Send Downgrade Notification**
   - Email: "Your Subscription Has Been Downgraded"
   - Explain what happened
   - Offer easy re-subscription path

4. **Log Audit Event**
   - Record entitlement change
   - Track reason: `grace_period_expired`

### 5. Payment Success (Recovery)

When payment succeeds after failures (Stripe sends `invoice.paid` webhook):

1. **Mark Failures as Resolved**
   - Update all unresolved payment failures
   - Set resolved timestamp

2. **Clear Grace Period**
   - Remove grace period end date
   - Restore normal subscription status

3. **Log Recovery**
   - Audit event: `payment_recovered`
   - Track amount paid, recovery timeline

## Email Notifications

### Payment Failed

- **Subject**: Payment Failed - Action Required
- **Timing**: Immediately after first failure
- **Content**: Amount due, grace period info, update link
- **Tone**: Helpful, non-urgent

### Payment Retry

- **Subject**: Payment Retry Scheduled
- **Timing**: After each retry attempt
- **Content**: Retry count, next attempt time
- **Tone**: Informative, encouraging

### Grace Period Warning

- **Subject**: Your Premium Access Will End Soon
- **Timing**: 2 days before expiry
- **Content**: Days remaining, features at risk, urgent CTA
- **Tone**: Urgent but helpful

### Subscription Downgraded

- **Subject**: Your Subscription Has Been Downgraded
- **Timing**: Immediately after downgrade
- **Content**: Explanation, free tier features, re-subscribe option
- **Tone**: Regretful but helpful

## Database Schema

### Payment Failures Table

```sql
CREATE TABLE payment_failures (
    id UUID PRIMARY KEY,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    amount_due BIGINT NOT NULL, -- in cents
    currency VARCHAR(3) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    failure_reason TEXT,
    next_retry_at TIMESTAMPTZ,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Dunning Attempts Table

```sql
CREATE TABLE dunning_attempts (
    id UUID PRIMARY KEY,
    payment_failure_id UUID REFERENCES payment_failures(id),
    user_id UUID REFERENCES users(id),
    attempt_number INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Subscriptions Table (Extended)

```sql
ALTER TABLE subscriptions
ADD COLUMN grace_period_end TIMESTAMPTZ;
```

## Scheduled Jobs

### Grace Period Expiry Check

- **Frequency**: Every hour
- **Task**: Process subscriptions with expired grace periods
- **Actions**: Downgrade to free tier, send notifications
- **Function**: `DunningService.ProcessExpiredGracePeriods()`

### Grace Period Warnings

- **Frequency**: Daily (at 9 AM user's timezone ideally)
- **Task**: Send warnings for soon-to-expire grace periods
- **Actions**: Email users with 2 days or less remaining
- **Function**: `DunningService.SendGracePeriodWarnings()`

## Configuration

### Grace Period Duration

```go
const GracePeriodDuration = 7 * 24 * time.Hour // 7 days
```

### Warning Threshold

Grace period warnings are sent when:

- Time remaining ≤ 2 days
- User has not yet been downgraded

## API Endpoints

No direct API endpoints - dunning is handled automatically via webhooks and scheduled jobs.

## Monitoring

### Key Metrics

Track these metrics for dunning effectiveness:

1. **Recovery Rate**: % of failed payments that recover within grace period
2. **Average Recovery Time**: Time from failure to successful payment
3. **Downgrade Rate**: % of failures that result in downgrade
4. **Email Open Rates**: Engagement with dunning emails
5. **Payment Update Rate**: % of users who update payment methods

### Audit Trail

All dunning events are logged to:

- `subscription_events` table (for Stripe events)
- `audit_logs` table (for entitlement changes)
- `dunning_attempts` table (for communication attempts)

### Alerts

Set up alerts for:

- High failure rates (> 10% of renewals)
- Low recovery rates (< 50%)
- Downgrade spikes
- Email delivery failures

## User Experience

### Dashboard Indicators

When in grace period, show:

- Warning banner with days remaining
- Prominent "Update Payment Method" button
- List of features at risk

### Email Best Practices

- Clear subject lines
- Mobile-responsive design
- One-click payment update link
- Unsubscribe option (for non-critical emails)
- Plain text alternative

### Support

Users can:

- Update payment method via Customer Portal (Stripe)
- Contact support for assistance
- View payment history and failure reasons
- Manually retry payment

## Testing

### Test Scenarios

1. **First Payment Failure**
   - Trigger via Stripe test mode
   - Verify grace period set
   - Check email sent

2. **Payment Retry**
   - Multiple failures
   - Attempt count increments
   - Email notifications

3. **Grace Period Expiry**
   - Fast-forward time in tests
   - Verify downgrade
   - Check audit logs

4. **Payment Recovery**
   - Success after failures
   - Grace period cleared
   - Failures marked resolved

### Stripe Webhook Testing

Use Stripe CLI to test webhooks:

```bash
stripe trigger invoice.payment_failed
stripe trigger invoice.paid
```

## Security Considerations

- Never store full payment card details
- Use Stripe Customer Portal for payment updates
- Log all entitlement changes for audit
- Rate limit email notifications
- Sanitize error messages shown to users

## Future Enhancements

- [ ] Customizable grace period by tier
- [ ] SMS notifications in addition to email
- [ ] Automated win-back campaigns
- [ ] Payment method verification before expiry
- [ ] Retry schedule optimization based on success rates
- [ ] A/B testing of notification content
- [ ] In-app notifications

## Related Documentation

- [Stripe Subscriptions](./SUBSCRIPTIONS.md) - Payment processing setup
- [Premium Overview](./PREMIUM_OVERVIEW.md) - Feature gates and tiers
- [Audit Logs](./AUDIT_LOGS.md) - Event tracking system
- [Email Service](./EMAIL_SERVICE.md) - Notification infrastructure
