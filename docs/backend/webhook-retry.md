<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Webhook Retry and Dead-Letter Queue System](#webhook-retry-and-dead-letter-queue-system)
  - [Overview](#overview)
  - [Architecture](#architecture)
  - [Retry Strategy](#retry-strategy)
    - [Exponential Backoff](#exponential-backoff)
    - [Configuration](#configuration)
  - [Database Schema](#database-schema)
    - [webhook_retry_queue](#webhook_retry_queue)
    - [webhook_dead_letter_queue](#webhook_dead_letter_queue)
  - [Event Types Handled](#event-types-handled)
  - [Monitoring and Observability](#monitoring-and-observability)
    - [Structured Logging](#structured-logging)
    - [Monitoring Endpoint](#monitoring-endpoint)
    - [Metrics (TODO)](#metrics-todo)
  - [Operations](#operations)
    - [Processing Pending Retries](#processing-pending-retries)
    - [Investigating DLQ Items](#investigating-dlq-items)
    - [Manually Retrying DLQ Items](#manually-retrying-dlq-items)
  - [Error Handling](#error-handling)
    - [Transient Errors](#transient-errors)
    - [Permanent Errors](#permanent-errors)
  - [Security Considerations](#security-considerations)
  - [Best Practices](#best-practices)
  - [Troubleshooting](#troubleshooting)
    - [High Retry Queue Size](#high-retry-queue-size)
    - [Events in DLQ](#events-in-dlq)
    - [Missing Events](#missing-events)
  - [Future Enhancements](#future-enhancements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Webhook Retry and Dead-Letter Queue System"
summary: "This document describes the webhook retry and dead-letter queue (DLQ) system for Stripe subscription"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Webhook Retry and Dead-Letter Queue System

This document describes the webhook retry and dead-letter queue (DLQ) system for Stripe subscription webhooks.

## Overview

The webhook system includes:

- **Signature Verification**: All webhook events are verified using Stripe's signature verification
- **Idempotent Processing**: Duplicate events are automatically detected and skipped
- **Automatic Retries**: Failed webhook processing is automatically retried with exponential backoff
- **Dead-Letter Queue**: Permanently failed events are moved to a DLQ for manual investigation
- **Comprehensive Logging**: All webhook events are logged with structured logging for observability

## Architecture

```
Stripe Webhook → Signature Verification → Idempotency Check
                                                ↓
                                         Process Event
                                                ↓
                                    ┌──────── Success ────────┐
                                    │                          │
                                    ↓                          ↓
                               Log Success              Remove from Queue
                                    
                                    
                                    ┌──────── Failure ────────┐
                                    │                          │
                                    ↓                          ↓
                            Add to Retry Queue         Exponential Backoff
                                    │                          │
                                    ↓                          ↓
                            Retry Count < Max?  ────No────> Move to DLQ
                                    │
                                    Yes
                                    │
                                    ↓
                            Schedule Next Retry
```

## Retry Strategy

### Exponential Backoff

The system uses exponential backoff for retries:

| Retry Attempt | Delay Formula | Actual Delay |
|---------------|---------------|--------------|
| 1             | 30s × 2^0     | 30 seconds   |
| 2             | 30s × 2^1     | 1 minute     |
| 3             | 30s × 2^2     | 2 minutes    |

**Note:** The table above reflects the default configuration of 3 retry attempts after initial failure (4 total attempts including the initial webhook call). The retry count is configurable via the `max_retries` setting. If configured for more retries, the delay continues to increase exponentially and is capped at the maximum delay (1 hour).

### Configuration

- **Max Retries**: 3 retries after initial failure (4 total attempts by default)
- **Base Delay**: 30 seconds
- **Max Delay**: 1 hour (capped)

## Database Schema

### webhook_retry_queue

Stores webhook events pending retry:

```sql
CREATE TABLE webhook_retry_queue (
    id UUID PRIMARY KEY,
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### webhook_dead_letter_queue

Stores permanently failed webhook events:

```sql
CREATE TABLE webhook_dead_letter_queue (
    id UUID PRIMARY KEY,
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    retry_count INT NOT NULL,
    error TEXT NOT NULL,
    original_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Event Types Handled

The system processes the following Stripe webhook events:

1. **customer.subscription.created**
   - Creates or updates subscription record
   - Sets user tier and status
   - Records trial period if applicable

2. **customer.subscription.updated**
   - Updates subscription status and tier
   - Handles plan changes
   - Updates billing period

3. **customer.subscription.deleted**
   - Marks subscription as canceled
   - Downgrades user to free tier
   - Records cancellation timestamp

4. **invoice.paid**
   - Logs successful payment
   - Updates subscription status if needed

5. **invoice.payment_failed**
   - Marks subscription as past_due
   - Logs payment failure for follow-up

## Monitoring and Observability

### Structured Logging

All webhook events are logged with structured format:

```log
[WEBHOOK] Received event: evt_1234 (type: customer.subscription.created)
[WEBHOOK] Processing subscription.created for customer: cus_1234, subscription: sub_1234
[WEBHOOK] Successfully created subscription for user <uuid> (tier: pro, status: active)
[WEBHOOK] Successfully processed event: evt_1234
```

Retry processing logs:

```log
[WEBHOOK_RETRY] Processing pending retries (batch size: 10)
[WEBHOOK_RETRY] Found 2 pending retries
[WEBHOOK_RETRY] Processing retry 2/3 for event evt_1234 (type: customer.subscription.created)
[WEBHOOK_RETRY] Successfully processed event evt_1234, removing from queue
```

### Monitoring Endpoint

Check webhook retry queue status:

```bash
GET /health/webhooks
```

Response:

```json
{
  "status": "healthy",
  "webhooks": {
    "pending_retries": 2,
    "dlq_items": 0,
    "timestamp": "2024-11-08T00:00:00Z"
  }
}
```

### Metrics (TODO)

Planned metrics for monitoring:

- `webhook_events_received_total` - Counter of webhook events received by type
- `webhook_events_processed_total` - Counter of successfully processed events
- `webhook_events_failed_total` - Counter of failed events
- `webhook_retry_queue_size` - Gauge of pending retries
- `webhook_dlq_size` - Gauge of items in dead-letter queue
- `webhook_processing_duration_seconds` - Histogram of processing time

## Operations

### Processing Pending Retries

The webhook retry processor should be run periodically (e.g., via cron or scheduler):

```go
// Example: Process retries every minute
webhookRetryService.ProcessPendingRetries(ctx, 100) // Process up to 100 retries
```

### Investigating DLQ Items

Query the dead-letter queue to investigate permanently failed events:

```sql
SELECT 
    stripe_event_id,
    event_type,
    error,
    retry_count,
    original_timestamp,
    created_at
FROM webhook_dead_letter_queue
ORDER BY created_at DESC
LIMIT 10;
```

### Manually Retrying DLQ Items

To manually retry a DLQ item:

1. Retrieve the event from DLQ
2. Delete it from DLQ
3. Add it back to the retry queue with `AddToRetryQueue()`

```go
// Pseudo-code
dlqItem := webhookRepo.GetDeadLetterQueueItem(ctx, eventID)
webhookRepo.AddToRetryQueue(ctx, dlqItem.StripeEventID, dlqItem.EventType, dlqItem.Payload, 3)
// Delete from DLQ
webhookRepo.DeleteDeadLetterQueueItem(ctx, eventID)
```

## Error Handling

### Transient Errors

Transient errors (network issues, temporary database unavailability) are automatically retried:

- Database connection errors
- Temporary Stripe API issues
- Rate limiting

### Permanent Errors

Permanent errors are moved to DLQ immediately or after max retries:

- Invalid event payload (JSON unmarshal errors)
- Missing or invalid subscription data
- Business logic validation failures

## Security Considerations

1. **Signature Verification**: All webhooks must have valid Stripe signatures
2. **Idempotency**: Duplicate events are rejected to prevent double-processing
3. **Event Logging**: All events are logged for audit trail
4. **DLQ Monitoring**: Regular monitoring of DLQ prevents silent failures

## Best Practices

1. **Monitor DLQ**: Set up alerts when DLQ size exceeds threshold
2. **Review Logs**: Regularly review webhook logs for patterns
3. **Test Webhooks**: Use Stripe CLI to test webhook handling
4. **Backup Strategy**: Consider archiving old DLQ items periodically
5. **Performance**: Ensure retry processing doesn't overwhelm the system

## Troubleshooting

### High Retry Queue Size

Possible causes:

- Database issues preventing event processing
- Invalid webhook configuration
- Code bugs in event handlers

Solution: Check logs for errors, investigate most recent failures

### Events in DLQ

Possible causes:

- Invalid event data from Stripe
- Breaking changes in Stripe API
- Bugs in event processing logic

Solution: Review DLQ items, investigate error messages, fix code if needed

### Missing Events

Possible causes:

- Webhook endpoint not configured in Stripe
- Network issues between Stripe and server
- Events filtered out by idempotency check

Solution: Check Stripe webhook dashboard, verify endpoint configuration

## Future Enhancements

- [ ] Add metrics collection (Prometheus)
- [ ] Add alerting for DLQ threshold
- [ ] Add admin UI for DLQ management
- [ ] Add webhook event replay capability
- [ ] Add automatic DLQ cleanup for old events
- [ ] Add webhook event statistics dashboard
