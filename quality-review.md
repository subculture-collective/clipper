# Quality Review

## Summary
- **Verdict: Not ready** (5 Critical, 10 Important, 11 Minor)
- **Scope:** `6b6bb62c..9688805c` (125 files, -10,368 / +6,302 lines)
- **Branch:** `deploy/production` vs `main`

## Triage
- Docs-only: no
- React/Next perf review: yes
- UI guidelines audit: yes
- Reason:
  - 40+ frontend `.tsx`/`.ts` files changed (components, hooks, pages, libs)
  - Backend Go: main.go refactored into 12 files, new pSEO system, automated playlists
  - New migrations (000106: game slugs, 000107: playlist scripts)
  - Monitoring directory deleted, Caddy/nginx/Vault config changes

## Strengths
1. **main.go decomposition** — 1850-line monolith cleanly split into single-responsibility files (infrastructure, repositories, services, handlers, middleware, routes, schedulers, shutdown). Orchestrator is ~114 lines.
2. **Playlist curation strategies** — Rich SQL-based strategies (sleeper hits, viral velocity, fresh faces) with parameterized queries and clean strategy dispatch pattern.
3. **Secure storage hardened** — Removed localStorage fallback for encrypted data, added try/catch for corrupted keys, switched to sessionStorage-only. Auth storage uses allowlist instead of heuristic substring matching.
4. **WebSocket stability** — Callback ref pattern in `useChatWebSocket`/`useWatchPartyWebSocket` prevents unnecessary reconnections on parent re-renders.
5. **useClickOutside consolidation** — ~120 lines of duplicated logic across 7 components replaced with 27-line hook using correct ref pattern.
6. **Graceful shutdown** — Properly stops all schedulers, cancels event tracker, shuts down WebSocket server, gives HTTP server 5-second drain timeout.
7. **Frontend cleanup** — Removed zustand (unused), dom-helpers (unused), enabled strict TypeScript, lazy-loaded SearchPage, enabled CSS code splitting, debounced resize in useIsMobile.
8. **Modal a11y** — `useId()` replaces hardcoded IDs, fixing ARIA violations with concurrent modals.
9. **Defense-in-depth headers** — Both Caddy and nginx set HSTS, X-Content-Type-Options, X-Frame-Options, COOP/CORP, Permissions-Policy. CSP deployed in report-only mode first.
10. **Migration rollback** — Both 000106 and 000107 have thorough down scripts with proper ordering (drop index before column, safety-check bot user deletion).

---

## Issues

### Critical (Must Fix)

#### C1. SQL syntax error in `GetFollowingFeedClips` count query
- **Location:** `backend/internal/repository/clip_repository.go:1455`
- **What:** Missing closing `)` on the `followed_broadcasters` CTE. The query reads `...WHERE user_id = $1 , blocked_users AS (` instead of `...WHERE user_id = $1 ), blocked_users AS (`.
- **Why:** SQL parse error on every call. The following-feed count query will always fail in production. The main data query (line 1374) has the correct syntax — copy-paste mistake.
- **Fix:** Add the missing `)` before the comma on line 1455.

#### C2. Blocked-user filter bypassed in count query (operator precedence)
- **Location:** `backend/internal/repository/clip_repository.go:1464-1468`
- **What:** `OR ... AND` without parentheses. SQL evaluates as `(submitted IN followed) OR (broadcaster IN followed_broadcasters AND submitted NOT IN blocked)` — clips from followed users bypass the blocked-user filter entirely. The main data query (lines 1397-1402) has the correct grouping.
- **Why:** Blocked users' clips appear in the following feed. Content moderation bypass.
- **Fix:** Move the blocked-users filter outside the OR group, matching the main query pattern.

#### C3. `safeJSON` double-encodes SchemaJSON — broken JSON-LD on all pSEO pages
- **Location:** `backend/cmd/api/middleware.go:53-59`, `backend/templates/base.html:19`
- **What:** `SchemaJSON` is a pre-serialized JSON string (from `json.Marshal` in pages_handler.go). `safeJSON` calls `json.Marshal` again on this string, producing `"{\"@context\":...}"` instead of valid JSON-LD.
- **Why:** Every pSEO page outputs invalid structured data. Google will reject all JSON-LD markup.
- **Fix:** Handle string pass-through in `safeJSON`:
  ```go
  "safeJSON": func(v any) template.JS {
      if s, ok := v.(string); ok {
          return template.JS(s)
      }
      b, err := json.Marshal(v)
      if err != nil { return template.JS("null") }
      return template.JS(b)
  },
  ```

#### C4. `useWatchHistory.recordProgress` throttle defeated by stale closure
- **Location:** `frontend/src/hooks/useWatchHistory.ts:85`
- **What:** `lastRecordedTimestamp` is state and included in `useCallback` deps. Every call triggers `setLastRecordedTimestamp(now)`, recreating the callback, defeating the 30-second throttle and causing cascading re-renders.
- **Why:** Excessive API calls to `/watch-history` (per render cycle instead of every 30s), creating server load.
- **Fix:** Use a ref instead of state:
  ```ts
  const lastRecordedTimestampRef = useRef(0);
  // Remove lastRecordedTimestamp from useCallback deps
  ```

#### C5. Watch party WebSocket reads auth token from wrong storage
- **Location:** `frontend/src/hooks/useWatchPartyWebSocket.ts:67`
- **What:** Reads `localStorage.getItem('token')` directly, but auth tokens were moved to encrypted IndexedDB via `secure-storage.ts`. This call returns `null`, so the WebSocket fails to authenticate.
- **Why:** Watch party functionality is broken for all users.
- **Fix:** Use `getSecureItem` from `secure-storage.ts` or read from the actual auth storage location. The connect callback will need to be async.

---

### Important (Should Fix)

#### I1. Bot user created with admin role
- **Location:** `backend/migrations/000107_enhance_playlist_scripts.up.sql:43`
- **What:** `clpr-bot` is created with `role = 'admin'` and `account_type = 'admin'`. A service account that only posts clips should have least-privilege.
- **Why:** If any auth path allows impersonation of this well-known UUID, attacker gets full admin access.
- **Fix:** Change to `role = 'bot', account_type = 'service'`.

#### I2. Debug/pprof endpoints exposed without authentication
- **Location:** `backend/cmd/api/routes_public.go:122-139`
- **What:** `/debug/pprof/*` and `/debug/metrics` are on the public router with no auth. Comment says "should be protected in production" but no code enforces it.
- **Why:** pprof exposes goroutine stacks (may contain secrets/tokens), heap profiles, and CPU profiling (can cause load). Currently relies on Caddy not routing `/debug/*`, but defense-in-depth is needed.
- **Fix:** Add admin auth middleware to the debug group, or restrict by IP.

#### I3. `game_slug` column lacks NOT NULL and UNIQUE constraints
- **Location:** `backend/migrations/000106_add_game_slug.up.sql:4`
- **What:** `slug TEXT` is nullable with a non-unique index. Different game names could produce the same slug (e.g., "Game: X" and "Game X" both → "game-x"). New games inserted without slug computation get NULL.
- **Why:** `GetBySlug` returns arbitrary results for duplicate slugs; NULL slugs make games unreachable via pSEO.
- **Fix:** Add `NOT NULL` default + `UNIQUE` index. Add application-level collision handling.

#### I4. Missing leading slash in playlist copy route
- **Location:** `backend/cmd/api/routes_social.go:116`
- **What:** `playlists.POST(":id/copy", ...)` — missing `/` before `:id`. Other routes in the group use `"/:id/..."`.
- **Why:** Route may be registered as `/playlists:id/copy` instead of `/playlists/:id/copy`, making the copy endpoint unreachable.
- **Fix:** Change to `playlists.POST("/:id/copy", ...)`.

#### I5. Date filter uses string interpolation instead of parameterized queries
- **Location:** `backend/internal/repository/clip_repository.go:446-449`
- **What:** `fmt.Sprintf("c.created_at >= '%s'", *filters.DateFrom)` — date values interpolated directly into SQL. Currently safe because `validateDateFilter` normalizes inputs, but the repository layer should not trust callers.
- **Why:** Defense-in-depth. Any future caller bypassing validation creates a SQL injection vector.
- **Fix:** Use parameterized placeholders (`$N`) and append values to `args`.

#### I6. AuthContext `value` object recreated on every render
- **Location:** `frontend/src/context/AuthContext.tsx:206`
- **What:** The `value` prop to `<AuthContext.Provider>` is a fresh object literal. While individual callbacks are memoized, the container object is not.
- **Why:** Every `AuthProvider` re-render propagates to all `useAuth()` consumers (it sits near the root).
- **Fix:** Wrap in `useMemo` with appropriate dependencies.

#### I7. Monitoring deleted but Caddyfile still routes to monitoring services
- **Location:** `Caddyfile.vps:117-150`
- **What:** Entire `monitoring/` directory deleted (docker-compose, alerts, dashboards), but Caddyfile adds 5 new reverse proxy routes for `clipper-grafana`, `clipper-prometheus`, `clipper-alertmanager`, `clipper-metabase`, `clipper-jaeger`. CI workflow `.github/workflows/alert-validation.yml` still references deleted files.
- **Why:** Routes return 503 if containers aren't running. CI workflow will fail on every run.
- **Fix:** Remove the 5 monitoring `handle` blocks from Caddyfile and delete the alert-validation workflow, or restore monitoring configs.

#### I8. Vault `unwrap_token = true` without wrapping token workflow
- **Location:** `vault/config/clipper-backend-agent.hcl:21`
- **What:** Tells Vault Agent to treat the auth token as wrapped, but the documented AppRole auth flow produces standard (unwrapped) tokens.
- **Why:** Vault Agent will fail authentication with "wrapping token is not valid", preventing backend startup.
- **Fix:** Remove `unwrap_token = true` or confirm the deployment pipeline wraps tokens.

#### I9. Dockerfile uses unpinned `alpine:latest`
- **Location:** `backend/Dockerfile:22`
- **What:** `FROM alpine:latest` is a moving target. New Alpine releases could introduce musl changes or drop default packages.
- **Why:** Non-reproducible builds. Monday's image may differ from Wednesday's.
- **Fix:** Pin to `FROM alpine:3.21`.

#### I10. Removed Vault template env vars may break running services
- **Location:** `vault/templates/backend.env.ctmpl`
- **What:** 17 env vars removed (MFA_ENCRYPTION_KEY, TELEMETRY_*, TOXICITY_*, CDN_*, SENDGRID_WEBHOOK_PUBLIC_KEY, etc.). Telemetry middleware is still registered in `middleware.go:72-74`.
- **Why:** Missing vars default to empty/zero, silently disabling features. Confirm this is intentional for all 17 variables.
- **Fix:** Verify Go config struct defaults. Document which features are intentionally disabled.

---

### Minor (Nice to Have)

#### M1. `PlaylistDetail.copyInitialValues` useMemo depends on object reference
- **Location:** `frontend/src/components/playlist/PlaylistDetail.tsx:142-158`
- **What:** Dependency `[data?.data]` is an object reference that changes on every React Query refetch, making the memo a no-op.
- **Fix:** Depend on specific primitives: `[data?.data?.title, data?.data?.description, data?.data?.cover_url]`.

#### M2. SettingsPage consent toggles share a single timeout ref
- **Location:** `frontend/src/pages/SettingsPage.tsx:577-599`
- **What:** Three consent toggles write to the same `consentTimeoutRef`. Rapid toggles orphan the first timeout — success message persists indefinitely.
- **Fix:** Clear previous timeout before setting new one.

#### M3. Modal/AppLayout inconsistent overflow cleanup
- **Location:** `frontend/src/components/ui/Modal.tsx:86` vs `frontend/src/components/layout/AppLayout.tsx:30`
- **What:** Modal sets `overflow: 'unset'`; AppLayout sets `overflow: ''`. Both work but have different CSS semantics.
- **Fix:** Normalize to `''` everywhere.

#### M4. ClipDetailPage still uses raw `fetch` for iframe-only view tracking
- **Location:** `frontend/src/pages/ClipDetailPage.tsx:57-68`
- **What:** Raw `fetch('/api/v1/watch-history', ...)` bypasses `apiClient` interceptors (no CSRF, no auth refresh, no base URL config).
- **Fix:** Use `apiClient` for consistency.

#### M5. ESLint disables `no-unused-expressions` entirely
- **Location:** `frontend/eslint.config.js:30`
- **What:** `'off'` allows standalone expressions without side effects. Could hide bugs.
- **Fix:** Consider `'warn'` instead.

#### M6. Error string comparison antipattern in handlers
- **Location:** `backend/internal/handlers/playlist_handler.go:126,137,210,304-305,398,408`
- **What:** `err.Error() == "playlist not found"` and `strings.Contains(err.Error(), "unauthorized")`. Brittle — message changes break status code routing.
- **Fix:** Define sentinel errors: `var ErrPlaylistNotFound = errors.New(...)` with `errors.Is()`.

#### M7. Health/stats endpoints expose DB pool metrics without auth
- **Location:** `backend/cmd/api/routes_public.go:99-111`
- **What:** `/health/stats` reveals connection counts, max connections — aids DoS reconnaissance.
- **Fix:** Consider rate limiting or moving behind admin auth.

#### M8. Hardcoded year upper bound `2030` in `GetBestOfMonthPage`
- **Location:** `backend/internal/handlers/pages_handler.go:216`
- **What:** `year > 2030` will need updating before 2030.
- **Fix:** Use `time.Now().Year() + 1`.

#### M9. nginx stub_status allows `172.19.0.0/16` instead of broader Docker range
- **Location:** `frontend/nginx.conf:75`
- **What:** Only matches one specific Docker bridge network. If Docker assigns a different network, metrics scraping fails.
- **Fix:** Use `172.16.0.0/12` for the full Docker range.

#### M10. Dev artifacts (.claude/settings.json, runs/evolution/) committed to production
- **Location:** `.claude/settings.json`, `runs/evolution/`
- **What:** Developer-specific tooling files with local path references (`~/.claude/skills/`).
- **Fix:** Add `.claude/` and `runs/` to `.gitignore`.

#### M11. `tsconfig.app.json` `strict: true` may surface new type errors in untouched code
- **Location:** `frontend/tsconfig.app.json:25`
- **What:** Enables strictNullChecks, strictFunctionTypes, etc. Good change but may fail in CI on untouched files.
- **Fix:** Verify full `tsc --noEmit` passes before deploy.

---

## UI Guidelines (terse)
- `components/ui/Modal.tsx` — FIXED: `useId()` replaces duplicate `id="modal-title"` (a11y)
- `pages/forum/ForumIndex.tsx` — FIXED: hardcoded dark-mode colors replaced with design tokens
- `pages/LoginPage.tsx` — FIXED: TOS/Privacy now functional `<Link>` components
- `components/layout/*` — GOOD: click-outside logic consolidated; no a11y regressions
- `pages/ClipDetailPage.tsx` — NOTE: ban banner removed; users discover ban via toast on interaction (intentional UX)
- `components/ui/EmojiPicker.tsx` — GOOD: proper `useClickOutside` integration, keyboard-accessible

## Assessment
**Ready to merge?** No — With fixes

**Reasoning:** Five critical issues must be resolved before production deployment: a SQL syntax error that breaks the following-feed count query (C1), a blocked-user filter bypass (C2), broken JSON-LD on all pSEO pages (C3), a watch history throttle that fires on every render (C4), and a broken watch party WebSocket auth (C5). The important issues (bot admin role, exposed pprof, missing slug constraints, orphaned monitoring routes) should also be addressed but are lower risk.
