# Quality Review

## Summary
- **Verdict: Ready with fixes** (1 Important, 4 Minor)
- **Scope:** Committed changes (6b6bb62c..367e28b1, 22 files) + unstaged changes (57 files) + 25 untracked files
- **Branch:** `deploy/production` vs `main`

## Triage
- Docs-only: no
- React/Next perf review: yes (`.tsx` changes in pages, components, hooks, lazy loading changes)
- UI guidelines audit: yes (7+ component changes, CSS changes, a11y fixes)
- Reason:
  - 40+ frontend `.tsx`/`.ts` files changed across components, hooks, pages, and libs
  - Backend Go decomposition (~1800 lines extracted from main.go into 12 files)
  - New migration (000106: game slug column), monitoring infra, Caddy security hardening

## Strengths
- **main.go decomposition**: 1800-line monolith split into well-named files (infrastructure.go, repositories.go, services.go, handlers.go, middleware.go, routes_*.go, schedulers.go, shutdown.go). Each file has a clear single responsibility.
- **useClickOutside consolidation**: ~120 lines of duplicated click-outside logic across 7 components replaced with a 27-line hook using the correct ref pattern.
- **Security hardening batch**: Caddy monitoring IP whitelisting, safeJSON XSS fix, secure-storage `sessionStorage` fallback (was plaintext `localStorage`), AdminRoute for moderation page, auth-storage allowlist, source map hiding.
- **WebSocket stability**: Callback ref pattern in `useChatWebSocket` and `useWatchPartyWebSocket` prevents unnecessary disconnect/reconnect cycles.
- **TypeScript strict mode**: Enabled `strict: true` in tsconfig, with corresponding fixes throughout.
- **Token refresh queue fix**: `processQueue` else branch now properly rejects instead of silently hanging (promise leak fix).
- **Modal a11y**: `useId()` replaces hardcoded `id="modal-title"`, fixing ARIA violations with concurrent modals.
- **Game slug migration**: Replaces per-row `REGEXP_REPLACE` full table scan in `GetBySlug` with an indexed `slug` column.

## Issues

### Important (Should Fix)

#### 1. Unused `@monitoring_allowed` matcher in Caddyfile.vps
- **Location:** `Caddyfile.vps:117-119`
- **What:** The named matcher `@monitoring_allowed` is defined but never referenced. Each `handle` block defines its own inline `@blocked` matcher instead.
- **Why it matters:** Dead configuration is confusing and suggests the IP check may not be working as intended. In fact, the IP checks ARE working (via the per-block `@blocked` matchers), but the dangling named matcher is misleading.
- **Fix:** Remove the unused `@monitoring_allowed` block:
  ```
  # DELETE these 3 lines:
  @monitoring_allowed {
      remote_ip 127.0.0.1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16
  }
  ```

### Minor (Nice to Have)

#### 2. `/debug/pprof` and `/debug/metrics` rely solely on network isolation
- **Location:** `backend/cmd/api/routes_public.go:108-127`
- **What:** The `/debug` group (pprof profiling, Prometheus metrics) has no authentication. It relies on the Docker network not exposing port 8080 externally and Caddy not routing `/debug/*` to the backend.
- **Why it matters:** Defense in depth. If someone accidentally exposes port 8080 or adds a Caddy route, pprof and metrics become publicly accessible. The code comment acknowledges this ("should be protected in production").
- **Fix:** No action needed for this deployment since Caddy only proxies `/api/*` and the backend port is not host-exposed. Consider adding auth middleware as a future hardening measure.

#### 3. Health endpoints expose internal stats without auth
- **Location:** `backend/cmd/api/routes_public.go:87-106`
- **What:** `/health/stats` (DB pool stats), `/health/cache`, `/health/cache/check`, and `/health/webhooks` are publicly accessible. While not critical secrets, they reveal infrastructure details (connection counts, cache sizes, webhook retry counts).
- **Why it matters:** Information disclosure that could aid reconnaissance.
- **Fix:** These are useful for monitoring. The `/health/stats` endpoint is proxied via `/api/v1/...` prefix. Consider rate limiting or moving behind admin auth if concerned.

#### 4. `clipper-backend-agent.hcl` frontend template without corresponding template file
- **Location:** `vault/config/clipper-backend-agent.hcl:42-49`
- **What:** A new Vault Agent template block references `/vault-agent/templates/frontend.env.ctmpl` but this file is not in the diff. If it doesn't exist at deploy time, Vault Agent will fail to start.
- **Fix:** Verify the template file exists in the deployment or add it.

#### 5. Seed file doesn't include `slug` column
- **Location:** `backend/migrations/seed.sql:343`
- **What:** The `INSERT INTO games` in seed.sql doesn't include the `slug` column. After migration 000106, new seeds will have `NULL` slugs until the backfill runs or until the Go `Create` method is used.
- **Fix:** Not a production issue (migration backfills existing data, and the Go code sets slug on create). Only affects fresh dev environments using seed.sql directly.

## UI Guidelines (terse)
- `components/ui/Modal.tsx` - FIXED: `useId()` replaces duplicate `id="modal-title"` (a11y)
- `pages/forum/ForumIndex.tsx` - FIXED: hardcoded dark-mode colors replaced with design tokens (`text-foreground`, `bg-card`, `border-border`, etc.)
- `pages/ClipDetailPage.tsx` - NOTE: ban notification banner removed; users only discover ban status via toast on interaction. Intentional UX decision.
- `pages/LoginPage.tsx` - FIXED: "Terms of Service and Privacy Policy" now functional `<Link>` components instead of plain text.
- `components/layout/*` - GOOD: click-outside logic consolidated into hook; no a11y regressions.

## Verification Evidence
- **Go build:** `go build ./...` passes cleanly with all changes
- **Migration:** 000106_add_game_slug.up.sql includes backfill + index creation
- **Compilation:** No unused imports or compilation errors in modified Go files
- **TypeScript:** `strict: true` enabled with corresponding type fixes

## Previous Review Items (Resolved)
All 8 items from the previous review have been addressed:
1. Monitoring endpoints IP-whitelisted in Caddyfile (Critical -> Fixed)
2. `safeJSON` uses `json.Marshal` instead of raw string cast (Important -> Fixed)
3. `useClickOutside` handler stabilized with ref pattern (Important -> Fixed)
4. Vote/favorite mutations surface API errors via toast (Important -> Fixed)
5. `void error` anti-pattern removed in AuthContext (Minor -> Fixed)
6. Mutation error handlers verified as correct React Query pattern (Minor -> Verified)
7. Removed page exports verified as safe (Minor -> Verified)
8. Game slug column added with migration + index (Minor -> Fixed)
