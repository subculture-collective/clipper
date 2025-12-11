<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Broadcaster Live Status Sync - Testing Guide](#broadcaster-live-status-sync---testing-guide)
  - [Overview](#overview)
  - [Features Implemented](#features-implemented)
    - [1. Database Schema](#1-database-schema)
    - [2. Live Status Service Enhancements](#2-live-status-service-enhancements)
    - [3. Notification System](#3-notification-system)
    - [4. Scheduler Updates](#4-scheduler-updates)
  - [Manual Testing Steps](#manual-testing-steps)
    - [Prerequisites](#prerequisites)
    - [Test Scenarios](#test-scenarios)
    - [Database Queries for Verification](#database-queries-for-verification)
  - [API Endpoints to Test](#api-endpoints-to-test)
    - [Get Live Status](#get-live-status)
    - [Get Followed Live Broadcasters](#get-followed-live-broadcasters)
    - [List All Live Broadcasters](#list-all-live-broadcasters)
    - [Update Notification Preferences](#update-notification-preferences)
  - [Expected Metrics](#expected-metrics)
    - [Performance](#performance)
    - [Reliability](#reliability)
  - [Monitoring](#monitoring)
    - [Logs to Watch](#logs-to-watch)
    - [Potential Issues](#potential-issues)
  - [Rollback Plan](#rollback-plan)
  - [Notes](#notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Broadcaster Live Status Sync - Testing Guide"
summary: "This implementation adds automatic synchronization of broadcaster live status and notifications to f"
tags: ['backend', 'testing']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Broadcaster Live Status Sync - Testing Guide

## Overview
This implementation adds automatic synchronization of broadcaster live status and notifications to followers when broadcasters go live.

## Features Implemented

### 1. Database Schema
- `broadcaster_sync_status` table: Tracks current sync state for each broadcaster
- `broadcaster_sync_log` table: Logs all sync events and status changes
- Added `notify_broadcaster_live` column to `notification_preferences` table

### 2. Live Status Service Enhancements
- Tracks previous live status to detect status changes (offline → live, live → offline)
- Sends notifications to all followers when a broadcaster goes live
- Logs sync events to database for monitoring and debugging
- Handles Twitch API errors gracefully with logging

### 3. Notification System
- Added `NotificationTypeBroadcasterLive` notification type
- Users can control broadcaster live notifications via preferences
- Notifications include broadcaster name, stream title, game name, and direct link to stream

### 4. Scheduler Updates
- Changed sync interval from 60 seconds to 30 seconds
- Maintains existing batch processing (100 broadcasters per Twitch API request)

## Manual Testing Steps

### Prerequisites
1. Ensure database is running and migrations are applied:
   ```bash
   make migrate-up
   ```

2. Ensure Twitch API credentials are configured in `.env`:
   ```
   TWITCH_CLIENT_ID=your_client_id
   TWITCH_CLIENT_SECRET=your_client_secret
   ```

3. Start the backend server:
   ```bash
   make backend-dev
   ```

### Test Scenarios

#### Scenario 1: Broadcaster Goes Live
1. Follow a Twitch broadcaster using the API or UI
2. Wait for the broadcaster to go live on Twitch
3. Within 30 seconds, verify:
   - User receives an in-app notification
   - Notification contains correct broadcaster name and stream details
   - Database shows `broadcaster_sync_status.is_live = true`
   - Database has a sync log entry with `status_change = 'went_live'`

#### Scenario 2: No Duplicate Notifications
1. Follow a broadcaster who is already live
2. Wait for multiple sync cycles (1-2 minutes)
3. Verify:
   - Only one notification was received
   - Sync continues to update viewer count without creating new notifications

#### Scenario 3: Broadcaster Goes Offline
1. Follow a broadcaster who is currently live
2. Wait for broadcaster to end their stream
3. Within 30 seconds, verify:
   - Database shows `broadcaster_sync_status.is_live = false`
   - Database has a sync log entry with `status_change = 'went_offline'`
   - No notification is sent to followers (as expected)

#### Scenario 4: Notification Preferences
1. Disable broadcaster live notifications in user settings
2. Follow a broadcaster and wait for them to go live
3. Verify:
   - No notification is received
   - Sync status still updates correctly in database

#### Scenario 5: Multiple Followers
1. Create or use multiple test accounts
2. Have all accounts follow the same broadcaster
3. Wait for broadcaster to go live
4. Verify:
   - All followers receive notifications
   - Notification logs show one entry per follower

### Database Queries for Verification

Check sync status:
```sql
SELECT * FROM broadcaster_sync_status 
WHERE broadcaster_id = 'YOUR_BROADCASTER_ID';
```

Check sync logs:
```sql
SELECT * FROM broadcaster_sync_log 
WHERE broadcaster_id = 'YOUR_BROADCASTER_ID' 
ORDER BY sync_time DESC 
LIMIT 10;
```

Check notifications:
```sql
SELECT n.*, u.username 
FROM notifications n 
JOIN users u ON n.user_id = u.id 
WHERE n.type = 'broadcaster_live' 
ORDER BY n.created_at DESC 
LIMIT 10;
```

Check notification preferences:
```sql
SELECT user_id, notify_broadcaster_live 
FROM notification_preferences 
WHERE user_id = 'YOUR_USER_ID';
```

## API Endpoints to Test

### Get Live Status
```bash
GET /api/v1/broadcasters/{broadcaster_id}/live-status
```

### Get Followed Live Broadcasters
```bash
GET /api/v1/users/me/live-broadcasters
```

### List All Live Broadcasters
```bash
GET /api/v1/broadcasters/live
```

### Update Notification Preferences
```bash
PATCH /api/v1/users/me/notification-preferences
{
  "notify_broadcaster_live": true
}
```

## Expected Metrics

### Performance
- Sync should complete in < 1 second per 100 broadcasters
- No blocking of other API requests during sync
- Twitch API rate limits respected (800 requests/minute)

### Reliability
- Graceful handling of Twitch API errors
- No data loss if sync fails
- Automatic retry on next cycle

## Monitoring

### Logs to Watch
- "Starting scheduled live status update..."
- "Checking live status for X broadcasters"
- "Live status update completed in Xms"
- "Sent live notifications for broadcaster X to Y followers"
- "Failed to fetch streams for batch X/Y: error"

### Potential Issues
1. **No notifications sent**: Check notification service initialization in main.go
2. **Sync not running**: Verify Twitch client is initialized
3. **Rate limit errors**: Check Twitch API logs and reduce sync frequency if needed
4. **Missing followers**: Verify broadcaster_follows table has data

## Rollback Plan

If issues occur:
1. Stop the backend server
2. Rollback migrations:
   ```bash
   cd backend
   migrate -path migrations -database "YOUR_DB_URL" down 2
   ```
3. Revert code changes:
   ```bash
   git revert HEAD~2..HEAD
   ```

## Notes

- WebSocket real-time events are NOT implemented (no infrastructure exists)
- Email notifications are NOT enabled by default (can be added via notification preferences)
- Browser push notifications are NOT implemented
- The sync interval is configurable but set to 30 seconds as per requirements
