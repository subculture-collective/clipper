---
title: "Tag Taxonomy"
summary: "Approved tag system and guidelines for categorizing documentation in the Obsidian vault"
tags: ["docs", "meta", "taxonomy", "tags"]
area: "docs"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-29
aliases: ["tagging guide", "tag system"]
---

# Tag Taxonomy

This document defines the approved tag taxonomy for the Clipper documentation vault. Consistent tagging enables powerful navigation, search, and content discovery via Dataview queries.

## Tag Principles

1. **Use lowercase**: All tags should be lowercase with hyphens for multi-word tags
2. **Be specific**: Choose the most specific applicable tags
3. **Limit quantity**: Use 2-6 tags per document
4. **Check existing**: Always check existing tags before creating new ones
5. **Update taxonomy**: If you create a new tag, add it to this document

## Core Tags

### Documentation Meta
Used for documentation about documentation:
- `docs` - General documentation
- `meta` - Documentation about the documentation system
- `hub` - Hub/index pages that aggregate other pages
- `index` - Index pages
- `guide` - How-to guides and tutorials
- `reference` - Reference documentation
- `tutorial` - Step-by-step tutorials
- `quickstart` - Quick start guides
- `faq` - Frequently asked questions
- `glossary` - Terminology definitions
- `changelog` - Version history
- `contributing` - Contributing guides

### Technology Stack

#### Backend
- `backend` - Backend-related documentation
- `go` - Go programming language
- `api` - API documentation
- `rest` - REST API
- `graphql` - GraphQL API
- `database` - Database documentation
- `postgresql` - PostgreSQL
- `redis` - Redis caching
- `opensearch` - OpenSearch/Elasticsearch
- `search` - Search functionality
- `semantic-search` - Semantic/vector search
- `vector-db` - Vector database
- `authentication` - Auth and identity
- `authorization` - Access control
- `rbac` - Role-based access control
- `webhooks` - Webhook integration
- `websockets` - WebSocket connections
- `email` - Email services
- `twitch` - Twitch API integration

#### Frontend
- `frontend` - Frontend documentation
- `react` - React framework
- `typescript` - TypeScript language
- `javascript` - JavaScript language
- `vite` - Vite build tool
- `tailwind` - TailwindCSS
- `css` - CSS styling
- `ui` - UI components
- `ux` - User experience
- `accessibility` - Accessibility (a11y)
- `responsive` - Responsive design
- `components` - UI components
- `state-management` - State management
- `routing` - Application routing

#### Mobile
- `mobile` - Mobile app documentation
- `react-native` - React Native framework
- `expo` - Expo platform
- `ios` - iOS platform
- `android` - Android platform
- `deep-linking` - Deep linking
- `oauth` - OAuth authentication
- `pkce` - PKCE flow
- `offline` - Offline functionality
- `caching` - Caching strategies
- `i18n` - Internationalization

### Features
- `features` - Feature documentation
- `comments` - Comment system
- `voting` - Voting/upvoting
- `favorites` - Favorites/bookmarks
- `playlists` - Playlist feature
- `search` - Search features
- `recommendations` - Recommendation engine
- `live-streams` - Live streaming
- `watch-parties` - Watch party feature
- `clips` - Clip management
- `submissions` - Content submission
- `moderation` - Content moderation
- `abuse-detection` - Abuse/spam detection
- `trust-system` - Trust scoring
- `reputation` - Reputation/karma system
- `analytics` - Analytics tracking
- `notifications` - Notification system
- `tagging` - Tag system

### Operations & Infrastructure
- `operations` - Operations documentation
- `ops` - Operations (short form)
- `deployment` - Deployment procedures
- `docker` - Docker containers
- `kubernetes` - Kubernetes orchestration
- `k8s` - Kubernetes (short form)
- `ci-cd` - CI/CD pipelines
- `github-actions` - GitHub Actions
- `monitoring` - Monitoring and alerting
- `observability` - Observability/tracing
- `logging` - Logging systems
- `metrics` - Metrics and KPIs
- `alerting` - Alert management
- `scaling` - Scaling strategies
- `performance` - Performance optimization
- `security` - Security practices
- `secrets` - Secrets management
- `backup` - Backup procedures
- `disaster-recovery` - DR procedures
- `runbook` - Operational runbooks
- `troubleshooting` - Troubleshooting guides
- `incident-response` - Incident handling
- `sre` - Site reliability engineering
- `slo` - Service level objectives
- `sli` - Service level indicators

### Testing
- `testing` - Testing documentation
- `unit-tests` - Unit testing
- `integration-tests` - Integration testing
- `e2e` - End-to-end testing
- `e2e-tests` - E2E tests
- `load-testing` - Load/performance testing
- `test-coverage` - Test coverage
- `test-strategy` - Testing strategy
- `fixtures` - Test fixtures
- `mocking` - Mocking/stubbing
- `playwright` - Playwright framework
- `jest` - Jest testing framework
- `vitest` - Vitest framework

### Product & Business
- `product` - Product documentation
- `roadmap` - Product roadmap
- `premium` - Premium features
- `monetization` - Monetization strategy
- `pricing` - Pricing information
- `stripe` - Stripe payment integration
- `billing` - Billing system
- `subscriptions` - Subscription management
- `trials` - Free trial system
- `discounts` - Discount codes
- `compliance` - Compliance documentation
- `legal` - Legal documentation
- `privacy` - Privacy policy
- `terms` - Terms of service
- `gdpr` - GDPR compliance
- `dmca` - DMCA procedures

### Architecture & Design
- `architecture` - Architecture documentation
- `system-design` - System design
- `design-patterns` - Design patterns
- `adr` - Architecture Decision Records
- `rfc` - Request for Comments
- `decisions` - Design decisions
- `data-model` - Data modeling
- `schema` - Database schema
- `migrations` - Database migrations
- `caching-strategy` - Caching patterns
- `scalability` - Scalability considerations

### Development
- `development` - Development documentation
- `setup` - Setup instructions
- `environment` - Environment configuration
- `dependencies` - Dependency management
- `build` - Build processes
- `configuration` - Configuration management
- `debugging` - Debugging guides
- `profiling` - Performance profiling
- `code-quality` - Code quality
- `linting` - Code linting
- `formatting` - Code formatting
- `version-control` - Git and version control

### Data & Analytics
- `data` - Data documentation
- `pipelines` - Data pipelines
- `etl` - ETL processes
- `ingestion` - Data ingestion
- `processing` - Data processing
- `analytics` - Data analytics
- `ml` - Machine learning
- `embeddings` - Vector embeddings
- `recommendations` - Recommendation systems
- `classification` - Classification models

### User-Facing
- `users` - User documentation
- `user-guide` - User guides
- `community` - Community guidelines
- `onboarding` - User onboarding
- `support` - User support

## Tag Combinations

### Effective Tag Patterns

**Hub Pages**:
```yaml
tags: ["backend", "hub", "index"]
```

**API Documentation**:
```yaml
tags: ["backend", "api", "rest", "reference"]
```

**Setup Guides**:
```yaml
tags: ["development", "setup", "guide"]
```

**Testing Documentation**:
```yaml
tags: ["testing", "e2e", "playwright", "guide"]
```

**Operations Runbooks**:
```yaml
tags: ["operations", "runbook", "kubernetes"]
```

**Architecture Decisions**:
```yaml
tags: ["architecture", "adr", "decisions"]
```

## Using Tags for Navigation

### Dataview Queries

**Find all API documentation**:
```dataview
TABLE title, summary, last_reviewed
FROM "docs"
WHERE contains(tags, "api")
SORT last_reviewed DESC
```

**Find outdated documentation (>90 days)**:
```dataview
TABLE title, area, last_reviewed
FROM "docs"
WHERE last_reviewed < date(today) - dur(90 days)
SORT last_reviewed ASC
```

**Find all draft documents**:
```dataview
TABLE title, area, owner, last_reviewed
FROM "docs"
WHERE status = "draft"
SORT last_reviewed DESC
```

**Find testing documentation**:
```dataview
LIST
FROM "docs"
WHERE contains(tags, "testing")
SORT title ASC
```

### Tag Search

In Obsidian, use tag search:
- Click any tag to see all documents with that tag
- Use tag pane (right sidebar) to browse tag hierarchy
- Use search syntax: `tag:#backend tag:#api`

## Adding New Tags

When adding a new tag:

1. **Check if it exists**: Search this document first
2. **Consider alternatives**: Can you use an existing tag?
3. **Follow naming convention**: lowercase, hyphenated
4. **Add to taxonomy**: Update this document with the new tag
5. **Document usage**: Add a brief description and category
6. **Submit PR**: Changes to taxonomy require review

## Tag Maintenance

### Periodic Review

Review tags quarterly to:
- Remove unused tags
- Merge similar tags
- Improve descriptions
- Identify missing categories

### Tag Wrangler Plugin

The `tag-wrangler` Obsidian plugin is enabled for:
- Renaming tags across all documents
- Merging duplicate tags
- Finding orphaned tags
- Bulk tag operations

## Examples

### Backend API Documentation
```yaml
tags: ["backend", "api", "rest", "endpoints", "reference"]
```

### Mobile Setup Guide
```yaml
tags: ["mobile", "setup", "react-native", "expo", "guide"]
```

### Operations Runbook
```yaml
tags: ["operations", "kubernetes", "runbook", "troubleshooting"]
```

### Testing Strategy
```yaml
tags: ["testing", "e2e", "test-strategy", "playwright"]
```

### Architecture Decision
```yaml
tags: ["architecture", "adr", "decisions", "semantic-search"]
```

## See Also

- [[templates/frontmatter-template|Frontmatter Template]] - Complete frontmatter specification
- [[../contributing|Contributing Guide]] - Documentation contribution workflow
- [[../index|Documentation Home]] - Main documentation index

## Related Issues

- Issue #803: Docs Structure & Canonical Pages
- Issue #846: Obsidian Frontmatter & Metadata

---

**Last Updated**: 2026-01-29  
**Maintained by**: Team Core
