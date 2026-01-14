# ModeratorManager Component

The `ModeratorManager` component provides a complete UI for managing channel moderators.

## Features

- ✅ List current moderators with pagination
- ✅ Search and filter moderators
- ✅ Add new moderators with user search
- ✅ Remove moderators with confirmation
- ✅ Edit moderator permissions (role updates)
- ✅ Loading states and error handling
- ✅ Responsive design
- ✅ Full accessibility (ARIA labels, keyboard navigation)
- ✅ TypeScript types
- ✅ Comprehensive unit tests (25 tests)

## Usage

```typescript
import { ModeratorManager } from '@/components/moderation';

function ChannelSettingsPage() {
  const channelId = 'channel-123';
  const canManage = true; // User has permission to manage moderators

  return (
    <div>
      <h1>Channel Settings</h1>
      <ModeratorManager 
        channelId={channelId}
        canManage={canManage}
      />
    </div>
  );
}
```

## Props

### `ModeratorManagerProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `channelId` | `string` | Yes | The ID of the channel to manage moderators for |
| `canManage` | `boolean` | No | Whether the current user can manage moderators. Default: `false` |

## API Integration

The component integrates with the following API endpoints:

- `GET /api/v1/moderation/moderators?channelId={id}` - List moderators
- `POST /api/v1/moderation/moderators` - Add a moderator
- `DELETE /api/v1/moderation/moderators/:id` - Remove a moderator
- `PATCH /api/v1/moderation/moderators/:id` - Update moderator permissions

## User Flow

1. **View Moderators**: Users see a paginated list of current moderators with their roles
2. **Search/Filter**: Users can search moderators by username or display name
3. **Add Moderator**: 
   - Click "Add Moderator" button
   - Search for user by username
   - Select user from suggestions
   - Confirm to add as moderator
4. **Remove Moderator**:
   - Click "Remove" button next to a moderator
   - Confirm removal in dialog
5. **Edit Permissions**:
   - Click "Edit" button next to a moderator
   - Select new role (moderator or admin)
   - Confirm changes

## Accessibility

- **ARIA Labels**: All interactive elements have descriptive ARIA labels
- **Keyboard Navigation**: Full keyboard support for all actions
- **Screen Reader Support**: Proper semantic HTML and ARIA attributes
- **Focus Management**: Modal dialogs trap focus appropriately
- **Role Attributes**: Proper use of table, dialog, and alert roles

## Testing

The component has 25 unit tests covering:
- Rendering and display states
- User interactions (add, remove, edit)
- Search and filtering
- Pagination
- Error handling
- Accessibility features

Run tests with:
```bash
npm test -- ModeratorManager.test.tsx
```

## Design Patterns

- Uses existing UI components (Button, Modal, Card, etc.)
- Follows React hooks best practices
- Implements proper loading and error states
- Responsive design with Tailwind CSS
- TypeScript for type safety
