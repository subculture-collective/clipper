---
title: "Trials and Discounts Policy"
summary: "**Status**: Approved for Beta Milestone"
tags: ['premium']
area: "premium"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Trials and Discounts Policy

**Status**: Approved for Beta Milestone  
**Last Updated**: 2025-11-03  
**Owner**: Product & Marketing Team  
**Purpose**: Define trial periods, promotional discounts, and special offers

## Executive Summary

This document outlines Clipper's trial and discount policies for premium subscriptions. The strategy balances user acquisition, conversion optimization, and long-term retention while maintaining financial sustainability.

## Table of Contents

- [Trial Policy](#trial-policy)
- [Discount Programs](#discount-programs)
- [Promotional Campaigns](#promotional-campaigns)
- [Coupon System](#coupon-system)
- [Referral Program](#referral-program)
- [Student & Non-Profit Discounts](#student--non-profit-discounts)
- [Implementation Guidelines](#implementation-guidelines)
- [Related Documentation](#related-documentation)

## Trial Policy

### Standard Free Trial

**Offer**: 7-day free trial of Pro features

**Eligibility**:

- New users only (never had Pro subscription)
- Must provide valid payment method
- One trial per user account
- One trial per payment method

**Mechanics**:

- Trial starts immediately upon signup
- Full Pro access during trial period
- Automatic conversion to paid subscription after 7 days
- Can cancel anytime during trial without charge
- Email reminders at day 5 and day 6

**Stripe Configuration**:

```go
// Trial period in Stripe subscription
TrialPeriodDays: 7
```

**Conversion Strategy**:

- Send welcome email with Pro feature highlights
- In-app tips showcasing Pro features during trial
- Reminder emails before trial ends
- Exit survey for users who cancel during trial

**Expected Metrics**:

- Trial signup rate: Target 15-20% of free users
- Trial-to-paid conversion: Target 35-45%
- Trial cancellation rate: Target 55-65%

### Extended Trial Program

**Offer**: 14-day or 30-day extended trials

**Eligibility**:

- Special promotional periods (launch, holidays)
- Partnership programs
- Influencer/creator referrals
- Community leader invitations
- Recovery offers for churned users

**Use Cases**:

- **Launch Trial**: 14-day trial during beta launch
- **Holiday Special**: 14-day trial during Black Friday/Cyber Monday
- **Partner Referral**: 30-day trial from partner links
- **Creator Promo**: 30-day trial via creator codes
- **Win-back Campaign**: 14-day trial for users who canceled

**Implementation**:

```go
// Coupon-based extended trial
Coupon: "EXTENDED14" // 14-day trial
Coupon: "CREATOR30" // 30-day trial
```

### Trial-to-Paid Optimization

**Day 1: Welcome & Onboarding**

- Welcome email with Pro feature overview
- In-app onboarding tour highlighting Pro features
- Quick win: "Create your first collection"

**Day 3: Engagement Check**

- Usage analytics email
- Feature suggestion based on behavior
- "You've saved X clips, organize them into collections"

**Day 5: Reminder & Value Prop**

- Email: "2 days left in your Pro trial"
- Showcase most-used Pro feature
- Testimonial from similar user

**Day 6: Last Chance**

- Email: "Your trial ends tomorrow"
- Clear call-to-action to subscribe
- Annual plan discount offer (15% off)

**Post-Trial (Cancellation)**

- Exit survey: Why didn't you subscribe?
- Offer assistance or feature guidance
- 20% discount offer to come back within 30 days

## Discount Programs

### Annual Plan Discount

**Offer**: 17% savings on annual vs. monthly

**Pricing**:

- Monthly: $9.99/month × 12 = $119.88/year
- Annual: $99.99/year (save $19.89)
- Effective monthly: $8.33/month

**Positioning**:

- Default recommendation on pricing page
- "Most popular" badge on annual option
- Savings calculator showing dollar amount saved

**Rationale**:

- Improves customer lifetime value (LTV)
- Reduces churn (annual commitment)
- Provides upfront cash flow
- Industry standard discount (15-20%)

### Promotional Discounts

#### Launch Discount

**Offer**: 25% off first year for early adopters

**Duration**: First 3 months of public launch

**Code**: `LAUNCH25`

**Pricing**:

- Monthly: $7.49/month (was $9.99)
- Annual: $74.99/year (was $99.99)

**Eligibility**:

- Available to all new Pro subscribers
- One-time discount on first year only
- Pricing returns to standard after first year

**Goal**: Acquire 1,000+ paying subscribers during launch period

#### Seasonal Promotions

**Black Friday / Cyber Monday**

- Offer: 30% off annual plan
- Code: `BFCM30`
- Pricing: $69.99/year (was $99.99)
- Duration: 4 days (Black Friday through Cyber Monday)

**Holiday Special**

- Offer: 20% off any plan for 2 weeks
- Code: `HOLIDAY20`
- Pricing: Monthly $7.99, Annual $79.99
- Duration: December 15 - December 31

**Anniversary Sale**

- Offer: 40% off annual plan
- Code: `ANNIVERSARY40`
- Pricing: $59.99/year (was $99.99)
- Duration: 1 week around platform anniversary

**New Year Resolution**

- Offer: "Start the year organized" - 15% off
- Code: `NEWYEAR15`
- Pricing: Monthly $8.49, Annual $84.99
- Duration: January 1 - January 15

### Tiered Discount Strategy

| Discount | Frequency | Use Case | Expected Impact |
|----------|-----------|----------|-----------------|
| 10-15% | Regular | Retention, win-back | +5-10% conversion |
| 20-25% | Quarterly | Seasonal campaigns | +15-20% conversion |
| 30-40% | Annual | Major events only | +30-40% conversion |
| 50%+ | Never | Devalues product | Not recommended |

**Best Practices**:

- Limit deep discounts (>30%) to special occasions
- Avoid constant discounts (reduces perceived value)
- Use urgency (limited time) to drive action
- Track discount effectiveness and ROI

## Promotional Campaigns

### Campaign Types

#### 1. Acquisition Campaigns

**Target**: Convert free users to Pro

**Tactics**:

- In-app upgrade prompts when hitting limits
- Email campaigns to engaged free users
- Limited-time discount offers
- Feature launch announcements

**Example**:

```
Subject: Unlock Advanced Search - 20% Off Pro
Body: You've searched 45 times this month! Upgrade to Pro 
and get unlimited searches with advanced filters. 
Use code SEARCH20 for 20% off your first year.
```

#### 2. Retention Campaigns

**Target**: Keep existing Pro subscribers

**Tactics**:

- Loyalty rewards (free month after 1 year)
- Early access to new features
- Exclusive community events
- Pro-only beta programs

**Example**:

```
Subject: Thank you for 1 year of Pro!
Body: You've been a Pro member for a year. Here's a free 
month on us as a thank you. Plus, check out these new 
Pro features we just launched...
```

#### 3. Win-back Campaigns

**Target**: Re-engage canceled subscribers

**Tactics**:

- 14-day re-activation trial
- "We miss you" discount (25% off)
- Survey on why they canceled
- Showcase new features since they left

**Example**:

```
Subject: Come back to Clipper Pro - 25% Off
Body: We noticed you canceled Pro. We've added tons of 
new features since you left. Try them with 14 days free, 
then 25% off if you resubscribe.
```

#### 4. Upgrade Campaigns

**Target**: Move users from monthly to annual

**Tactics**:

- Savings calculator in account settings
- Email after 3 months of monthly subscription
- Limited-time bonus discount on annual switch
- Pro-rate remaining monthly subscription

**Example**:

```
Subject: Save $40/year by switching to annual billing
Body: You've been on Pro for 3 months. Switch to annual 
billing and save $40 per year. We'll pro-rate your 
current month. Upgrade now →
```

### Campaign Calendar (Example Year)

| Month | Campaign | Offer | Goal |
|-------|----------|-------|------|
| Jan | New Year Resolution | 15% off | Acquire 200 new Pro |
| Feb | Valentine's for Creators | Creator code 30-day trial | Partner with 10 creators |
| Mar | Spring Cleaning | Feature your collections | Engage existing users |
| Apr | — | Standard pricing | Maintain baseline |
| May | Anniversary Sale | 40% off annual | Acquire 300 new Pro |
| Jun | Summer Special | 20% off | Maintain momentum |
| Jul | Mid-Year Review | Loyalty reward | Retain existing |
| Aug | Back to School | Student discount launch | Target students |
| Sep | — | Standard pricing | Maintain baseline |
| Oct | Creator Month | Partner trials | Build creator network |
| Nov | Black Friday/Cyber Monday | 30% off annual | Biggest revenue push |
| Dec | Holiday Special | 20% off | End year strong |

## Coupon System

### Coupon Architecture

**Stripe Integration**: Use Stripe's native coupon system

**Coupon Types**:

1. **Percentage off**: X% discount (e.g., 20% off)
2. **Amount off**: Fixed discount (e.g., $2 off)
3. **Trial extension**: Extended trial period
4. **Free months**: Complimentary access period

### Coupon Code Format

**Structure**: `PREFIX[NUMBER][SUFFIX]`

**Examples**:

- `LAUNCH25` - Launch campaign, 25% off
- `BFCM30` - Black Friday/Cyber Monday, 30% off
- `FRIEND20` - Referral program, 20% off
- `CREATOR30DAYS` - Creator program, 30-day trial
- `STUDENT50` - Student discount, 50% off

**Best Practices**:

- Keep codes short and memorable
- Use consistent naming convention
- Make codes easy to communicate verbally
- Avoid ambiguous characters (O vs 0, I vs 1)

### Coupon Configuration

```go
// Stripe coupon examples

// Percentage discount
&stripe.CouponParams{
    ID:               stripe.String("LAUNCH25"),
    PercentOff:       stripe.Float64(25),
    Duration:         stripe.String("once"), // once, repeating, forever
    DurationInMonths: stripe.Int64(0),       // for repeating
    Name:             stripe.String("Launch Campaign 25% Off"),
}

// Amount discount
&stripe.CouponParams{
    ID:         stripe.String("SAVE5"),
    AmountOff:  stripe.Int64(500), // $5.00 in cents
    Currency:   stripe.String("usd"),
    Duration:   stripe.String("once"),
    Name:       stripe.String("$5 Off First Month"),
}

// Trial extension (handled via SubscriptionParams, not CouponParams)
// To implement an extended trial, use the coupon code in your application logic
// to set TrialPeriodDays when creating the subscription:
//
//   if coupon == "EXTENDED14" {
//       subParams.TrialPeriodDays = stripe.Int64(14)
//   }
```

### Coupon Management

**Creation**:

- Create in Stripe Dashboard or via API
- Set expiration dates for time-limited offers
- Set redemption limits (total uses, per customer)

**Tracking**:

- Monitor coupon usage in Stripe Dashboard
- Track conversion rates per coupon code
- Measure campaign ROI (cost vs. revenue)

**Expiration**:

- Auto-expire after campaign ends
- Archive old codes (don't delete for records)
- Communicate expiration clearly to users

### Coupon Validation

**Frontend Validation**:

```typescript
async function validateCoupon(code: string): Promise<CouponValidation> {
  const response = await api.post('/api/v1/subscriptions/validate-coupon', {
    code: code.toUpperCase().trim()
  });
  
  return {
    valid: response.valid,
    discount: response.discount,
    message: response.message,
    expiresAt: response.expiresAt
  };
}
```

**Backend Validation**:

```go
func (h *SubscriptionHandler) ValidateCoupon(c *gin.Context) {
    var req struct {
        Code string `json:"code" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "Invalid request"})
        return
    }
    
    // Validate with Stripe
    coupon, err := h.stripeClient.Coupons.Get(req.Code, nil)
    if err != nil {
        c.JSON(404, gin.H{
            "valid": false,
            "message": "Invalid or expired coupon code",
        })
        return
    }
    
    c.JSON(200, gin.H{
        "valid": true,
        "discount": coupon.PercentOff,
        "message": fmt.Sprintf("%d%% off", coupon.PercentOff),
        "expiresAt": coupon.RedeemBy,
    })
}
```

## Referral Program

### Program Structure

**Offer**: Give 20%, Get 20%

**Mechanics**:

- Referring user gets 20% off next month when friend subscribes
- Referred user gets 20% off first month
- Unlimited referrals allowed
- Credits accumulate (max 12 months free)

**Implementation Status**: Planned for Phase 2

### Referral Tracking

```go
// User referral code
type User struct {
    ID           uuid.UUID
    ReferralCode string // Unique code per user (e.g., "JOHN-CLIP-2024")
    ReferredBy   *uuid.UUID // Optional: who referred this user
}

// Referral record
type Referral struct {
    ID           uuid.UUID
    ReferrerID   uuid.UUID // User who referred
    ReferredID   uuid.UUID // User who was referred
    Status       string    // pending, completed, expired
    RewardIssued bool
    CreatedAt    time.Time
}
```

### Reward Distribution

**Trigger**: When referred user completes first paid month

**Referrer Reward**:

- Credit: 20% off next month or $2 credit
- Notification: Email + in-app notification
- Applied automatically to next invoice

**Referred User Reward**:

- Coupon: Applied during checkout
- Code: Auto-generated based on referral link

### Referral Analytics

**Track**:

- Total referrals per user
- Successful conversions
- Revenue from referrals
- Top referrers (leaderboard)
- Referral source (social, email, direct)

## Student & Non-Profit Discounts

### Student Discount Program

**Offer**: 50% off Pro subscription

**Eligibility**:

- Currently enrolled students (high school, college, university)
- Valid .edu email address OR student ID verification
- Annual verification required

**Pricing**:

- Monthly: $4.99/month (was $9.99)
- Annual: $49.99/year (was $99.99)

**Verification**:

- SheerID integration (industry standard)
- Manual review as fallback
- Verification valid for 12 months

**Terms**:

- Discount valid during enrollment only
- Must re-verify annually
- Switches to standard pricing upon graduation

### Non-Profit Discount

**Offer**: 30% off Pro subscription for 501(c)(3) organizations

**Eligibility**:

- Registered non-profit organization
- Valid 501(c)(3) status (US) or equivalent
- Organization email address

**Pricing**:

- Monthly: $6.99/month (was $9.99)
- Annual: $69.99/year (was $99.99)

**Verification**:

- Provide EIN or non-profit registration
- Manual review by support team
- Annual re-verification

### Application Process

1. User clicks "Student/Non-Profit Discount" link
2. Complete verification form (SheerID or manual)
3. Upload proof (student ID, .edu email, EIN)
4. Review within 1-2 business days
5. Receive discount coupon code via email
6. Apply code at checkout

## Implementation Guidelines

### Backend Implementation

#### Coupon Validation Endpoint

```go
// POST /api/v1/subscriptions/validate-coupon
func (h *SubscriptionHandler) ValidateCoupon(c *gin.Context) {
    var req struct {
        Code string `json:"code" binding:"required"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "Invalid request"})
        return
    }
    
    code := strings.ToUpper(strings.TrimSpace(req.Code))
    
    // Fetch coupon from Stripe
    coupon, err := h.stripe.Coupons.Get(code, nil)
    if err != nil {
        c.JSON(404, gin.H{
            "valid":   false,
            "message": "Invalid or expired coupon code",
        })
        return
    }
    
    // Check if still valid
    if coupon.RedeemBy != 0 && time.Unix(coupon.RedeemBy, 0).Before(time.Now()) {
        c.JSON(400, gin.H{
            "valid":   false,
            "message": "This coupon has expired",
        })
        return
    }
    
    // Check redemption limit
    if coupon.MaxRedemptions != 0 && coupon.TimesRedeemed >= coupon.MaxRedemptions {
        c.JSON(400, gin.H{
            "valid":   false,
            "message": "This coupon has reached its redemption limit",
        })
        return
    }
    
    discount := ""
    if coupon.PercentOff != 0 {
        discount = fmt.Sprintf("%.0f%% off", coupon.PercentOff)
    } else if coupon.AmountOff != 0 {
        discount = fmt.Sprintf("$%.2f off", float64(coupon.AmountOff)/100)
    }
    
    c.JSON(200, gin.H{
        "valid":      true,
        "code":       code,
        "discount":   discount,
        "percentOff": coupon.PercentOff,
        "amountOff":  coupon.AmountOff,
        "message":    fmt.Sprintf("Coupon applied: %s", discount),
        "expiresAt":  coupon.RedeemBy,
    })
}
```

#### Apply Coupon at Checkout

```go
// Create checkout session with coupon
func (h *SubscriptionHandler) CreateCheckoutSession(c *gin.Context) {
    var req struct {
        PriceID string  `json:"price_id" binding:"required"`
        Coupon  *string `json:"coupon"` // Optional coupon code
    }
    
    // ... existing code ...
    
    params := &stripe.CheckoutSessionParams{
        Customer:   stripe.String(customerID),
        Mode:       stripe.String("subscription"),
        SuccessURL: stripe.String(successURL),
        CancelURL:  stripe.String(cancelURL),
        LineItems: []*stripe.CheckoutSessionLineItemParams{
            {
                Price:    stripe.String(req.PriceID),
                Quantity: stripe.Int64(1),
            },
        },
    }
    
    // Apply coupon if provided
    if req.Coupon != nil && *req.Coupon != "" {
        params.Discounts = []*stripe.CheckoutSessionDiscountParams{
            {
                Coupon: stripe.String(*req.Coupon),
            },
        }
    }
    
    session, err := h.stripe.CheckoutSessions.New(params)
    // ... handle response ...
}
```

### Frontend Implementation

#### Coupon Input Component

```typescript
// src/components/subscription/CouponInput.tsx
export function CouponInput({ onApply }: { onApply: (code: string) => void }) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<CouponValidation | null>(null);
  
  const handleValidate = async () => {
    if (!code.trim()) return;
    
    setValidating(true);
    try {
      const validation = await api.validateCoupon(code);
      setResult(validation);
      
      if (validation.valid) {
        onApply(code);
        toast.success(validation.message);
      } else {
        toast.error(validation.message);
      }
    } catch (error) {
      toast.error('Invalid coupon code');
      setResult({ valid: false, message: 'Invalid coupon code' });
    } finally {
      setValidating(false);
    }
  };
  
  return (
    <div className="coupon-input">
      <label>Have a coupon code?</label>
      <div className="input-group">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          disabled={validating}
        />
        <button onClick={handleValidate} disabled={validating || !code.trim()}>
          {validating ? 'Validating...' : 'Apply'}
        </button>
      </div>
      
      {result && (
        <div className={result.valid ? 'success' : 'error'}>
          {result.message}
        </div>
      )}
    </div>
  );
}
```

#### Pricing Page with Promotions

```typescript
// src/pages/Pricing.tsx
export function Pricing() {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  
  useEffect(() => {
    // Check for active promotional campaign
    api.getActiveCampaign().then(setActiveCampaign);
  }, []);
  
  return (
    <div className="pricing-page">
      {activeCampaign && (
        <PromotionalBanner campaign={activeCampaign} />
      )}
      
      <PricingTiers coupon={activeCampaign?.coupon} />
      
      <CouponInput onApply={handleCouponApply} />
    </div>
  );
}
```

## Analytics & Tracking

### Key Metrics

**Trial Metrics**:

- Trial start rate (% of free users)
- Trial-to-paid conversion rate
- Average trial engagement (feature usage)
- Cancellation reasons during trial

**Discount Metrics**:

- Coupon redemption rate
- Revenue impact (discounted vs. full price)
- Campaign ROI (cost vs. incremental revenue)
- Discount dependency (users waiting for sales)

**Referral Metrics**:

- Referral link shares
- Referral conversion rate
- Referral revenue contribution
- Top referrers

**Student/Non-Profit Metrics**:

- Application volume
- Approval rate
- Revenue from discounted subscriptions
- Retention rate vs. standard Pro

### Stripe Analytics

Use Stripe Dashboard to track:

- Coupon usage over time
- Revenue by coupon code
- Most successful campaigns
- Discount impact on MRR

### Custom Analytics

```sql
-- Track trial conversions
SELECT 
  DATE_TRUNC('month', trial_start) as month,
  COUNT(*) as trial_starts,
  COUNT(CASE WHEN converted = true THEN 1 END) as conversions,
  ROUND(100.0 * COUNT(CASE WHEN converted = true THEN 1 END) / COUNT(*), 2) as conversion_rate
FROM trial_signups
GROUP BY month
ORDER BY month DESC;

-- Track coupon effectiveness
SELECT 
  coupon_code,
  COUNT(DISTINCT user_id) as redemptions,
  SUM(discount_amount) as total_discount,
  SUM(revenue) as total_revenue,
  AVG(ltv) as avg_ltv
FROM subscription_events
WHERE coupon_code IS NOT NULL
GROUP BY coupon_code
ORDER BY redemptions DESC;
```

## Related Documentation

- **[Premium Tiers](./PREMIUM_TIERS.md)** - Pricing and subscription tiers
- **[Entitlement Matrix](./ENTITLEMENT_MATRIX.md)** - Feature gates and access control
- **[Subscription Privileges Matrix](./SUBSCRIPTION_PRIVILEGES_MATRIX.md)** - Implementation reference
- **[Stripe Integration](./SUBSCRIPTIONS.md)** - Payment processing setup
- **[API Documentation](./API.md)** - API endpoints for subscriptions

---

**Last Updated**: 2025-11-03  
**Status**: Approved for Implementation  
**Owner**: Product & Marketing Teams  
**Questions**: Create issue with `trials`, `discounts`, or `premium` label
