---
title: "Archived Documentation"
summary: "Historical documentation, completed implementation summaries, and deprecated content."
tags: ["archive", "hub", "index", "legacy"]
area: "docs"
status: "archived"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-29
aliases: ["archive hub", "historical docs"]
---

# Archived Documentation

This directory contains historical documentation, completed implementation summaries, and deprecated content that is no longer actively maintained but preserved for reference.

## What's Archived Here

### Implementation Summaries

Completed implementation summaries from past features and epics:

```dataview
TABLE title, summary, last_reviewed
FROM "docs/archive"
WHERE contains(file.name, "IMPLEMENTATION") OR contains(file.name, "SUMMARY")
SORT last_reviewed DESC
LIMIT 20
```

### Deprecated Features

- Historical feature documentation that has been replaced or removed
- Old architectural approaches that were superseded
- Deprecated APIs and endpoints

### Completed Epics

- Epic completion reports and verification checklists
- Launch readiness documentation for completed features
- Post-mortem analyses and lessons learned

## Archive Policy

Documents are archived when:

1. **Implementation is Complete**: Feature is fully implemented and stable
2. **Content is Superseded**: Information has been consolidated into canonical pages
3. **Feature is Deprecated**: Functionality has been removed or replaced
4. **Historical Reference**: Content is kept for audit or historical purposes

## Accessing Archived Content

To reference archived content, use relative links:

```markdown
See [[archive/FEATURE_NAME_IMPLEMENTATION|archived implementation details]].
```

## Recent Archives

Recent additions to the archive (2026-01):

- Implementation summaries moved from root `/docs/` folder
- Completed epic summaries (E2E testing, premium checkout, moderation UI)
- Old roadmap versions (Roadmap 4.0, Roadmap 5.0 issue creation summary)
- Feature-specific implementation docs (Twitch moderation, toxicity detection)

## Finding Current Documentation

If you're looking for active documentation:

- **Getting Started**: [[../setup/development|Development Setup]]
- **API Documentation**: [[../backend/api|API Reference]]
- **Features**: [[../features/index|Features Index]]
- **Operations**: [[../operations/runbook|Operations Runbook]]
- **Architecture**: [[../decisions/index|Architecture Decisions]]

---

**See also:**
[[../index|Documentation Home]] ·
[[../changelog|Changelog]] ·
[[../product/roadmap|Current Roadmap]]
