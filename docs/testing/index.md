---
title: "Testing Documentation"
summary: "Testing guides, strategies, and procedures for quality assurance."
tags: ["testing", "hub", "index", "qa"]
area: "testing"
status: "stable"
owner: "team-qa"
version: "1.0"
last_reviewed: 2025-12-24
aliases: ["testing hub", "qa"]
---

# Testing Documentation

Comprehensive testing guides and procedures for ensuring quality across the platform.

## Testing Guides

- [[TESTING|Testing Strategy]] - Comprehensive testing strategy for Roadmap 5.0
- [[testing-guide|Testing Guide]] - General testing best practices
- [[integration-e2e-guide|Integration & E2E Testing]] - End-to-end testing procedures
- [[STRIPE_SUBSCRIPTION_TESTING|Stripe Subscription Testing]] - Testing subscription flows
- [[stripe-subscription-testing-checklist|Stripe Testing Checklist]] - QA checklist for Stripe
- [[stripe-ci-secrets|Stripe CI/CD Secrets Configuration]] - Setting up Stripe test keys in CI
- [[STRIPE_WEBHOOK_TESTING|Stripe Webhook Testing]] - Testing webhook integration
- [[CDN_FAILOVER_TESTING|CDN Failover Testing]] - CDN failover test procedures
- [[ENABLING_PREMIUM_SUBSCRIPTION_TESTS|Enabling Premium Tests]] - Premium subscription test setup
- [[self-qa-flow-checklist|Self-QA Flow Checklist]] - Developer QA checklist

## E2E Test Infrastructure

- [[E2E_CONFIGURATION|E2E Configuration]] - End-to-end test configuration
- [[E2E_TEST_FIXTURES_GUIDE|E2E Test Fixtures Guide]] - Test data and fixtures
- [[E2E_TEST_INFRASTRUCTURE_CHECKLIST|E2E Infrastructure Checklist]] - Setup checklist
- [[E2E_CONSENT_BANNER_FIX|E2E Consent Banner Fix]] - Cookie banner handling
- [[E2E_IPV6_FIX|E2E IPv6 Fix]] - IPv6 testing issues
- [[ENABLING_SKIPPED_E2E_TESTS|Enabling Skipped E2E Tests]] - Re-enabling tests
- [[TEST_SETUP_GUIDE|Test Setup Guide]] - General test environment setup

## Search & Performance Testing

- [[search-evaluation-reports|Search Evaluation Reports]] - Search quality reports
- [[RECOMMENDATION-EVALUATION|Recommendation Evaluation]] - Recommendation testing
- [[GRID_SEARCH_README|Grid Search]] - Search parameter tuning
- [[HYBRID_SEARCH_OPTIMIZATION_REPORT|Hybrid Search Optimization]] - Search optimization
- [[HYBRID_SEARCH_ROLLOUT|Hybrid Search Rollout]] - Rollout documentation
- [[MODERATION_SERVICES_TEST_COVERAGE|Moderation Services Coverage]] - Moderation test coverage
- [[stripe-subscription-testing|Stripe Subscription Testing]] - Additional Stripe testing docs

## E2E Test Suites

- [[../../frontend/e2e/tests/PREMIUM_SUBSCRIPTION_TESTS|Premium Subscription E2E Tests]] - Playwright E2E test suite for subscription flows

## Related Documentation

- [[../backend/testing|Backend Testing]] - Backend-specific testing strategies
- [[../frontend/accessibility|Frontend Testing]] - Frontend and accessibility testing
- [[../operations/security-testing-runbook|Security Testing]] - Security testing procedures

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/testing"
WHERE file.name != "index"
SORT title ASC
```

---

**See also:** [[../index|Documentation Home]] · [[../backend/testing|Backend Testing]]

[[../index|← Back to Index]]
