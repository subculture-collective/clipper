<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Pipelines: Analytics](#pipelines-analytics)
  - [Overview](#overview)
  - [Data Collection](#data-collection)
  - [Storage](#storage)
  - [Privacy](#privacy)
  - [Metrics](#metrics)
  - [Reporting](#reporting)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Analytics Pipeline"
summary: "User behavior tracking and analytics for Clipper."
tags: ["pipelines", "analytics", "metrics"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["analytics", "tracking", "metrics"]
---

# Pipelines: Analytics

User behavior tracking and analytics for Clipper.

## Overview

Analytics track:
- Clip views, votes, comments
- Search queries and result clicks
- User engagement patterns
- Premium conversion funnel

## Data Collection

Events tracked:
- `clip.view` - User views a clip
- `clip.vote` - Upvote/downvote
- `clip.comment` - Comment posted
- `search.query` - Search performed
- `search.click` - Result clicked
- `premium.checkout` - Checkout initiated
- `premium.subscribe` - Subscription created

## Storage

- PostgreSQL: Structured events with user_id, clip_id, timestamps
- Future: ClickHouse or similar for OLAP queries

## Privacy

- No PII collected beyond user_id (linked to account)
- IP addresses not stored
- Anonymized aggregates for public stats
- Users can request data export/deletion

## Metrics

Key metrics:
- DAU/MAU (daily/monthly active users)
- Clip engagement rate (views → votes → comments)
- Search CTR (click-through rate)
- Premium conversion rate

## Reporting

- Admin dashboard (future)
- Export to CSV/JSON
- Integration with analytics platforms (Posthog, Mixpanel)

---

Related: [[ingest|Ingestion]] · [[clipping|Clipping]] · [[../operations/monitoring|Monitoring]]

[[../index|← Back to Index]]
