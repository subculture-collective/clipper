<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Features](#features)
  - [Core Features](#core-features)
    - [Discovery & Browsing](#discovery--browsing)
    - [Search](#search)
    - [Community](#community)
    - [User Accounts](#user-accounts)
    - [Platform Support](#platform-support)
  - [Premium Features](#premium-features)
  - [Legend](#legend)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Features"
summary: "Complete list of Clipper platform features and capabilities."
tags: ["product", "features", "overview"]
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["feature list", "capabilities"]
---

# Features

Complete list of Clipper platform features and capabilities.

## Core Features

### Discovery & Browsing

| Feature | Status | Description |
|---------|--------|-------------|
| Smart Feed | ✅ | Algorithm-driven clip recommendations |
| Trending | ✅ | Popular clips across the platform |
| Categories | ✅ | Browse by game, streamer, or tags |
| Personalization | 🚧 | Tailored to user interests |

### Search

| Feature | Status | Description |
|---------|--------|-------------|
| Full-text Search | ✅ | BM25 keyword search via OpenSearch |
| Semantic Search | ✅ | Vector similarity with pgvector |
| Query Language | ✅ | Advanced filters (`game:`, `votes:>`, etc.) |
| Typo Tolerance | ✅ | Fuzzy matching for misspellings |
| Autocomplete | ✅ | Search suggestions |

See [[../backend/search|Search Platform]] and [[../backend/semantic-search|Semantic Search]].

### Community

| Feature | Status | Description |
|---------|--------|-------------|
| Voting | ✅ | Upvote/downvote clips and comments |
| Comments | ✅ | Markdown-supported discussions |
| Favorites | ✅ | Save and organize clips |
| Karma | ✅ | Reputation from contributions |
| Tags | ✅ | Community-driven categorization |

### User Accounts

| Feature | Status | Description |
|---------|--------|-------------|
| Twitch OAuth | ✅ | Seamless login with Twitch |
| User Profiles | ✅ | Public profiles with activity |
| Settings | ✅ | Preferences and notifications |
| Premium | ✅ | Pro subscription tier |

See [[../backend/authentication|Authentication]] and [[../premium/overview|Premium Overview]].

### Platform Support

| Platform | Status | Description |
|----------|--------|-------------|
| Web (Desktop) | ✅ | Full-featured React app |
| Web (Mobile) | ✅ | Responsive design |
| iOS App | ✅ | React Native via Expo |
| Android App | ✅ | React Native via Expo |
| API | ✅ | RESTful API for integrations |

See [[../frontend/architecture|Frontend]] and [[../mobile/architecture|Mobile]].

## Premium Features

| Feature | Free | Pro |
|---------|------|-----|
| Favorites | 50 | Unlimited |
| Collections | 3 | Unlimited |
| Submissions/day | 10 | 50 |
| Advanced Search | - | ✅ |
| Export Data | - | ✅ |
| Ad-free | - | ✅ |

See [[../premium/tiers|Pricing Tiers]] for full comparison.

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Implemented and stable |
| 🚧 | In development |
| 📋 | Planned |
| ❌ | Not planned |

---

**See also:** [[roadmap|Roadmap]] · [[../index|Documentation Home]]
