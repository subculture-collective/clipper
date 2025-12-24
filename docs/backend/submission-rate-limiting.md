---
title: "Clip Submission Rate Limiting & Moderation"
summary: "This document describes the rate limiting, abuse detection, and moderation system for clip submissio"
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Clip Submission Rate Limiting & Moderation

This document describes the rate limiting, abuse detection, and moderation system for clip submissions.

## Rate Limits

### User-Based Limits

All authenticated users are subject to the following rate limits for clip submissions:

- **5 submissions per hour** - Prevents spam while allowing legitimate users to submit multiple clips
- **20 submissions per day** - Daily cap to prevent abuse

These limits are enforced via the submission repository's `CountUserSubmissions` method and checked before any abuse detection.

### Minimum Requirements

- **100 karma points** - Users must have at least 100 karma to submit clips
- **Account not banned** - Banned users cannot submit clips

## Abuse Detection

The `SubmissionAbuseDetector` service monitors submission patterns and automatically throttles abusive behavior.

### Detection Rules

#### 1. Burst Detection

**Threshold:** 2 submissions within 1 minute  
**Cooldown:** 15 minutes  
**Severity:** Throttle

Detects users who are submitting clips too rapidly in a short time window. This prevents automated spam and script-based abuse.

#### 2. Velocity Detection

**Threshold:** 3 submissions within 5 minutes  
**Cooldown:** 30 minutes  
**Severity:** Throttle

Monitors sustained rapid submission rates over a slightly longer window. Users who exceed this threshold are temporarily blocked.

#### 3. IP Sharing Detection

**Threshold:** 5 different users from same IP within 1 hour  
**Cooldown:** N/A (warning only)  
**Severity:** Warning

Flags submissions when multiple users are submitting from the same IP address. This could indicate:
- Shared network (legitimate - cafes, schools, offices)
- Multiple accounts from same user (potentially abusive)
- VPN/proxy abuse

Submissions are **allowed** but flagged for moderator review.

#### 4. Duplicate Submission Tracking

**Threshold:** 3 duplicate attempts within 1 hour  
**Cooldown:** 1 hour  
**Severity:** Throttle

Tracks when users repeatedly attempt to submit the same clip (already exists in database or pending review). After 3 attempts, user is placed in cooldown.

### Cooldown System

When users trigger abuse detection rules, they are placed in a cooldown period:

- Cooldown periods are stored in Redis with automatic expiration
- Users in cooldown receive clear error messages with retry time
- Multiple violations can extend cooldown periods
- Cooldowns are tracked per user ID

## Moderation Events

The `ModerationEventService` creates a centralized queue for all submission-related moderation activities.

### Event Types

#### Submission Events

- `submission_received` - Normal submission created (info)
- `submission_approved` - Submission auto-approved (info)
- `submission_rejected` - Submission rejected by moderator (info)
- `submission_suspicious` - Submission flagged for review (warning)
- `submission_auto_rejected` - Submission automatically rejected (critical)
- `submission_duplicate` - Duplicate submission attempt detected (warning)

#### Abuse Events

- `abuse_detected` - General abuse pattern detected (warning)
- `rate_limit_exceeded` - User hit rate limit (warning)
- `velocity_violation` - Rapid submission detected (critical)
- `ip_share_suspicious` - Multiple users from same IP (warning)
- `user_cooldown_activated` - User placed in cooldown (critical)

### Event Severity Levels

- **info** - Normal operations, logged for audit trail
- **warning** - Suspicious but not blocking, requires attention
- **critical** - Active abuse, user blocked, immediate attention needed

### Event Queue

Events are stored in Redis lists for efficient queue operations:

- Main queue: `moderation:queue`
- Type-specific queues: `moderation:events:{type}`
- Individual events: `moderation:event:{id}`
- Event retention: 30 days

Critical events automatically trigger notifications to moderators.

## Admin API Endpoints

Moderators and admins have access to the following endpoints for monitoring and managing the moderation queue:

### Event Management

```
GET /api/v1/admin/moderation/events?limit=50
```
List pending moderation events (default limit: 50, max: 100)

```
GET /api/v1/admin/moderation/events/:type?limit=50
```
Filter events by specific type (e.g., `submission_suspicious`, `velocity_violation`)

```
POST /api/v1/admin/moderation/events/:id/review
```
Mark an event as reviewed by current moderator

```
POST /api/v1/admin/moderation/events/:id/process
Body: {"action": "approved"}
```
Process an event with a specific action

```
GET /api/v1/admin/moderation/stats
```
Get statistics about the moderation queue:
- Total queue length
- Pending events by severity (info, warning, critical)

### Abuse Stats

```
GET /api/v1/admin/moderation/abuse/:userId
```
Get abuse detection statistics for a specific user:
- Current cooldown status
- Burst submission count
- Velocity submission count
- Last violation details

## Integration with Submission Flow

### Pre-Submission Checks

When a user submits a clip, the following checks occur in order:

1. **Authentication** - Verify user is logged in
2. **Ban Check** - Ensure user is not banned
3. **Karma Check** - Verify user has >= 100 karma
4. **Abuse Detection** - Check burst, velocity, IP sharing patterns
5. **Rate Limiting** - Check hourly and daily limits
6. **Duplicate Detection** - Check if clip already exists or pending
7. **Twitch API** - Fetch clip metadata
8. **Quality Validation** - Verify clip age, duration, metadata

### Event Emission

Events are emitted at key points:

- **On abuse detection violation** - Emit abuse event with details
- **On rate limit hit** - Emit rate limit event
- **On duplicate attempt** - Emit duplicate event and track attempt
- **On successful submission** - Emit received or approved event

### Response to User

When abuse is detected:
```json
{
  "error": "You are submitting too quickly. Please slow down and try again in a few minutes.",
  "field": "rate_limit",
  "success": false
}
```

Users receive clear, actionable error messages with cooldown information when available.

## Monitoring and Logging

All abuse detection triggers are logged to application logs with structured data:

```
[ABUSE DETECTION] type=burst_detection user_id=... ip=... details=...
[MODERATION EVENT] id=... type=... severity=... user_id=... ip=... metadata=...
```

Logs include:
- Abuse type
- User ID
- IP address
- Detailed context
- Timestamp

## Best Practices for Moderators

1. **Monitor Critical Events** - Check queue regularly for critical severity events
2. **Review IP Sharing Warnings** - Investigate patterns of IP sharing
3. **Track Repeat Offenders** - Use abuse stats endpoint to identify problem users
4. **Process Events Promptly** - Mark events as reviewed to keep queue manageable
5. **Adjust Thresholds** - Work with developers to tune detection thresholds based on real-world patterns

## Future Enhancements

Potential improvements to the system:

- Machine learning-based abuse detection
- Geolocation tracking for IP-based patterns
- User reputation scoring
- Automated temporary bans for repeat offenders
- Integration with external abuse databases
- Real-time dashboard for moderation queue
- Webhook notifications for critical events
