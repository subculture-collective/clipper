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
