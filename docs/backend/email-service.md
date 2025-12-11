<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Email Service Integration Guide](#email-service-integration-guide)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [SendGrid Account Setup](#sendgrid-account-setup)
    - [1. Create SendGrid Account](#1-create-sendgrid-account)
    - [2. Add Custom Domain](#2-add-custom-domain)
    - [3. Set Up SPF and DKIM Records](#3-set-up-spf-and-dkim-records)
    - [4. Verify Domain](#4-verify-domain)
  - [API Key Configuration](#api-key-configuration)
    - [Create API Key with Restricted Permissions](#create-api-key-with-restricted-permissions)
    - [Secure the API Key](#secure-the-api-key)
  - [Backend Configuration](#backend-configuration)
    - [Environment Variables](#environment-variables)
    - [Configuration File](#configuration-file)
  - [Email Service Interface](#email-service-interface)
    - [Basic Email Service Interface](#basic-email-service-interface)
    - [Supported Notification Types](#supported-notification-types)
    - [Email Templates](#email-templates)
  - [Testing with Sandbox Mode](#testing-with-sandbox-mode)
    - [Enable Sandbox Mode](#enable-sandbox-mode)
    - [Sandbox Mode Features](#sandbox-mode-features)
    - [Log Output Example](#log-output-example)
    - [Testing Checklist](#testing-checklist)
  - [Monitoring and Alerting](#monitoring-and-alerting)
    - [Key Metrics to Track](#key-metrics-to-track)
    - [SendGrid Dashboard Monitoring](#sendgrid-dashboard-monitoring)
    - [Alerts to Configure](#alerts-to-configure)
    - [Logging](#logging)
  - [Troubleshooting](#troubleshooting)
    - [Common Issues](#common-issues)
    - [Debug Mode](#debug-mode)
    - [Test Email Send](#test-email-send)
  - [Best Practices](#best-practices)
    - [Security](#security)
    - [Deliverability](#deliverability)
    - [Performance](#performance)
    - [Compliance](#compliance)
  - [Feature Flags](#feature-flags)
  - [Support](#support)
  - [Appendix](#appendix)
    - [SendGrid Rate Limits](#sendgrid-rate-limits)
    - [Email Size Limits](#email-size-limits)
    - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Email Service Integration Guide"
summary: "The Clipper backend uses SendGrid for transactional email delivery. This document provides comprehen"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Email Service Integration Guide

## Overview

The Clipper backend uses SendGrid for transactional email delivery. This document provides comprehensive guidance on setting up, configuring, and using the email service.

## Table of Contents

- [SendGrid Account Setup](#sendgrid-account-setup)
- [Domain Authentication (SPF/DKIM)](#domain-authentication-spfdkim)
- [API Key Configuration](#api-key-configuration)
- [Backend Configuration](#backend-configuration)
- [Email Service Interface](#email-service-interface)
- [Testing with Sandbox Mode](#testing-with-sandbox-mode)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Troubleshooting](#troubleshooting)

## SendGrid Account Setup

### 1. Create SendGrid Account

1. Visit [SendGrid](https://sendgrid.com) and sign up for an account
2. Choose the appropriate plan based on your email volume needs:
   - **Free**: 100 emails/day
   - **Essentials**: Up to 100,000 emails/month
   - **Pro**: Unlimited contacts and advanced features

3. Complete email verification to activate your account

### 2. Add Custom Domain

To send emails from your custom domain (e.g., `noreply@clpr.tv`):

1. Navigate to **Settings > Sender Authentication** in SendGrid dashboard
2. Click **Authenticate Your Domain**
3. Select your DNS host provider
4. Enter your domain: `clpr.tv`
5. SendGrid will provide DNS records to add

### 3. Set Up SPF and DKIM Records

SPF (Sender Policy Framework) and DKIM (DomainKeys Identified Mail) authenticate your emails and improve deliverability.

#### Add the following DNS records to your domain:

**SPF Record (TXT)**:
```
Type: TXT
Host: @
Value: v=spf1 include:sendgrid.net ~all
```

**DKIM Records (CNAME)** - SendGrid provides these:
```
Type: CNAME
Host: s1._domainkey
Value: s1.domainkey.u12345678.wl.sendgrid.net

Type: CNAME
Host: s2._domainkey
Value: s2.domainkey.u12345678.wl.sendgrid.net
```

**Note**: The exact values will be provided by SendGrid during domain authentication.

### 4. Verify Domain

1. After adding DNS records, wait for propagation (usually 24-48 hours)
2. Return to SendGrid dashboard and click **Verify**
3. Once verified, you'll see a green checkmark

## API Key Configuration

### Create API Key with Restricted Permissions

For security best practices, create an API key with minimal required permissions:

1. Navigate to **Settings > API Keys** in SendGrid dashboard
2. Click **Create API Key**
3. Name: `Clipper Production` (or appropriate environment name)
4. Select **Restricted Access**
5. Enable only these permissions:
   - **Mail Send**: Full Access
   - **Stats**: Read Access (optional, for monitoring)
6. Click **Create & View**
7. **IMPORTANT**: Copy the API key immediately - it won't be shown again

### Secure the API Key

**Never commit API keys to version control!**

1. Add to your environment variables or secrets manager
2. For development, add to `.env` file (which should be in `.gitignore`)
3. For production, use:
   - AWS Secrets Manager
   - Azure Key Vault
   - HashiCorp Vault
   - Kubernetes Secrets
   - Environment variables in your deployment platform

## Backend Configuration

### Environment Variables

Add these variables to your environment:

```bash
# Email Service Configuration
EMAIL_ENABLED=true
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
EMAIL_FROM_ADDRESS=noreply@clpr.tv
EMAIL_FROM_NAME=Clipper
EMAIL_SANDBOX_MODE=false  # Set to true for testing
EMAIL_MAX_PER_HOUR=100    # Rate limit per user
```

### Configuration File

The email service is configured in `backend/config/config.go`:

```go
Email: EmailConfig{
    SendGridAPIKey:   getEnv("SENDGRID_API_KEY", ""),
    FromEmail:        getEnv("EMAIL_FROM_ADDRESS", "noreply@clipper.gg"),
    FromName:         getEnv("EMAIL_FROM_NAME", "Clipper"),
    Enabled:          getEnv("EMAIL_ENABLED", "false") == "true",
    SandboxMode:      getEnv("EMAIL_SANDBOX_MODE", "false") == "true",
    MaxEmailsPerHour: getEnvInt("EMAIL_MAX_PER_HOUR", 10),
}
```

## Email Service Interface

### Basic Email Service Interface

The email service provides two main interfaces for sending emails:

#### 1. Notification Emails (Current Implementation)

Used for sending notification emails tied to user actions:

```go
err := emailService.SendNotificationEmail(
    ctx,
    user,
    models.NotificationTypeReply,
    notificationID,
    map[string]interface{}{
        "AuthorName":     "John Doe",
        "ClipTitle":      "Epic Gaming Moment",
        "ClipURL":        "https://clpr.tv/clips/123",
        "CommentPreview": "Great clip!",
    },
)
```

#### 2. Generic Email Interface (New)

For flexible, template-based email sending:

```go
req := services.EmailRequest{
    To:       []string{"user@example.com"},
    Subject:  "Welcome to Clipper!",
    Template: "welcome",  // Template ID (optional)
    Data: map[string]interface{}{
        "username": "gamer123",
        "message":  "Thanks for joining!",
    },
    Tags: []string{"onboarding", "welcome"},
}

err := emailService.SendEmail(ctx, req)
```

### Supported Notification Types

The service currently supports these notification types:
- `NotificationTypeReply` - Comment replies
- `NotificationTypeMention` - User mentions
- `NotificationTypePaymentFailed` - Payment failures
- `NotificationTypePaymentRetry` - Payment retry attempts
- `NotificationTypeGracePeriodWarning` - Subscription warnings
- `NotificationTypeSubscriptionDowngraded` - Downgrade notifications
- `NotificationTypeInvoiceFinalized` - Invoice notifications

### Email Templates

Each notification type has custom HTML and plain text templates. Templates include:
- Professional styling with gradients
- Responsive design for mobile devices
- Unsubscribe links (automatically generated)
- Call-to-action buttons
- Sender branding

Example template features:
```go
// HTML template with styling
html := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <h1 style="color: white;">New Reply on Clipper</h1>
    </div>
    <!-- Content -->
</body>
</html>
`
```

## Testing with Sandbox Mode

### Enable Sandbox Mode

Sandbox mode allows you to test email functionality without sending real emails. Emails are logged instead of sent.

```bash
EMAIL_ENABLED=true
EMAIL_SANDBOX_MODE=true
```

### Sandbox Mode Features

When sandbox mode is enabled:
1. ✅ Emails are logged with full details
2. ✅ Fake message IDs are generated (format: `sandbox-{uuid}`)
3. ✅ Rate limiting still applies
4. ✅ Database logs are still created
5. ❌ No actual emails are sent via SendGrid
6. ❌ No API calls to SendGrid

### Log Output Example

```json
{
  "timestamp": "2025-12-09T20:17:58Z",
  "level": "info",
  "message": "SANDBOX MODE: Email would be sent",
  "fields": {
    "to": "user@example.com",
    "subject": "Welcome to Clipper",
    "from_email": "noreply@clpr.tv",
    "from_name": "Clipper",
    "html_length": 1234,
    "text_length": 456
  }
}
```

### Testing Checklist

- [ ] Enable sandbox mode in development
- [ ] Trigger various notification types
- [ ] Verify logs show email details
- [ ] Test rate limiting functionality
- [ ] Test email preferences
- [ ] Test unsubscribe tokens
- [ ] Disable sandbox mode for staging tests
- [ ] Verify real emails are received

## Monitoring and Alerting

### Key Metrics to Track

1. **Email Send Success Rate**
   ```
   success_rate = successful_sends / total_sends * 100
   ```

2. **Email Delivery Rate** (from SendGrid dashboard)
   - Delivered
   - Bounced (hard/soft)
   - Spam reports
   - Unsubscribes

3. **SendGrid API Response Times**
   - Track latency for API calls
   - Alert on slow responses (> 5 seconds)

4. **Rate Limit Hits**
   - Users hitting per-hour limits
   - Consider increasing limits if legitimate

5. **Quota Usage**
   - Daily/monthly email volume
   - Alert at 80% and 90% of quota

### SendGrid Dashboard Monitoring

Access detailed metrics in SendGrid:
1. Navigate to **Stats > Dashboard**
2. View real-time delivery statistics
3. Monitor bounce and spam rates
4. Track engagement (opens, clicks)

### Alerts to Configure

**Critical Alerts**:
- SendGrid API key invalid or expired
- Bounce rate > 5%
- Spam complaint rate > 0.1%
- Quota usage > 90%

**Warning Alerts**:
- Send failure rate > 1%
- Average delivery time > 30 minutes
- Unsubscribe rate > 0.5%

### Logging

All email sends are logged with structured logging:

```go
logger.Info("Email sent successfully via SendGrid", map[string]interface{}{
    "to":         recipient,
    "subject":    subject,
    "message_id": messageID,
})
```

Database logs are maintained in the `email_notification_logs` table:
- Status (pending, sent, failed)
- Recipient email
- Subject
- Error messages (if failed)
- SendGrid message ID
- Timestamps

## Troubleshooting

### Common Issues

#### 1. Emails Not Sending

**Symptoms**: `EMAIL_ENABLED=true` but no emails being sent

**Checklist**:
- [ ] Verify `SENDGRID_API_KEY` is set correctly
- [ ] Check API key has **Mail Send** permission
- [ ] Confirm domain is verified in SendGrid
- [ ] Check sandbox mode is disabled: `EMAIL_SANDBOX_MODE=false`
- [ ] Review application logs for errors

#### 2. High Bounce Rate

**Symptoms**: Many emails bouncing

**Solutions**:
- Verify SPF/DKIM records are correct
- Use double opt-in for email addresses
- Regularly clean email list
- Check SendGrid reputation score

#### 3. Emails Going to Spam

**Symptoms**: Recipients not receiving emails (in spam folder)

**Solutions**:
- Complete domain authentication (SPF, DKIM)
- Add DMARC record
- Warm up IP address gradually
- Improve email content (avoid spam triggers)
- Monitor spam complaint rate

#### 4. Rate Limit Exceeded

**Symptoms**: `rate limit exceeded` errors

**Solutions**:
- Increase `EMAIL_MAX_PER_HOUR` if legitimate
- Implement email batching/queuing
- Use asynchronous email sending
- Consider user-specific rate limits

#### 5. SendGrid API Errors

**Common Error Codes**:
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: SendGrid issue (retry)

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
LOG_LEVEL=debug
GIN_MODE=debug
```

### Test Email Send

Test email configuration manually:

```bash
# Using curl to test SendGrid API directly
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header "Authorization: Bearer $SENDGRID_API_KEY" \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "noreply@clpr.tv"},
    "subject": "Test Email",
    "content": [{"type": "text/plain", "value": "Test message"}]
  }'
```

## Best Practices

### Security

1. **Never expose API keys** in code or logs
2. **Rotate API keys** every 90 days
3. **Use restricted permissions** for API keys
4. **Enable two-factor authentication** on SendGrid account
5. **Monitor API key usage** for anomalies

### Deliverability

1. **Authenticate your domain** (SPF, DKIM, DMARC)
2. **Warm up new IP addresses** gradually
3. **Maintain clean email lists** (remove bounces)
4. **Respect unsubscribe requests** immediately
5. **Monitor reputation scores** regularly

### Performance

1. **Use asynchronous sending** for non-critical emails
2. **Batch emails** when possible
3. **Implement retry logic** with exponential backoff
4. **Cache email templates** to reduce database queries
5. **Monitor API latency** and optimize

### Compliance

1. **Include unsubscribe links** in all marketing emails
2. **Honor opt-out requests** within 24 hours
3. **Follow CAN-SPAM Act** (U.S.)
4. **Follow GDPR** (EU) for data handling
5. **Maintain email preferences** per user

## Feature Flags

Control email features with feature flags:

```bash
FEATURE_EMAIL_NOTIFICATIONS=true
```

This allows gradual rollout and emergency shutoff if needed.

## Support

For additional support:
- SendGrid Documentation: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- Clipper Internal Documentation: See `docs/` directory

## Appendix

### SendGrid Rate Limits

**Free Tier**:
- 100 emails/day
- Limited to 6,000 emails/month

**Essentials Plan**:
- Up to 100,000 emails/month
- Rate: 5 requests/second

**Pro Plan**:
- Unlimited contacts
- Rate: 10 requests/second

### Email Size Limits

- Maximum email size: 30MB
- Recommended: < 100KB for best deliverability
- Use external hosting for large images

### Related Documentation

- [Notification System](./NOTIFICATION_SYSTEM_IMPLEMENTATION.md)
- [Subscriptions](./SUBSCRIPTIONS.md)
- [Security](./SECURITY.md)
- [Monitoring](./MONITORING.md)
