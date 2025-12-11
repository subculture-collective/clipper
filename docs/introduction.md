<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Introduction to Clipper](#introduction-to-clipper)
  - [What is Clipper?](#what-is-clipper)
  - [Key Features](#key-features)
    - [🎮 Discovery & Browsing](#-discovery--browsing)
    - [🔍 Advanced Search](#-advanced-search)
    - [⬆️ Community Curation](#-community-curation)
    - [🔐 Authentication & Security](#-authentication--security)
    - [📱 Multi-Platform](#-multi-platform)
    - [💎 Premium Features](#-premium-features)
  - [Architecture Overview](#architecture-overview)
    - [Tech Stack](#tech-stack)
  - [Core Concepts](#core-concepts)
    - [Clips](#clips)
    - [Users](#users)
    - [Karma System](#karma-system)
    - [Search Index](#search-index)
    - [Premium Entitlements](#premium-entitlements)
  - [Development Workflow](#development-workflow)
  - [Getting Help](#getting-help)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Introduction to Clipper"
summary: "Project overview, key features, architecture, and core concepts of the Clipper platform."
tags: ["docs", "overview", "introduction"]
area: "docs"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["intro", "about clipper"]
---

# Introduction to Clipper

## What is Clipper?

Clipper is a modern, community-driven platform for discovering, curating, and sharing the best Twitch clips. It combines powerful search capabilities, community voting, and social features to help users find and organize memorable gaming moments.

## Key Features

### 🎮 Discovery & Browsing
- **Smart Feed**: Algorithm-driven recommendations
- **Trending**: Popular clips across the platform
- **Categories**: Browse by game, streamer, or tags
- **Personalization**: Tailored to your interests

### 🔍 Advanced Search
- **Hybrid Search**: BM25 + semantic vector search
- **Query Language**: Human-readable syntax for complex queries
- **Filters**: Date, views, game, streamer, and more
- **Typo Tolerance**: Find clips even with misspellings

See [[backend/search|Search Platform]] and [[backend/semantic-search|Semantic Search]].

### ⬆️ Community Curation
- **Voting**: Upvote/downvote to surface best content
- **Karma**: Build reputation through contributions
- **Comments**: Markdown-supported discussions
- **Favorites**: Save and organize clips
- **Tags**: Community-driven categorization

### 🔐 Authentication & Security
- **Twitch OAuth**: Seamless login
- **JWT Tokens**: Secure session management
- **RBAC**: Role-based access control
- **Rate Limiting**: Abuse protection

See [[backend/rbac|RBAC Documentation]].

### 📱 Multi-Platform
- **Responsive Web**: Desktop and mobile browsers
- **Native Apps**: iOS and Android via React Native
- **API Access**: RESTful API for integrations

See [[mobile/architecture|Mobile Architecture]] and [[backend/api|API Reference]].

### 💎 Premium Features
- Unlimited favorites and collections
- Advanced search filters
- Cross-device sync  
- Data export
- Ad-free experience
- Priority support

See [[premium/overview|Premium Overview]].

## Architecture Overview

### Tech Stack

**Frontend (Web)**:
- React 19 + TypeScript
- Vite build tooling
- TailwindCSS
- React Router
- TanStack Query

**Mobile (iOS/Android)**:
- React Native 0.76
- Expo 52
- Expo Router
- Shared TypeScript types

**Backend**:
- Go 1.24+ with Gin
- PostgreSQL 17
- Redis 8
- OpenSearch 2.11
- JWT auth
- Twitch API

**Infrastructure**:
- Docker & Docker Compose
- GitHub Actions CI/CD
- Kubernetes (production)

See [[backend/architecture|Backend Architecture]].

## Core Concepts

### Clips
Twitch clips with metadata, engagement metrics, tags, and analytics.

### Users
Authenticated users can vote, submit clips, comment, favorite, and build karma.

### Karma System
Users earn karma through quality contributions. See [[users/faq|FAQ]].

### Search Index
Hybrid BM25 text search + vector semantic search with filters.

### Premium Entitlements
Feature access controlled via Free/Pro tiers. See [[premium/entitlements|Entitlements]].

## Development Workflow

1. Clone repository
2. Set up environment (see [[setup/environment|Environment Setup]])
3. Start Docker services
4. Run migrations
5. Start dev servers

See [[setup/development|Development Setup]].

## Getting Help

- **Users**: [[users/faq|FAQ]] or [[users/user-guide|User Guide]]
- **Developers**: [[setup/troubleshooting|Troubleshooting]]
- **Contributors**: [[contributing|Contributing Guide]]

---

[[index|← Back to Index]]
