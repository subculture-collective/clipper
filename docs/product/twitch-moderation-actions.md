---
title: "Twitch Moderation Actions"
summary: "Ban and unban users on Twitch directly from Clipper with full permission control and audit logging."
tags: ["product", "moderation", "twitch", "features"]
area: "moderation"
status: "stable"
owner: "team-moderation"
version: "1.0"
last_reviewed: 2026-01-12
aliases: ["twitch-bans", "ban-management", "channel-moderation"]
---

# Twitch Moderation Actions

Streamline your channel moderation by managing Twitch bans and unbans directly from Clipper. This feature enables broadcasters and Twitch channel moderators to take quick action without switching platforms.

## Table of Contents

- [Overview](#overview)
- [Who Can Use This Feature](#who-can-use-this-feature)
- [Features](#features)
- [Getting Started](#getting-started)
- [How to Use](#how-to-use)
  - [Ban a User](#ban-a-user)
  - [Unban a User](#unban-a-user)
- [Ban Types](#ban-types)
- [Required Scopes](#required-scopes)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Audit and History](#audit-and-history)
- [FAQ](#faq)

## Overview

Twitch Moderation Actions bring powerful moderation tools directly into Clipper, allowing you to:

- **Ban users permanently** from your Twitch channel
- **Timeout users** for a specific duration (1 second to 14 days)
- **Unban users** to lift previous bans or timeouts
- **Track ban reasons** for accountability
- **View audit logs** of all moderation actions

All actions are performed using the official Twitch Helix API, ensuring seamless integration with your Twitch channel's existing ban list.

## Who Can Use This Feature

### Eligible Users

✅ **Broadcasters**: Channel owners can ban/unban users in their own channel  
✅ **Twitch Channel Moderators**: Users with moderator privileges on Twitch can take action  

### Restricted Users

❌ **Site Moderators**: Clipper site moderators can **view** moderation data but **cannot** perform Twitch ban actions (read-only access)  
❌ **Regular Users**: Standard users cannot access moderation tools  
❌ **Users without OAuth**: Must authenticate with Twitch and grant required permissions

## Features

### Permanent Bans

- Ban users indefinitely from your channel
- Requires a reason (recommended for record-keeping)
- Immediately effective on Twitch
- Can be reversed with unban action

### Temporary Timeouts

- Timeout users for 1 second up to 14 days (1,209,600 seconds)
- Automatically expires after duration
- Ideal for warnings or cooling-off periods
- Also reversible with unban action before expiration

### Ban Reasons

- Optional but recommended for context
- Maximum 500 characters
- Visible in audit logs
- Helps track moderation patterns

### Audit Logging

- Every ban/unban action is logged
- Includes: actor, target user, timestamp, reason, duration
- Accessible to admins and moderators
- Supports compliance and accountability

### Permission Enforcement

- Strict permission checks at API level
- OAuth scope validation before action
- Rate limiting to prevent abuse (10 actions per hour)
- Site moderators explicitly blocked from Twitch actions

## Getting Started

### Step 1: Connect Your Twitch Account

1. Navigate to **Settings** → **Connections**
2. Click **Connect Twitch Account**
3. Authorize Clipper with Twitch

### Step 2: Grant Required Scopes

When authorizing, you must grant one of these scopes:

- **For Broadcasters**: `channel:manage:banned_users`
- **For Moderators**: `moderator:manage:banned_users`

**Note**: If you previously connected your Twitch account before this feature was added, you'll need to **re-authenticate** to grant the new scopes.

### Step 3: Verify Permissions

1. Go to **Moderation** → **Users**
2. If ban/unban buttons are visible, you're all set!
3. If not, check:
   - Are you the broadcaster or a channel moderator on Twitch?
   - Did you grant the required OAuth scopes?
   - Is your Twitch connection active?

## How to Use

### Ban a User

#### From User Profile

1. Navigate to the user's profile page
2. Click **Ban on Twitch** button
3. In the ban modal:
   - Select **Permanent Ban** or **Timeout**
   - If timeout: enter duration in seconds (1-1209600)
   - Enter ban reason (optional but recommended)
4. Click **Confirm Ban**
5. Success message will appear
6. User is immediately banned on Twitch

#### From Moderation Dashboard

1. Go to **Moderation** → **Users**
2. Find the user in the list
3. Click **Actions** → **Ban on Twitch**
4. Follow same modal flow as above

### Unban a User

#### From User Profile

1. Navigate to the banned user's profile
2. Click **Unban on Twitch** button
3. Confirm the action in the modal
4. User is immediately unbanned on Twitch

#### From Ban List

1. Go to **Moderation** → **Bans**
2. Find the banned user
3. Click **Unban** button
4. Confirm action
5. User is unbanned

## Ban Types

### Permanent Ban

**When to use:**
- Severe policy violations
- Repeated offenses
- Harassment or hate speech
- Spam bots

**Characteristics:**
- No expiration
- Must be manually unbanned
- Visible in Twitch's ban list
- Logged in audit trail

**Example:**
```
Action: Permanent Ban
User: example_user
Reason: Repeated harassment of other users
```

### Timeout (Temporary Ban)

**When to use:**
- First-time offenses
- Cooling-off periods
- Minor policy violations
- Warning before permanent ban

**Characteristics:**
- Auto-expires after duration
- Can be manually unbanned early
- Duration: 1 second - 14 days
- Logged with duration in audit trail

**Example:**
```
Action: Timeout
User: example_user
Duration: 600 seconds (10 minutes)
Reason: Spam in chat
```

**Common Durations:**
- **1 minute**: 60 seconds
- **10 minutes**: 600 seconds
- **1 hour**: 3600 seconds
- **1 day**: 86400 seconds
- **1 week**: 604800 seconds
- **14 days (max)**: 1209600 seconds

## Required Scopes

### Broadcaster Scope

```
channel:manage:banned_users
```

**Grants permission to:**
- Ban users in your own channel
- Unban users in your own channel
- View ban list for your channel

### Moderator Scope

```
moderator:manage:banned_users
```

**Grants permission to:**
- Ban users in channels you moderate
- Unban users in channels you moderate
- View ban lists for channels you moderate

### How to Check Your Scopes

1. Go to **Settings** → **Connections** → **Twitch**
2. Click **View Permissions**
3. Look for one of the above scopes
4. If missing, click **Re-authenticate** to grant them

## Limitations

### Rate Limits

- **10 ban/unban actions per hour** per user
- Enforced at API level
- Resets every 60 minutes
- Prevents accidental bulk actions or abuse

**If you exceed the limit:**
- Error message: "Rate limit exceeded"
- Wait until the hour window resets
- Contact support if you need a higher limit

### Duration Limits

- **Minimum timeout**: 1 second
- **Maximum timeout**: 1,209,600 seconds (14 days)
- Twitch API enforces these limits
- Longer bans require permanent ban + manual unban

### Permission Requirements

- **Must be broadcaster or Twitch-recognized moderator**
- **Site moderator status is not sufficient**
- **OAuth connection must be active**
- **Required scopes must be granted**

### Scope Limitations

If you see this error: **"Insufficient OAuth scopes"**

1. Your Twitch token lacks the required scope
2. You need to re-authenticate
3. Make sure to grant `channel:manage:banned_users` or `moderator:manage:banned_users`

## Troubleshooting

### "Ban on Twitch" Button Not Visible

**Possible causes:**
1. **You're not a broadcaster or Twitch moderator**
   - Solution: Ask the channel owner to add you as a moderator on Twitch

2. **You're a site moderator only**
   - Solution: Site moderators cannot perform Twitch actions (by design)

3. **Twitch connection expired**
   - Solution: Go to Settings → Connections → Reconnect Twitch

4. **Missing OAuth scopes**
   - Solution: Re-authenticate and grant required scopes

### Error: "Insufficient OAuth Scopes"

**Solution:**
1. Go to **Settings** → **Connections** → **Twitch**
2. Click **Disconnect**
3. Click **Connect Twitch** again
4. When authorizing, ensure you grant `channel:manage:banned_users` (broadcaster) or `moderator:manage:banned_users` (moderator)
5. Complete authentication
6. Try ban action again

### Error: "Rate Limit Exceeded"

**Solution:**
- You've performed 10+ ban/unban actions in the past hour
- Wait for the rate limit window to reset (check error message for time)
- Plan batch moderation actions across time if needed

### Error: "Not Authenticated with Twitch"

**Solution:**
1. You don't have an active Twitch connection
2. Go to **Settings** → **Connections**
3. Click **Connect Twitch Account**
4. Complete OAuth flow
5. Try action again

### Ban Action Doesn't Work

**Troubleshooting steps:**
1. Refresh the page and try again
2. Check if you're still logged into Twitch
3. Verify the user exists and is not already banned
4. Check Twitch's ban list directly to confirm
5. Review audit logs for error details
6. Contact support with audit log ID if issue persists

## Audit and History

### Viewing Audit Logs

**For Admins and Moderators:**

1. Navigate to **Admin** → **Audit Logs**
2. Filter by action type:
   - `twitch_ban_user` - Ban actions
   - `twitch_unban_user` - Unban actions
3. Search by:
   - Actor (who performed the action)
   - Target user (who was banned/unbanned)
   - Date range
4. Click on any entry to view full details

### Audit Log Details

Each log entry includes:

- **Action ID**: Unique identifier
- **Timestamp**: When action was performed
- **Actor**: Who performed the action (username, ID)
- **Target User**: Who was banned/unbanned (username, Twitch ID)
- **Action Type**: Ban or unban
- **Broadcaster Channel**: Which channel (broadcaster ID)
- **Reason**: Ban reason (if provided)
- **Duration**: Timeout duration in seconds (if applicable)
- **Is Timeout**: Boolean indicating if timeout vs permanent

**Example Audit Log Entry:**
```json
{
  "id": "audit-1234567890",
  "timestamp": "2026-01-12T10:30:00Z",
  "actor_id": "user-broadcaster-123",
  "action": "twitch_ban_user",
  "resource_type": "twitch_ban",
  "resource_id": "ban-9876543210",
  "details": {
    "broadcaster_id": "12345",
    "user_id": "67890",
    "reason": "Repeated spam in chat",
    "duration": 600,
    "is_timeout": true
  }
}
```

### Export Audit Logs

Admins can export audit logs for:
- Compliance requirements
- Moderation pattern analysis
- Channel safety reports

1. Go to **Admin** → **Audit Logs**
2. Apply desired filters
3. Click **Export CSV** or **Export JSON**
4. Download file with filtered logs

## FAQ

### Q: Can I ban someone on Twitch and Clipper separately?

**A:** Yes, these are independent systems:
- **Twitch Ban**: Performed via this feature, affects Twitch chat/streams
- **Clipper Ban**: Performed via Clipper moderation tools, affects Clipper site access

They can be used together or separately based on violation severity.

---

### Q: Do site moderators have any limitations?

**A:** Yes, by design:
- ✅ Can view moderation dashboards
- ✅ Can access audit logs
- ✅ Can manage Clipper-level bans
- ❌ **Cannot** ban/unban users on Twitch
- ❌ **Cannot** perform Twitch moderation actions

This is intentional: Twitch moderation is limited to broadcasters and Twitch channel moderators only.

---

### Q: What happens if I timeout someone for 1 day but unban them after 1 hour?

**A:** The unban action immediately lifts the timeout, regardless of original duration. The user can access the channel again instantly.

---

### Q: Can I see who banned a user?

**A:** Yes, audit logs track the actor for every action. Admins and moderators can view this information in the audit log interface.

---

### Q: What if I accidentally ban the wrong person?

**A:** Simply use the **Unban** action immediately. The user will regain access. Consider adding a note in the audit log about the mistake for transparency.

---

### Q: How do I know if a ban was successful?

**A:** You'll see:
1. Success message in Clipper UI
2. User's ban status updates in real-time
3. Entry added to audit logs
4. Ban visible in Twitch's native ban list

---

### Q: Can I bulk ban multiple users at once?

**A:** Not currently. Each ban requires individual action to prevent accidents. This also helps respect the rate limit (10/hour).

---

### Q: Does this work with Twitch's automod?

**A:** These are separate systems:
- **Twitch AutoMod**: Automatic filtering (handled by Twitch)
- **This feature**: Manual moderation actions by humans

Both can coexist and complement each other.

---

### Q: What data is stored when I ban someone?

**A:** Clipper stores:
- Actor ID (who performed ban)
- Target user ID
- Broadcaster channel ID
- Ban reason
- Duration (if timeout)
- Timestamp
- Action type

**Twitch stores** its own copy of the ban on their platform. This feature only triggers the action via Twitch API.

---

### Q: Can I schedule bans for the future?

**A:** Not currently. Bans are immediate upon confirmation. Use timeouts with specific durations if you want auto-expiring bans.

---

## Related Documentation

- [Twitch OAuth Setup](../../TWITCH_OAUTH_BAN_SCOPES_IMPLEMENTATION.md)
- [API Reference: Twitch Moderation](../backend/api.md#twitch-moderation)
- [Rollout Plan](../operations/twitch-moderation-rollout-plan.md)
- [Feature Flags](../operations/feature-flags.md#feature_twitch_moderation)
- [Moderation Guidelines](../users/community-guidelines.md#moderation)

## Support

Need help with Twitch moderation actions?

- **Email**: support@clipper.app
- **Discord**: #moderation-help channel
- **Documentation**: You're reading it! 📖
- **Report a Bug**: [GitHub Issues](https://github.com/subculture-collective/clipper/issues)

---

**Last Updated**: 2026-01-12  
**Version**: 1.0  
**Status**: ✅ Available for all broadcasters and Twitch channel moderators
