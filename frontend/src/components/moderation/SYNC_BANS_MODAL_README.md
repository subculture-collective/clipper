# SyncBansModal Component

## Overview

The `SyncBansModal` component provides a user interface for synchronizing bans from a Twitch channel to the local ban list. It features a multi-step process with confirmation, progress tracking, and result summary.

## Features

- **Channel Selection**: Input field for specifying the Twitch channel name
- **User Confirmation**: Confirmation dialog before initiating the sync
- **Progress Tracking**: Real-time progress indicator with polling
- **Result Summary**: Displays counts of bans added, existing, and total processed
- **Error Handling**: Graceful error handling with user-friendly messages
- **Async Job Support**: Polls for job completion status

## Usage

```tsx
import { SyncBansModal } from '@/components/moderation';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const channelId = 'my-channel-id';

  const handleSuccess = () => {
    console.log('Sync completed successfully!');
    // Optionally refresh ban list
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Sync Bans from Twitch
      </button>
      
      <SyncBansModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        channelId={channelId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | Yes | Controls the modal visibility |
| `onClose` | `() => void` | Yes | Callback when modal should close |
| `channelId` | `string` | Yes | The ID of the channel to sync bans to |
| `onSuccess` | `() => void` | No | Callback when sync completes successfully |

## API Integration

The component uses the following API functions from `@/lib/chat-api`:

- `syncBansFromTwitch(channelId, { channel_name })` - Initiates the sync job
- `checkSyncBansProgress(channelId, jobId)` - Polls for job status and progress

### API Response Types

#### SyncBansFromTwitchResponse
```typescript
{
  job_id: string;
  status: string;
  message?: string;
}
```

#### SyncBansProgressResponse
```typescript
{
  job_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  bans_added: number;
  bans_existing: number;
  total_processed: number;
  error?: string;
}
```

## User Flow

1. **Initial Form**: User enters the Twitch channel name
2. **Confirmation**: User confirms the sync operation with details about what will happen
3. **Progress**: Shows a loading indicator and polls for progress every 2 seconds
4. **Completion**: Displays a summary of the sync results
5. **Success Callback**: Calls `onSuccess()` after 2 seconds delay (if provided)

## Error States

The component handles the following error scenarios:

- Empty channel name validation
- API call failures during sync initiation
- Progress check failures
- Sync job failures (from backend)

All errors are displayed using the `Alert` component with appropriate styling.

## Accessibility

- Modal has proper ARIA attributes
- Form inputs have associated labels
- Buttons have clear, descriptive text
- Loading states disable interactive elements
- Modal prevents closure during active sync

## Testing

The component has comprehensive test coverage including:

- Rendering and visibility
- Form validation
- Confirmation flow
- Progress tracking
- Completion handling
- Error scenarios
- Modal behavior
- Accessibility features

Run tests with:
```bash
npm test -- SyncBansModal.test.tsx
```

## Backend Requirements

The backend must implement the following endpoints:

- `POST /api/v1/chat/channels/:channelId/sync-bans` - Initiates sync
- `GET /api/v1/chat/channels/:channelId/sync-bans/:jobId` - Gets sync progress

The sync job should:
1. Connect to Twitch API
2. Fetch all banned users from the specified channel
3. Import bans to local database
4. Track progress and update job status
5. Return summary with counts

## Future Enhancements

Potential improvements:

- Support for selecting from a list of authenticated Twitch channels
- Filtering options (e.g., only permanent bans, only recent bans)
- Scheduled sync jobs
- Sync history/audit log
- Bi-directional sync (local to Twitch)
- Conflict resolution options
