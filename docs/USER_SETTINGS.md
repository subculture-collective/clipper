# User Settings and Account Management

This document describes the user settings and account management features implemented in Clipper, including profile management, privacy settings, data export, and GDPR-compliant account deletion.

## Features

### Profile Management

Users can manage their profile information through the Settings page:

- **Display Name**: Customize how their name appears on the site
- **Bio**: Add a personal bio (up to 500 characters)
- **Twitch Username**: Read-only field showing the Twitch username when different from display name

#### API Endpoints

**Update Profile**
```
PUT /api/v1/users/me/profile
```

Request body:
```json
{
  "display_name": "My Display Name",
  "bio": "This is my bio" // optional
}
```

### Privacy Settings

Users can control their privacy through various settings:

- **Profile Visibility**: Control who can view the profile
  - `public`: Anyone can view
  - `private`: Only the user can view
  - `followers`: Only followers can view (future implementation)
  
- **Show Karma Publicly**: Toggle whether karma points are displayed on the public profile

#### API Endpoints

**Get Settings**
```
GET /api/v1/users/me/settings
```

Response:
```json
{
  "settings": {
    "user_id": "uuid",
    "profile_visibility": "public",
    "show_karma_publicly": true,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

**Update Settings**
```
PUT /api/v1/users/me/settings
```

Request body:
```json
{
  "profile_visibility": "private", // optional
  "show_karma_publicly": false     // optional
}
```

### Notification Preferences

Notification preferences are managed through a separate page but linked from the Settings page. See [Notification System Documentation](./NOTIFICATIONS.md) for details.

Users can configure:
- Email notifications (on/off)
- Email digest frequency (immediate, daily, weekly)
- Notification types (replies, mentions, votes, badges, etc.)

### Data Export (GDPR Compliance)

Users can export all their personal data in compliance with GDPR Article 20 (Right to data portability).

#### API Endpoints

**Export User Data**
```
GET /api/v1/users/me/export
```

Response: ZIP file containing:
- `user_data.json`: Complete user data including profile, settings, and favorites
- `README.txt`: Information about the export

Rate limit: 1 request per hour

The exported data includes:
- User profile information
- Privacy settings
- Favorite clips
- Account metadata

### Account Deletion (GDPR Compliance)

The account deletion feature implements GDPR-compliant data removal with a 30-day grace period.

#### Flow

1. **Request Deletion**: User submits a deletion request with optional reason
2. **Grace Period**: 30-day waiting period begins
3. **During Grace Period**: User can cancel the deletion at any time
4. **After Grace Period**: Account and all associated data are permanently deleted

#### API Endpoints

**Request Account Deletion**
```
POST /api/v1/users/me/delete
```

Request body:
```json
{
  "confirmation": "DELETE MY ACCOUNT", // required, must match exactly
  "reason": "Optional reason text"    // optional, max 1000 characters
}
```

Response:
```json
{
  "message": "Account deletion scheduled",
  "scheduled_for": "timestamp (30 days from now)"
}
```

Rate limit: 1 request per hour

**Cancel Account Deletion**
```
POST /api/v1/users/me/delete/cancel
```

Response:
```json
{
  "message": "Account deletion cancelled"
}
```

**Get Deletion Status**
```
GET /api/v1/users/me/delete/status
```

Response:
```json
{
  "pending": true,
  "scheduled_for": "timestamp",
  "requested_at": "timestamp"
}
```

## Database Schema

### user_settings Table

```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(20) DEFAULT 'public',
    show_karma_publicly BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### account_deletions Table

```sql
CREATE TABLE account_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP NOT NULL,
    reason TEXT,
    is_cancelled BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,
    UNIQUE(user_id, is_cancelled)
);
```

## Frontend Components

### SettingsPage Component

Location: `frontend/src/pages/SettingsPage.tsx`

The Settings page provides a unified interface for all user settings including:
- Profile editing form
- Privacy settings toggles
- Link to notification preferences
- Data export button
- Account deletion modal

### API Client

Location: `frontend/src/lib/user-settings-api.ts`

Provides TypeScript functions for interacting with the user settings API:
- `updateProfile()`
- `getUserSettings()`
- `updateUserSettings()`
- `exportUserData()`
- `requestAccountDeletion()`
- `cancelAccountDeletion()`
- `getAccountDeletionStatus()`

## Security Considerations

1. **Authentication Required**: All endpoints require authentication via JWT
2. **Rate Limiting**: 
   - Export data: 1 request per hour
   - Delete account: 1 request per hour
3. **Confirmation Required**: Account deletion requires exact confirmation text
4. **Audit Logging**: All account deletion requests and cancellations are logged
5. **Data Privacy**: Exported data is provided as a downloadable ZIP file, not stored server-side

## Audit Logging

The following events are logged in the audit log:

- `account_deletion_requested`: When a user requests account deletion
  - Logs: user_id, reason (if provided)
  
- `account_deletion_cancelled`: When a user cancels a pending deletion
  - Logs: user_id

## Testing

### Manual Testing Checklist

- [ ] Profile update (display name and bio)
- [ ] Profile update validation (max lengths)
- [ ] Privacy settings (profile visibility dropdown)
- [ ] Privacy settings (karma visibility toggle)
- [ ] Data export (download works, ZIP contains expected files)
- [ ] Account deletion request (with reason)
- [ ] Account deletion request (without reason)
- [ ] Account deletion confirmation validation
- [ ] Account deletion cancellation
- [ ] Account deletion status display
- [ ] Rate limiting on export and delete endpoints
- [ ] UI shows Twitch name when different from display name
- [ ] Link to notification preferences works

### Integration Tests

Integration tests should be added for:
- [ ] Profile update endpoint
- [ ] Settings CRUD operations
- [ ] Data export generates valid ZIP
- [ ] Account deletion workflow (request, cancel, status)
- [ ] Grace period enforcement

## Future Enhancements

1. **Scheduled Deletion Processor**: Background job to execute scheduled deletions after grace period
2. **Email Notifications**: Send email when deletion is requested and before execution
3. **More Export Formats**: Support CSV, XML in addition to JSON
4. **Enhanced Export Data**: Include comments, votes, and submission history
5. **Profile Visibility Enforcement**: Implement "followers" visibility option
6. **Account Reactivation**: Allow users to log in during grace period to automatically cancel deletion

## Migration

To apply the database migrations:

```bash
# From the backend directory
migrate -path migrations -database "postgresql://..." up
```

Migration files:
- `000013_add_user_settings.up.sql`: Creates user_settings and account_deletions tables
- `000013_add_user_settings.down.sql`: Drops the tables

## API Rate Limits

| Endpoint | Rate Limit |
|----------|-----------|
| Update Profile | 20 per minute (default) |
| Update Settings | 20 per minute (default) |
| Export Data | 1 per hour |
| Request Deletion | 1 per hour |
| Cancel Deletion | 20 per minute (default) |
| Get Status | 20 per minute (default) |
