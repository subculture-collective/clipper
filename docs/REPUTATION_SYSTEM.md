# User Reputation System

This document describes the implementation of the user reputation system in Clipper, including karma, badges, ranks, and leaderboards.

## Overview

The reputation system is designed to encourage quality contributions and community engagement through a gamified experience similar to Reddit's karma system. Users earn reputation through positive interactions and unlock features at various karma thresholds.

## Database Schema

### Tables

#### `user_badges`

Stores badge assignments to users.

- `id` - Unique badge assignment ID
- `user_id` - User who owns the badge
- `badge_id` - Badge type identifier
- `awarded_at` - When the badge was awarded
- `awarded_by` - User who awarded the badge (NULL for automatic)

#### `karma_history`

Tracks all karma changes for auditing and analytics.

- `id` - Unique history entry ID
- `user_id` - User whose karma changed
- `amount` - Karma change amount (positive or negative)
- `source` - Source of karma change (e.g., 'clip_vote', 'comment_vote')
- `source_id` - ID of the related entity (clip ID, comment ID, etc.)
- `created_at` - When the karma change occurred

#### `user_stats`

Stores calculated user statistics and scores.

- `user_id` - User ID (primary key)
- `trust_score` - Trust score (0-100)
- `engagement_score` - Engagement score
- `total_comments` - Total comments posted
- `total_votes_cast` - Total votes cast
- `total_clips_submitted` - Total clips submitted
- `correct_reports` - Number of correct reports
- `incorrect_reports` - Number of incorrect reports
- `days_active` - Number of days user has been active
- `last_active_date` - Last date user was active
- `updated_at` - Last update timestamp

### Database Functions

#### `update_user_karma(user_id, amount, source, source_id)`

Updates a user's karma and creates a history entry atomically.

#### `calculate_trust_score(user_id)`

Calculates trust score (0-100) based on:

- Account age (max 20 points)
- Karma amount (max 40 points)
- Report accuracy (max 20 points)
- Activity level (max 20 points)
- Penalty for banned users (50% reduction)

#### `calculate_engagement_score(user_id)`

Calculates engagement score based on activity:

- Comments: 2 points each
- Votes: 1 point each
- Clip submissions: 5 points each
- Days active: 3 points each

#### `get_user_rank(karma)`

Returns rank name based on karma:

- 0-99: Newcomer
- 100-499: Member
- 500-999: Regular
- 1,000-4,999: Contributor
- 5,000-9,999: Veteran
- 10,000+: Legend

### Database Triggers

#### Automatic Karma Updates

Triggers automatically update karma when votes are added, changed, or removed:

- `trigger_award_karma_on_clip_vote` - Awards karma for clip votes
- `trigger_award_karma_on_comment_vote` - Awards karma for comment votes

## API Endpoints

### Public Endpoints

#### Get User Reputation

```
GET /api/v1/users/:id/reputation
```

Returns complete reputation information for a user including karma, rank, trust score, engagement score, badges, and stats.

**Response:**

```json
{
  "user_id": "uuid",
  "username": "string",
  "display_name": "string",
  "avatar_url": "string",
  "karma_points": 1234,
  "rank": "Contributor",
  "trust_score": 85,
  "engagement_score": 5678,
  "badges": [...],
  "stats": {...},
  "created_at": "timestamp"
}
```

#### Get User Karma

```
GET /api/v1/users/:id/karma?limit=50
```

Returns karma breakdown and history.

**Response:**

```json
{
  "breakdown": {
    "clip_karma": 500,
    "comment_karma": 734,
    "total_karma": 1234
  },
  "history": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "amount": 1,
      "source": "comment_vote",
      "source_id": "uuid",
      "created_at": "timestamp"
    }
  ]
}
```

#### Get User Badges

```
GET /api/v1/users/:id/badges
```

Returns all badges awarded to a user with full definitions.

**Response:**

```json
{
  "badges": [
    {
      "id": "uuid",
      "badge_id": "veteran",
      "awarded_at": "timestamp",
      "awarded_by": "uuid",
      "name": "Veteran",
      "description": "Member for over 1 year",
      "icon": "🏆",
      "category": "achievement"
    }
  ]
}
```

#### Get Leaderboard

```
GET /api/v1/leaderboards/:type?limit=50&page=1
```

Returns leaderboard by type (karma or engagement).

**Types:**

- `karma` - Top users by karma points
- `engagement` - Top users by engagement score

**Response:**

```json
{
  "type": "karma",
  "page": 1,
  "limit": 50,
  "entries": [
    {
      "rank": 1,
      "user_id": "uuid",
      "username": "string",
      "display_name": "string",
      "avatar_url": "string",
      "score": 10000,
      "user_rank": "Legend"
    }
  ]
}
```

#### Get Badge Definitions

```
GET /api/v1/badges
```

Returns all available badge definitions.

### Admin Endpoints

#### Award Badge

```
POST /api/v1/admin/users/:id/badges
```

Awards a badge to a user (admin/moderator only).

**Request Body:**

```json
{
  "badge_id": "early_adopter"
}
```

#### Remove Badge

```
DELETE /api/v1/admin/users/:id/badges/:badgeId
```

Removes a badge from a user (admin/moderator only).

## Badge System

### Badge Categories

#### Achievement Badges

Automatically awarded based on user activity:

- **Veteran** (🏆) - Member for over 1 year
- **Influencer** (⭐) - Earned 10,000+ karma
- **Trusted User** (✅) - Earned 1,000+ karma
- **Conversationalist** (💬) - Posted 100+ comments
- **Curator** (👍) - Cast 1,000+ votes
- **Submitter** (📹) - Submitted 50+ clips

#### Staff Badges

Manually awarded by admins:

- **Moderator** (🛡️) - Community moderator
- **Admin** (👑) - Site administrator
- **Developer** (💻) - Platform developer

#### Special Badges

Manually awarded for special events:

- **Early Adopter** (🚀) - Joined during beta
- **Beta Tester** (🧪) - Participated in beta testing

#### Supporter Badges

Manually awarded for financial support:

- **Supporter** (❤️) - Financial supporter

### Badge Awarding

Badges can be awarded in two ways:

1. **Automatic** - System automatically checks and awards achievement badges when criteria are met
2. **Manual** - Admins can award any badge to any user via the admin API

## Karma System

### Karma Sources

Users earn karma from:

- **Clip votes** - +1 for upvote, -1 for downvote (on their submitted clips)
- **Comment votes** - +1 for upvote, -1 for downvote (on their comments)

### Karma Permissions

Certain actions require minimum karma:

- **10 karma** - Create tags
- **50 karma** - Report content
- **100 karma** - Submit clips
- **500 karma** - Nominate featured clips

These thresholds are checked using the `CanUserPerformAction()` function in the reputation service.

## Rank System

Users are automatically assigned ranks based on their total karma:

| Karma Range | Rank | Description |
|------------|------|-------------|
| 0-99 | Newcomer | New to the community |
| 100-499 | Member | Regular member |
| 500-999 | Regular | Active contributor |
| 1,000-4,999 | Contributor | Valued contributor |
| 5,000-9,999 | Veteran | Long-time contributor |
| 10,000+ | Legend | Top contributor |

Ranks are calculated dynamically using the `get_user_rank()` database function.

## Trust Score

Trust score (0-100) is calculated based on multiple factors:

- Account age (older accounts score higher)
- Karma amount (more karma = higher score)
- Report accuracy (correct reports boost score)
- Activity level (comments, votes, submissions)
- Moderation history (bans reduce score)

Trust score can be used for:

- Content filtering (hiding low-trust spam)
- Moderation weight (high-trust users' reports valued more)
- Feature unlocking

## Engagement Score

Engagement score measures user activity:

- Comments posted (2 points each)
- Votes cast (1 point each)
- Clips submitted (5 points each)
- Days active (3 points each)

Higher engagement scores indicate more active community members.

## Usage Examples

### Check if User Can Perform Action

```go
canCreateTags := services.CanUserPerformAction(user.KarmaPoints, "create_tags")
if !canCreateTags {
    return errors.New("insufficient karma to create tags")
}
```

### Award Badge Manually

```go
err := reputationService.AwardBadge(ctx, userID, "beta_tester", &adminID)
```

### Check and Award Automatic Badges

```go
awardedBadges, err := reputationService.CheckAndAwardBadges(ctx, userID)
// Returns list of newly awarded badge IDs
```

### Update User Activity

```go
// When user posts a comment
err := reputationService.IncrementUserActivity(ctx, userID, "comment", 1)

// When user casts a vote
err := reputationService.IncrementUserActivity(ctx, userID, "vote", 1)

// When user submits a clip
err := reputationService.IncrementUserActivity(ctx, userID, "submission", 1)
```

## Testing

The reputation system includes comprehensive unit tests:

```bash
# Run all tests
go test ./internal/services/reputation_service_test.go

# Test coverage includes:
# - Rank calculation
# - Badge validation
# - Permission checks
# - Badge definitions
```

## Future Enhancements

Potential future improvements:

- Weighted karma (recent activity weighted higher)
- Time decay (older karma worth less)
- Quality bonuses for top comments
- Vote weight for high-karma users
- Monthly MVP recognition
- Activity heatmaps
- Karma trends over time
- Notification system for milestones
- Profile customization (badge ordering, visibility settings)
