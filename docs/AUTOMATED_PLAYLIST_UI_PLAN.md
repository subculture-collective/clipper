# Automated Playlist UI Plan

## Current State

### Backend (fully implemented)

- **15 curation strategies**: standard, sleeper_hits, viral_velocity, community_favorites, deep_cuts, fresh_faces, similar_vibes, cross_game_hits, controversial, binge_worthy, rising_stars, twitch_top_game, twitch_top_broadcaster, twitch_trending, twitch_discovery
- **5 schedule modes**: manual, hourly, daily, weekly, monthly
- **Rich filters**: game_id, game_ids, broadcaster_id, tag, exclude_tags, language, min_vote_score, min_view_count, exclude_nsfw, top_10k_streamers, seed_clip_id
- **Retention system**: retention_days (1–365), auto-cleanup of stale playlists
- **Title templates**: `{name}`, `{date}`, `{day}`, `{week_start}`, `{month}` placeholders
- **Scheduler**: runs every 5 minutes, generates playlists for due scripts, cleans up expired ones
- **API**: 5 admin endpoints under `/api/v1/admin/playlist-scripts`

### Frontend (partially implemented)

- Admin page at `/admin/playlist-scripts` with basic create/edit form
- Only exposes: name, description, sort, timeframe, clip_limit, visibility, is_active
- **Missing from UI**: schedule, strategy, all filter fields, retention_days, title_template

---

## Plan

### Phase 1: Update TypeScript Types & API Client

**Files**: `frontend/src/types/playlistScript.ts`, `frontend/src/lib/playlist-script-api.ts`

Add all missing fields to the frontend types to match the backend model:

```ts
export type PlaylistScriptSchedule = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export type PlaylistScriptStrategy =
    | 'standard'
    | 'sleeper_hits'
    | 'viral_velocity'
    | 'community_favorites'
    | 'deep_cuts'
    | 'fresh_faces'
    | 'similar_vibes'
    | 'cross_game_hits'
    | 'controversial'
    | 'binge_worthy'
    | 'rising_stars'
    | 'twitch_top_game'
    | 'twitch_top_broadcaster'
    | 'twitch_trending'
    | 'twitch_discovery';

// Add to PlaylistScript interface:
schedule: PlaylistScriptSchedule;
strategy: PlaylistScriptStrategy;
game_id?: string;
game_ids?: string[];
broadcaster_id?: string;
tag?: string;
exclude_tags?: string[];
language?: string;
min_vote_score?: number;
min_view_count?: number;
exclude_nsfw: boolean;
top_10k_streamers: boolean;
seed_clip_id?: string;
retention_days: number;
title_template?: string;
```

Same for the Create/Update request types.

---

### Phase 2: Redesign the Admin Script Form

**File**: `frontend/src/pages/admin/AdminPlaylistScriptsPage.tsx` (or extract into a new `PlaylistScriptForm` component)

Replace the flat grid form with a **multi-section wizard/accordion layout**:

#### Section 1 — Basics

| Field       | Control                          | Notes                   |
| ----------- | -------------------------------- | ----------------------- |
| Name        | Text input                       | Required, max 100 chars |
| Description | Textarea                         | Optional, max 500 chars |
| Visibility  | Select (public/unlisted/private) | Default: public         |
| Active      | Toggle switch                    | Default: on             |

#### Section 2 — Strategy

| Field      | Control                                                | Notes                                                                                                                              |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Strategy   | Select with descriptions                               | Grouped: "Database" / "Twitch-powered". Each option shows a one-line description (e.g. "Sleeper Hits — High retention, low views") |
| Sort       | Select (top/trending/hot/popular/new/rising/discussed) | Only relevant for `standard` strategy — hide/disable for others                                                                    |
| Timeframe  | Select (hour/day/week/month/year)                      | Same — only for `standard`                                                                                                         |
| Clip Limit | Number input (1–100)                                   | Default: 10                                                                                                                        |

Strategy-specific fields that appear conditionally:

- **similar_vibes** → show Seed Clip ID input (text or clip search)
- **cross_game_hits**, **twitch_discovery** → show Game IDs multi-input
- **twitch_top_game** → show Game ID single input
- **twitch_top_broadcaster** → show Broadcaster ID single input

#### Section 3 — Filters

Collapsible "Advanced Filters" section:

| Field                  | Control                               | Notes                       |
| ---------------------- | ------------------------------------- | --------------------------- |
| Game                   | Text input or search (game_id)        | Optional single game filter |
| Broadcaster            | Text input or search (broadcaster_id) | Optional                    |
| Tag                    | Text input (tag slug)                 | Optional                    |
| Exclude Tags           | Tag chip input                        | Optional, array             |
| Language               | Select or text (e.g. "en")            | Optional                    |
| Min Vote Score         | Number input                          | Optional                    |
| Min View Count         | Number input                          | Optional                    |
| Exclude NSFW           | Toggle                                | Default: on                 |
| Top 10K Streamers Only | Toggle                                | Default: off                |

#### Section 4 — Schedule & Lifecycle

| Field          | Control                                     | Notes                                                                                                                       |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Schedule       | Select (manual/hourly/daily/weekly/monthly) | Default: manual                                                                                                             |
| Retention Days | Number slider or input (1–365)              | Default: 30. Show helper: "Generated playlists older than this are auto-deleted"                                            |
| Title Template | Text input with placeholders                | Show available placeholders as chips: `{name}`, `{date}`, `{day}`, `{week_start}`, `{month}`. Live preview below the input. |

---

### Phase 3: Enhance the Scripts List Table

Improve the existing table in AdminPlaylistScriptsPage:

1. **Add columns**: Schedule (badge), Strategy (badge), Retention
2. **Add a "Last Playlist" link** — if `last_generated_playlist_id` exists, link to `/playlists/{id}`
3. **Confirm before delete** — add a confirmation dialog
4. **Confirm before generate** — show a brief confirmation since it creates real data
5. **Add schedule badge styling**: `manual` = gray, `hourly` = red, `daily` = blue, `weekly` = green, `monthly` = purple

---

### Phase 4: Live Preview & Title Template UX

Add a "Preview" panel that shows:

- The resulting title using `buildPlaylistTitle` logic (replicated client-side with current date)
- A summary sentence: "This script will generate a **public** playlist of the **top 10** clips from the **last day**, sorted by **top**, every **day**. Old playlists are removed after **30 days**."

For the title template field:

- Clickable placeholder chips that insert at cursor position
- Live preview updating as user types

---

### Phase 5: Strategy Documentation Tooltips

Add inline help for each strategy so admins understand what they're choosing:

| Strategy               | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| standard               | Standard clip query with sort + timeframe filters     |
| sleeper_hits           | Hidden gems: high retention but low view count        |
| viral_velocity         | Fastest growing engagement in the last 48 hours       |
| community_favorites    | Highest save-to-view ratio                            |
| deep_cuts              | High watch progress + good votes but under the radar  |
| fresh_faces            | Best clips from new creators (≤5 clips total)         |
| similar_vibes          | Clips similar to a seed clip (uses AI embeddings)     |
| cross_game_hits        | Top clips across multiple games                       |
| controversial          | High comment density relative to views                |
| binge_worthy           | Clips from sessions where users watched 3+ in a row   |
| rising_stars           | Creators whose recent performance beats their average |
| twitch_top_game        | Import top Twitch clips for a specific game           |
| twitch_top_broadcaster | Import top Twitch clips for a specific broadcaster    |
| twitch_trending        | Trending clips from Twitch's top games                |
| twitch_discovery       | Clips from non-mainstream Twitch games (rank 11-20)   |

---

### Phase 6 (Optional): Non-Admin User-Facing Automated Playlists

Consider a lighter version for regular users (not just admins):

1. **User playlist scripts page** at `/playlists/automated` (new route, new API endpoints without admin auth)
2. Restricted to `standard` strategy only, limited schedule options (daily/weekly), user-owned
3. Users can create "smart playlists" that auto-refresh — e.g., "My weekly top clips from Valorant"
4. New API endpoints: `GET/POST /api/v1/playlist-scripts` (user-scoped, not admin)
5. Backend changes: scope queries to `created_by = current_user`, limit strategy to `standard`, cap schedule frequency

This keeps the power features (Twitch strategies, advanced curation) admin-only while giving users a useful automation feature.

---

## File Change Summary

| File                                                    | Change                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `frontend/src/types/playlistScript.ts`                  | Add all missing types (schedule, strategy, filters, etc.)            |
| `frontend/src/lib/playlist-script-api.ts`               | Update request types to pass new fields                              |
| `frontend/src/pages/admin/AdminPlaylistScriptsPage.tsx` | Redesign form with sections, conditional fields, preview             |
| `frontend/src/components/admin/PlaylistScriptForm.tsx`  | **New** — extracted form component with section layout               |
| `frontend/src/components/admin/TitleTemplateInput.tsx`  | **New** — title template field with placeholder chips + live preview |
| `frontend/src/components/admin/StrategySelect.tsx`      | **New** — grouped strategy selector with descriptions                |
| `frontend/src/lib/playlist-script-utils.ts`             | **New** — client-side `buildPlaylistTitle()`, strategy metadata      |

---

## Priority Order

1. **Phase 1** (types) — prerequisite for everything else
2. **Phase 2** (form redesign) — the core deliverable
3. **Phase 3** (table improvements) — quick wins
4. **Phase 4** (preview UX) — polish
5. **Phase 5** (tooltips) — low effort, high clarity
6. **Phase 6** (user-facing) — separate scope, requires backend changes
