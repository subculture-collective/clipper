---
title: "Glossary"
summary: "Technical terms, acronyms, and Clipper-specific concepts."
tags: ["docs", "glossary", "reference"]
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["terms", "definitions"]
---

# Glossary

Quick reference for technical terms, acronyms, and Clipper-specific concepts.

## A

**ADR** (Architecture Decision Record)  
Document recording important architectural decisions. See [[decisions/adr-001-mobile-framework|ADRs]].

**API** (Application Programming Interface)  
RESTful HTTP API for accessing Clipper services. See [[backend/api|API Reference]].

**Analytics Pipeline**  
System for tracking and analyzing user behavior. See [[pipelines/analysis|Analytics]].

## B

**BM25**  
Ranking function for text search, used in OpenSearch. See [[backend/search|Search Platform]].

**Broadcaster**  
Twitch streamer who creates content that gets clipped.

## C

**Clip**  
Short video highlight from a Twitch stream, typically 15-60 seconds.

**Clip Score**  
Combined metric of votes, comments, and views used for ranking.

**CI/CD** (Continuous Integration/Continuous Deployment)  
Automated build, test, and deployment pipeline. See [[operations/cicd|CI/CD]].

## D

**Dunning**  
Payment recovery process for failed subscription payments. See [[premium/stripe|Stripe Integration]].

## E

**Embedding**  
Vector representation of text for semantic search. See [[backend/semantic-search|Semantic Search]].

**Entitlement**  
Feature access granted based on subscription tier. See [[premium/entitlements|Entitlements]].

**Expo**  
Framework for building React Native apps. See [[mobile/architecture|Mobile Architecture]].

## F

**Feature Flag**  
Toggle for enabling/disabling features in production. See [[operations/feature-flags|Feature Flags]].

**Fuzzy Search**  
Search that handles typos and misspellings.

## G

**Gin**  
Go web framework used for backend API.

## H

**Hot Score**  
Reddit-style ranking algorithm based on votes and time. See [[backend/database|Database]].

**Hybrid Search**  
Combination of BM25 keyword search and vector semantic search.

## J

**JWT** (JSON Web Token)  
Token format for authentication. See [[backend/authentication|Authentication]].

## K

**Karma**  
Reputation score earned through community contributions. See [[users/faq|FAQ]].

## M

**Migration**  
Database schema change managed via version control. See [[operations/migration|Migrations]].

**Moderator**  
User with elevated permissions for content moderation.

## O

**OAuth**  
Authentication protocol used for Twitch login. See [[backend/authentication|Authentication]].

**OpenSearch**  
Search engine for full-text search. See [[backend/search|Search Platform]].

## P

**pgvector**  
PostgreSQL extension for vector similarity search.

**PITR** (Point-in-Time Recovery)  
Database backup strategy. See [[backend/database|Database]].

**Premium Tier**  
Paid subscription level with enhanced features. See [[premium/tiers|Pricing Tiers]].

## Q

**Query Language**  
Human-readable syntax for advanced search. See [[decisions/adr-003-advanced-query-language|ADR 003]].

## R

**RBAC** (Role-Based Access Control)  
Permission system based on user roles. See [[backend/rbac|RBAC]].

**Redis**  
In-memory cache for session storage and performance.

**RPO** (Recovery Point Objective)  
Maximum acceptable data loss duration. See [[operations/infra|Infrastructure]].

**RTO** (Recovery Time Objective)  
Maximum acceptable downtime. See [[operations/infra|Infrastructure]].

## S

**Semantic Search**  
Search based on meaning rather than keywords. See [[backend/semantic-search|Semantic Search]].

**SLO** (Service Level Objective)  
Target for service performance metrics. See [[operations/monitoring|Monitoring]].

**Stripe**  
Payment processing service for subscriptions. See [[premium/stripe|Stripe Integration]].

## T

**TanStack Query**  
Data fetching library for React (formerly React Query).

**Trigger**  
Database function that runs automatically on table changes.

**Twitch API**  
External API for fetching clip metadata. See [[pipelines/ingest|Data Ingestion]].

## V

**Vector Search**  
Similarity search using embeddings. See [[backend/semantic-search|Semantic Search]].

**Vote Score**  
Net upvotes minus downvotes for a clip or comment.

## W

**Wikilink**  
Obsidian-style link format: `[[page-name]]`.

---

[[index|← Back to Index]]
