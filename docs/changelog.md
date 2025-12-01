---
title: "Changelog"
summary: "Version history and release notes for Clipper."
tags: ["docs", "changelog", "releases"]
area: "docs"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["releases", "version history"]
---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project structure with frontend and backend
- Twitch OAuth authentication flow
- User profile system with karma tracking
- Clip browsing and filtering functionality
- Voting system for clips (upvote/downvote)
- Comment system with markdown support
- Search functionality for clips
- Favorites system for saving clips
- Tagging system for clip categorization
- Moderation tools for content management
- User submission system for clips
- Notification system
- Analytics dashboard
- Redis caching layer
- Comprehensive API documentation
- Docker-based development environment
- CI/CD pipeline with GitHub Actions
- Comprehensive testing infrastructure
- Code of Conduct
- Contributing guidelines
- MIT License
- **[RFC 002: Advanced Query Language](docs/rfcs/002-advanced-query-language.md)** - Human-readable query syntax for advanced search and filtering
  - Formal EBNF grammar specification in [QUERY_GRAMMAR.md](docs/QUERY_GRAMMAR.md)
  - Comprehensive examples and test cases in [QUERY_LANGUAGE_EXAMPLES.md](docs/QUERY_LANGUAGE_EXAMPLES.md)
  - Support for field filters (game:, creator:, tag:, etc.)
  - Boolean operators (OR, implicit AND) and negation (-)
  - Range queries (votes:>50, duration:10..30)
  - Date filtering (after:2025-01-01, after:last-week)
  - Grouping with parentheses for complex queries
  - Query escaping and quoting rules
  - Error codes and validation rules

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- Implemented JWT-based authentication
- Added rate limiting on API endpoints
- SQL injection prevention via parameterized queries
- XSS protection with input sanitization
- CORS configuration for secure cross-origin requests
- CSS injection prevention in user-generated content
- Input validation and sanitization across all endpoints

## Release Notes

This project is currently in active development. Version 1.0.0 will be released once all MVP features are complete and thoroughly tested.

### Upcoming Releases

#### v0.1.0 (Planned)

- Core functionality: Browse, search, and vote on clips
- User authentication via Twitch
- Basic user profiles
- Comment system
- Admin moderation tools

#### v1.0.0 (Planned)

- All MVP features complete
- Production-ready infrastructure
- Comprehensive documentation
- Full test coverage (>80%)
- Performance optimizations
- Security hardening

[Unreleased]: https://github.com/subculture-collective/clipper/compare/v0.0.0...HEAD
