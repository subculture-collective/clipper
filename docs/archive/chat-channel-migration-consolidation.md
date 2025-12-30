# Chat Channel Migration Consolidation

## Overview

This document describes the resolution of migration collisions and consolidation of chat channel CRUD functionality that occurred when PRs #746, #747, and #749 were merged.

## Migration Collision Resolution

### Problem

Two migrations had the same number (000068):
- `000068_add_twitch_auth` - Twitch OAuth integration
- `000068_add_watch_parties` - Watch party functionality

This would cause migration failures on deployment.

### Solution

Renumbered migrations to eliminate collisions:

| Old Number | Migration Name | New Number |
|------------|----------------|------------|
| 000068 | add_twitch_auth | 000068 (kept) |
| 000068 | add_watch_parties | **000075** |
| 000070 | add_user_presence | **000076** |
| 000071 | add_watch_party_chat | **000077** |
| 000072 | add_watch_party_settings | **000078** |
| 000073 | add_watch_party_analytics | **000079** |
| 000074 | add_forum_hierarchical_support | **000080** |

### New Migration Added

**000070_add_channel_members** - Tracks channel membership and roles

This migration was missing from the original PRs and is now properly sequenced.

## Migration Sequence (Final)

```
...
000063 - add_watch_history
000064 - add_playlist_sharing
000065 - add_streams_and_sessions
000066 - add_clip_stream_support
000067 - add_stream_follows
000068 - add_twitch_auth
000069 - add_forum_moderation
000070 - add_channel_members (NEW)
000075 - add_watch_parties
000076 - add_user_presence
000077 - add_watch_party_chat
000078 - add_watch_party_settings
000079 - add_watch_party_analytics
000080 - add_forum_hierarchical_support
```

## Channel CRUD Consolidation

### Updated Functionality

#### 1. CreateChannel (Enhanced)

- **Old**: Simple insert of channel record
- **New**: Transaction-based creation
  - Creates channel record
  - Automatically adds creator as channel owner in `channel_members`
  - Ensures atomic operation

#### 2. DeleteChannel (New)

- Allows channel creators/owners to delete their channels
- Cascades to remove all related records (messages, bans, members, etc.)
- Proper authorization checks

#### 3. Channel Member Management (New)

##### AddChannelMember

- Add users to channels with specific roles
- Roles: `owner`, `admin`, `moderator`, `member`
- Permission checks:
  - Only staff (owner/admin/moderator) can add members
  - Only owner can add admins or moderators
- Rate limited: 20 requests/minute

##### RemoveChannelMember

- Remove members from channels
- Users can remove themselves (except owners)
- Permission checks:
  - Only owner/admin can remove other members
  - Cannot remove the owner
  - Only owner can remove admins
- Rate limited: 20 requests/minute

##### ListChannelMembers

- List all members of a channel with their roles
- Includes user information (username, display name, avatar)
- Paginated (limit/offset)

##### UpdateChannelMemberRole

- Update a member's role in the channel
- Only owner can change roles
- Cannot change owner role
- Rate limited: 20 requests/minute

## API Routes

### New Routes Added

```
DELETE /api/v1/chat/channels/:id
  - Delete a channel (owner only)

GET /api/v1/chat/channels/:id/members
  - List channel members

POST /api/v1/chat/channels/:id/members
  - Add member to channel
  Body: { "user_id": "uuid", "role": "member|moderator|admin" }

DELETE /api/v1/chat/channels/:id/members/:user_id
  - Remove member from channel

PATCH /api/v1/chat/channels/:id/members/:user_id
  - Update member role
  Body: { "role": "member|moderator|admin" }
```

## Database Schema

### channel_members Table

```sql
CREATE TABLE channel_members (
    id UUID PRIMARY KEY,
    channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    invited_by UUID REFERENCES users(id),
    UNIQUE(channel_id, user_id)
);
```

### Indexes

- `idx_channel_members_channel` - (channel_id, role)
- `idx_channel_members_user` - (user_id)
- `idx_channel_members_joined` - (joined_at DESC)

## Testing

All existing tests pass, plus new tests added:
- `TestAddChannelMember_Unauthorized`
- `TestRemoveChannelMember_InvalidChannelID`
- `TestDeleteChannel_Unauthorized`

## Migration Instructions

### For Fresh Deployments

Simply run migrations in order. The sequence is now clean with no collisions.

### For Existing Deployments

If migrations 000068-000074 have already been applied:

1. This is a schema-compatible change - the renumbered migrations have the same content
2. The migration tool may try to reapply them (check your migration tracking)
3. Recommended approach:
   - Backup database
   - Update migration version tracking to match new numbers
   - Apply only the new 000070_add_channel_members migration
   - No data migration needed

## Security Considerations

1. **Authorization**: All member management operations check permissions
2. **Rate Limiting**: All write operations are rate limited
3. **Role Hierarchy**: Owner > Admin > Moderator > Member
4. **Ownership Protection**: Owners cannot be removed or have their role changed

## Breaking Changes

None. All changes are additive or internal refactoring.

## Related PRs

- PR #746: Added user presence (migration 000070 → 000076)
- PR #747: Intended to add channel members (migration was missing)
- PR #749: Added watch party chat (migration 000071 → 000077)
