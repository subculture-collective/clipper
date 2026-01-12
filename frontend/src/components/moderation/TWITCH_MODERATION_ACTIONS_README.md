# Twitch Moderation Actions Component

## Overview

The `TwitchModerationActions` component provides ban/unban functionality for Twitch channels. It integrates with the Twitch moderation API endpoints and provides proper permission gating, loading states, and error handling.

## Features

- ✅ **Permission Gating**: Only visible to broadcaster or Twitch-recognized moderators
- ✅ **Site Moderators View-Only**: Site moderators cannot perform Twitch actions
- ✅ **Optimistic Loading States**: Clear visual feedback during API calls
- ✅ **Structured Error Handling**: Specific error messages for scope, rate-limit, and unknown errors
- ✅ **Ban Types**: Supports both permanent bans and temporary timeouts
- ✅ **Confirmation Modals**: Prevents accidental actions
- ✅ **Accessibility**: ARIA labels and keyboard navigation

## Usage

### Basic Example

```tsx
import { TwitchModerationActions } from '@/components/moderation';

function UserCard({ user, channelId }) {
  const { user: currentUser } = useAuth();
  
  // Determine permissions
  const isBroadcaster = currentUser?.twitch_id === channelId;
  const isTwitchModerator = false; // Fetch from Twitch API or context
  
  return (
    <div>
      <h3>{user.username}</h3>
      
      <TwitchModerationActions
        broadcasterID={channelId}
        userID={user.twitch_id}
        username={user.username}
        isBanned={user.is_banned_on_twitch}
        isBroadcaster={isBroadcaster}
        isTwitchModerator={isTwitchModerator}
        onSuccess={() => {
          // Refresh user data or show notification
          console.log('Action completed successfully');
        }}
      />
    </div>
  );
}
```

### With Channel Context

```tsx
import { TwitchModerationActions } from '@/components/moderation';

function ChannelModerationPanel({ channelId }) {
  const { user } = useAuth();
  const [targetUser, setTargetUser] = useState(null);
  
  // Check if current user is broadcaster
  const isBroadcaster = user?.twitch_id === channelId;
  
  // Fetch Twitch moderators for this channel
  // This would come from your backend/Twitch API
  const { data: moderators } = useQuery(['channel-moderators', channelId], () =>
    fetchChannelModerators(channelId)
  );
  
  const isTwitchModerator = moderators?.some(mod => mod.user_id === user?.twitch_id);
  
  return (
    <div>
      {targetUser && (
        <TwitchModerationActions
          broadcasterID={channelId}
          userID={targetUser.twitch_id}
          username={targetUser.username}
          isBroadcaster={isBroadcaster}
          isTwitchModerator={isTwitchModerator}
          onSuccess={() => {
            // Refresh data
            queryClient.invalidateQueries(['banned-users', channelId]);
          }}
        />
      )}
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `broadcasterID` | `string` | Yes | Twitch broadcaster ID (channel ID) |
| `userID` | `string` | Yes | Twitch user ID to ban/unban |
| `username` | `string` | No | Username for display purposes |
| `isBanned` | `boolean` | No | Whether the user is currently banned (default: `false`) |
| `isBroadcaster` | `boolean` | No | Whether the current user is the broadcaster (default: `false`) |
| `isTwitchModerator` | `boolean` | No | Whether the current user is a Twitch-recognized moderator (default: `false`) |
| `onSuccess` | `() => void` | No | Callback when action completes successfully |

## Permission Model

The component will only render if the current user is either:
- The broadcaster (`isBroadcaster === true`), OR
- A Twitch-recognized moderator (`isTwitchModerator === true`)

Site moderators who are not also broadcaster or Twitch moderator are view-only and will not see the component. However, if a site moderator is also the broadcaster or a Twitch moderator, they can perform Twitch moderation actions.

## Error Handling

The component handles the following error codes from the backend:

- `SITE_MODERATORS_READ_ONLY`: Site moderators cannot perform Twitch actions
- `NOT_AUTHENTICATED`: User not authenticated with Twitch
- `INSUFFICIENT_SCOPES`: Missing required OAuth scopes
- `NOT_BROADCASTER`: Only broadcaster can perform this action
- `RATE_LIMIT_EXCEEDED`: Too many requests, please wait

All errors are displayed in an Alert component within the modal.

## Ban Types

### Permanent Ban

Prevents the user from chatting indefinitely until unbanned.

```tsx
// User selects "Permanent Ban" in the modal
// API call: { broadcasterID, userID, reason, duration: undefined }
```

### Timeout (Temporary Ban)

Prevents the user from chatting for a specified duration.

```tsx
// User selects "Timeout" and enters duration in seconds
// API call: { broadcasterID, userID, reason, duration: 300 }
// Duration range: 1 - 1,209,600 seconds (14 days max)
```

## Styling

The component uses:
- Existing UI components (`Button`, `Modal`, `Alert`, `Input`, `TextArea`)
- Theme-aware classes (dark mode support)
- Lucide icons for visual consistency

## Testing

Comprehensive tests are available in `TwitchModerationActions.test.tsx`:

```bash
npm test -- TwitchModerationActions.test.tsx
```

Tests cover:
- Permission gating logic
- Ban/unban functionality
- Error handling for all error codes
- Modal behavior
- Form validation
- Loading states

## API Integration

The component uses the following API functions from `moderation-api.ts`:

- `banUserOnTwitch(request: TwitchBanRequest): Promise<TwitchBanResponse>`
- `unbanUserOnTwitch(request: TwitchUnbanRequest): Promise<TwitchUnbanResponse>`

Backend endpoints:
- `POST /api/v1/moderation/twitch/ban`
- `DELETE /api/v1/moderation/twitch/ban?broadcasterID=...&userID=...`

## Notes

- The component is completely self-contained and manages its own modal state
- It does not make assumptions about where Twitch moderator data comes from
- The parent component is responsible for determining `isBroadcaster` and `isTwitchModerator`
- The parent should refresh relevant data in the `onSuccess` callback

## Future Enhancements

Potential improvements:
- Auto-fetch Twitch moderator status from backend
- Support for ban/unban reasons from a predefined list
- Integration with Twitch moderator management UI
- Batch ban/unban operations
- Ban history/audit log integration
