# Admin Engagement Scoring Configuration

## Overview

Implemented a complete admin UI for dynamically configuring engagement scoring weights at runtime without requiring server restarts.

## Implementation Summary

### Backend

#### Database Layer

- **Migration 22** (`000022_add_app_settings.up.sql`):
    - Created `app_settings` table with columns: `id`, `key`, `value`, `value_type`, `description`, `updated_by`, `created_at`, `updated_at`
    - Added unique index on `key` column
    - Seeded default engagement scoring weights:
        - `engagement_scoring.vote_weight`: 3.0
        - `engagement_scoring.comment_weight`: 2.0
        - `engagement_scoring.favorite_weight`: 1.5
        - `engagement_scoring.view_weight`: 0.1
    - Rollback migration (`000022_add_app_settings.down.sql`) drops table and index

#### Repository Layer

- **AppSettingsRepository** (`internal/repository/app_settings_repository.go`):
    - `Get(ctx, key)`: Retrieve single setting by key
    - `Set(ctx, key, value, valueType, updatedBy)`: Upsert setting with audit tracking
    - `GetByPrefix(ctx, prefix)`: Bulk read settings by key prefix (e.g., "engagement_scoring.%")

#### Service Layer

- **ConfigService** (`internal/services/config_service.go`):
    - `GetEngagementConfig(ctx)`: Loads config from DB, caches result, provides defaults on first load
    - `UpdateEngagementConfig(ctx, config, updatedBy)`: Validates weights (non-negative, at least one positive), saves to DB, updates cache
    - Thread-safe with RWMutex for cache access

#### Handler Layer

- **ConfigHandler** (`internal/handlers/config_handler.go`):
    - `GET /api/v1/admin/config/engagement`: Returns current engagement scoring weights
    - `PUT /api/v1/admin/config/engagement`: Updates weights, triggers `RecalculateEngagementScores` for all clips
    - Protected by admin authentication middleware
    - Validates request body and weights before update

#### Routing

- **main.go**:
    - Instantiated `appSettingsRepo`, `configService`, and `configHandler`
    - Added routes to admin group:
        - `GET /admin/config/engagement`
        - `PUT /admin/config/engagement`

### Frontend

#### API Client

- **config-api.ts** (`lib/config-api.ts`):
    - `getEngagementConfig()`: Fetches current weights
    - `updateEngagementConfig(config)`: Saves new weights
    - TypeScript interfaces for `EngagementConfig` and response types

#### Admin Config Page

- **AdminConfigPage.tsx** (`pages/admin/AdminConfigPage.tsx`):
    - Form with 4 number inputs for vote, comment, favorite, and view weights
    - Uses TanStack Query for data fetching and mutation
    - Local state management for form inputs with reset capability
    - Client-side validation (non-negative, at least one positive)
    - Success/error toast messages
    - Live formula preview showing current calculation
    - Warning notes about recalculation impact
    - Responsive design with mobile-first styling

#### Routing

- **App.tsx**:
    - Added lazy-loaded `AdminConfigPage` component
    - Added route `/admin/config` with `AdminRoute` guard
- **AdminDashboard.tsx**:
    - Added "Configuration" card linking to `/admin/config`

## Features

1. **Runtime Configuration**: No server restart required; changes apply immediately
2. **Hot Reload**: ConfigService caches config on first load, invalidates on update
3. **Automatic Recalculation**: PUT endpoint triggers `RecalculateEngagementScores` for all clips
4. **Audit Trail**: `updated_by` FK tracks which admin changed settings, `updated_at` timestamp
5. **Validation**:
    - Backend: Non-negative weights, at least one positive
    - Frontend: Same validation plus live feedback
6. **Admin Protection**: Endpoints protected by `RequireRole("admin", "moderator")` middleware
7. **Type Safety**: TypeScript interfaces for frontend, Go structs for backend
8. **Error Handling**: Graceful fallbacks, user-friendly error messages
9. **Extensible**: Key-value schema supports adding new settings without schema changes

## Current Defaults

- Vote Weight: 3.0
- Comment Weight: 2.0
- Favorite Weight: 1.5
- View Weight: 0.1

## Formula

```
engagement_score = (vote_count × vote_weight) +
                   (comment_count × comment_weight) +
                   (favorite_count × favorite_weight) +
                   (view_count × view_weight)
```

## Database Schema

```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    value_type VARCHAR(50) NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## API Endpoints

### GET /api/v1/admin/config/engagement

**Response:**

```json
{
    "vote_weight": 3.0,
    "comment_weight": 2.0,
    "favorite_weight": 1.5,
    "view_weight": 0.1
}
```

### PUT /api/v1/admin/config/engagement

**Request:**

```json
{
    "vote_weight": 4.0,
    "comment_weight": 2.5,
    "favorite_weight": 2.0,
    "view_weight": 0.2
}
```

**Response:**

```json
{
    "message": "Configuration updated and engagement scores recalculated",
    "config": {
        "vote_weight": 4.0,
        "comment_weight": 2.5,
        "favorite_weight": 2.0,
        "view_weight": 0.2
    }
}
```

## Testing

### Manual Testing Steps

1. Navigate to `/admin/config` (requires admin/moderator login)
2. View current engagement weights
3. Modify one or more weights
4. Click "Save Changes"
5. Verify success message and recalculation completion
6. Check that engagement scores updated in clip list

### Database Verification

```sql
-- Check current settings
SELECT key, value, value_type FROM app_settings ORDER BY key;

-- Check audit trail
SELECT key, value, updated_by, updated_at FROM app_settings ORDER BY updated_at DESC;
```

## Next Steps (Future Enhancements)

- [ ] Add backend unit tests for ConfigService
- [ ] Add integration tests for config endpoints
- [ ] Add frontend tests for AdminConfigPage form validation
- [ ] Add analytics tracking for config changes
- [ ] Add recalculation progress indicator for large datasets
- [ ] Add config change history/audit log display in UI
- [ ] Add weight presets (e.g., "Balanced", "Vote-Heavy", "Engagement-Heavy")
- [ ] Add validation rules for reasonable weight ranges
- [ ] Add dry-run preview of impact before saving
