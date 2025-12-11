---
title: "Setup & Configuration"
summary: "Getting started with Clipper development and configuration."
tags: ["setup", "hub", "index"]
area: "setup"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
aliases: ["setup hub", "configuration"]
---

# Setup & Configuration

This section covers everything you need to get Clipper running locally and configured properly.

## Quick Links

- [[development|Development Setup]] - Get started with local development
- [[environment|Environment Variables]] - Configuration reference
- [[troubleshooting|Troubleshooting]] - Common issues and fixes

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/setup"
WHERE file.name != "index"
SORT title ASC
```

## Getting Started

1. Start with [[development|Development Setup]] for prerequisites and quick start
2. Configure your environment using [[environment|Environment Variables]]
3. If you run into issues, check [[troubleshooting|Troubleshooting]]

## Environment Configuration by Service

For complete environment variable documentation, see [[environment|Environment Variables Reference]].

### Backend Environment
- Database connection (PostgreSQL)
- Redis cache configuration
- OpenSearch/vector search  
- Twitch API credentials
- JWT secrets
- CORS and security settings

### Frontend Environment
- API endpoint URLs
- Twitch OAuth client ID
- Feature flags
- Analytics configuration

### Mobile Environment
- API endpoints
- OAuth configuration
- App-specific settings

---

**See also:** [[../index|Documentation Home]] · [[../backend/architecture|Backend Architecture]]
