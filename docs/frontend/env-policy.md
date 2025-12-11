<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Frontend Environment Variable Policy](#frontend-environment-variable-policy)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Frontend Environment Variable Policy"
summary: "Only `VITE_*` variables may be used at build-time for the frontend. These values are inlined into th"
tags: ['frontend']
area: "frontend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Frontend Environment Variable Policy

Only `VITE_*` variables may be used at build-time for the frontend. These values are inlined into the static bundle and are public.

- Allowed: `VITE_API_BASE_URL`, `VITE_ENABLE_ANALYTICS`, etc.
- Forbidden: Secrets or credentials (API tokens, client secrets, keys). Never place them in `.env.production` for the frontend.

Build-time enforcement:
- The Dockerfile and `prebuild` script run `scripts/check-frontend-env.sh` to fail the build if non-`VITE_` variables are present.

Recommendations:
- Keep secrets server-side and expose only necessary public config via `VITE_*`.
- Use the backend as a proxy for third-party APIs that require credentials.
