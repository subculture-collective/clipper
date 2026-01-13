# Ban List Viewer Component

## Overview

The `BanListViewer` component provides a comprehensive interface for viewing and managing channel bans. It includes filtering, sorting, pagination, and ban revocation capabilities.

## Usage

### Basic Usage

```tsx
import { BanListViewer } from '@/components/moderation';

function ChannelModerationPage({ channelId }) {
  return (
    <div>
      <BanListViewer channelId={channelId} />
    </div>
  );
}
```

### With Management Permissions

```tsx
import { BanListViewer } from '@/components/moderation';

function ChannelModerationPage({ channelId, canManage }) {
  return (
    <div>
      <BanListViewer 
        channelId={channelId} 
        canManage={canManage}  // Enables revoke ban functionality
      />
    </div>
  );
}
```

## Features

### Filtering
- **User**: Filter by username
- **Reason**: Filter by ban reason
- **Date Range**: Filter by date from/to
- **Status**: Filter by active, expired, or all bans

### Sorting
Click on column headers to sort by:
- Username
- Banned At (created date)
- Expires At (expiration date)

Click again to toggle between ascending/descending order.

### Pagination
Automatically handles pagination for large ban lists (50 items per page).

### Actions
- **View Details**: Click "Details" to see full ban information in a modal
- **Revoke Ban** (if `canManage` is true): Click "Revoke" to unban a user with confirmation
- **Export to CSV**: Export the current filtered/sorted ban list to CSV

### Ban Status
- **Active**: Ban is currently in effect
- **Expired**: Ban has expired
- **Permanent**: Ban has no expiration date

## API Integration

The component uses the following API endpoint:
- `GET /chat/channels/:channelId/bans` - Fetches channel bans

And for revoking:
- `DELETE /chat/channels/:channelId/ban/:userId` - Revokes a ban

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `channelId` | `string` | *required* | The ID of the channel to view bans for |
| `canManage` | `boolean` | `false` | Whether the user can revoke bans |

## Accessibility

The component includes:
- ARIA labels on all interactive elements
- Semantic HTML with proper table structure
- Keyboard navigation support
- Screen reader friendly

## Dark Mode

The component fully supports dark mode with appropriate color schemes.

## Example Integration

```tsx
// In an admin moderation page
import { useState } from 'react';
import { BanListViewer } from '@/components/moderation';

export default function ChannelBansPage() {
  const [channelId] = useState('channel-123');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Channel Bans
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage banned users
          </p>
        </div>

        <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
          <BanListViewer 
            channelId={channelId} 
            canManage={true}
          />
        </div>
      </div>
    </div>
  );
}
```

## Testing

The component includes comprehensive tests covering:
- Rendering and display
- Filtering by all criteria
- Sorting functionality
- Pagination
- Revoke ban workflow
- View details modal
- Error handling
- Accessibility
- Export to CSV

Run tests with:
```bash
npm test -- BanListViewer.test.tsx
```
