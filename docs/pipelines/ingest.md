---
title: "Data Ingestion"
summary: "How Clipper ingests Twitch clips into the platform."
tags: ["pipelines", "ingestion", "twitch"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["ingestion", "data pipeline"]
---

# Pipelines: Data Ingestion

How Clipper ingests Twitch clips into the platform.

## Overview

Clips are added to Clipper via:
1. User submission (manual)
2. Scheduled background jobs (automated discovery)
3. Webhook events from Twitch (future)

## User Submission Flow

```text
User → POST /api/v1/clips → Validate Twitch clip ID → Fetch metadata from Twitch API
→ Save to PostgreSQL → Index in OpenSearch → Generate embedding (async) → Done
```

See [[../backend/api|API Reference]].

## Twitch API Integration

Uses Twitch Helix API:
- Endpoint: `GET https://api.twitch.tv/helix/clips?id={clip_id}`
- Auth: App access token (client credentials)
- Rate limit: 800 requests/minute

Fetched metadata:
- title, broadcaster_id, broadcaster_name
- game_id, game_name
- view_count, duration
- created_at, thumbnail_url, video_url

## Validation

Before saving:
- Clip must exist on Twitch
- Not already in database (check by ID)
- Broadcaster not on blocklist
- Content passes moderation filters

## Background Discovery (Future)

Planned features:
- Periodic fetch of trending clips from Twitch API
- Track popular streamers/games
- Community-driven suggestion queue

## Error Handling

- Clip not found → 404 to user
- Twitch API down → retry with exponential backoff
- Rate limit hit → queue for later processing

---

Related: [[clipping|Clipping]] · [[analysis|Analytics]] · [[../backend/database|Database]]

[[../index|← Back to Index]]
