<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Mobile Comments UI Implementation](#mobile-comments-ui-implementation)
  - [Overview](#overview)
  - [Architecture](#architecture)
    - [Components](#components)
    - [Services](#services)
  - [Integration](#integration)
  - [User Flows](#user-flows)
    - [Creating a Top-Level Comment](#creating-a-top-level-comment)
    - [Replying to a Comment](#replying-to-a-comment)
    - [Voting on a Comment](#voting-on-a-comment)
    - [Expanding/Collapsing Threads](#expandingcollapsing-threads)
    - [Editing Own Comment](#editing-own-comment)
    - [Deleting Own Comment](#deleting-own-comment)
  - [Performance Optimizations](#performance-optimizations)
    - [1. Optimistic Updates](#1-optimistic-updates)
    - [2. React Query Caching](#2-react-query-caching)
    - [3. Memoized Callbacks](#3-memoized-callbacks)
    - [4. Efficient Rendering](#4-efficient-rendering)
    - [5. Pagination](#5-pagination)
  - [Styling](#styling)
  - [Accessibility](#accessibility)
  - [Error Handling](#error-handling)
  - [Testing Considerations](#testing-considerations)
    - [Manual Testing Checklist](#manual-testing-checklist)
    - [Performance Testing](#performance-testing)
  - [Future Enhancements](#future-enhancements)
  - [API Requirements](#api-requirements)
  - [Dependencies](#dependencies)
  - [Files Changed](#files-changed)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Mobile Comments UI Implementation"
summary: "This document describes the implementation of the comments UI for the mobile app, including threaded"
tags: ['mobile']
area: "mobile"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Mobile Comments UI Implementation

This document describes the implementation of the comments UI for the mobile app, including threaded replies, voting, and all supporting features.

## Overview

The comments system provides a comprehensive UI for users to read, write, and interact with comments on video clips. It includes:

- **Threaded replies** with nested comments up to 5 levels deep
- **Voting** with upvote/downvote functionality and optimistic UI updates
- **Sorting** options (best, new, top)
- **Pagination** with cursor-based infinite scroll
- **Comment moderation** states (removed, edited)
- **User actions** (reply, edit, delete) for own comments

## Architecture

### Components

#### 1. CommentList (`/components/CommentList.tsx`)

The main container component that manages the comments state and orchestrates all comment-related functionality.

**Features:**

- Fetches comments using React Query's `useInfiniteQuery` for pagination
- Manages sorting state (best/new/top)
- Handles collapse/expand state for comment threads
- Provides mutations for create, vote, update, and delete operations
- Implements optimistic updates for instant UI feedback
- Renders comment trees with proper nesting

**Props:**

```typescript
interface CommentListProps {
    clipId: string;           // ID of the clip to show comments for
    currentUserId?: string;   // Current user ID (for auth checks)
}
```

**Key Features:**

- **Optimistic Updates**: When voting or creating comments, the UI updates immediately before the server responds
- **Error Rollback**: If an operation fails, the UI reverts to the previous state
- **Pagination**: Uses cursor-based pagination with "Load More" button
- **Threading**: Renders nested comment trees recursively

#### 2. CommentItem (`/components/CommentItem.tsx`)

Renders a single comment with all its interactive elements.

**Features:**

- Displays comment metadata (username, timestamp, edited flag)
- Shows vote buttons with current score
- Provides reply, edit, and delete actions
- Handles collapse/expand for replies
- Inline editing with CommentComposer
- Visual indentation based on nesting depth

**Props:**

```typescript
interface CommentItemProps {
    comment: Comment;                           // The comment to render
    depth?: number;                             // Nesting depth (0-5)
    onVote: (id: string, vote: 1|-1|0) => void; // Vote handler
    onReply: (parentId: string, content: string) => void; // Reply handler
    onEdit?: (id: string, content: string) => void;       // Edit handler
    onDelete?: (id: string) => void;            // Delete handler
    onToggleReplies?: (id: string) => void;     // Expand/collapse handler
    isVoting?: boolean;                         // Loading state for votes
    isReplying?: boolean;                       // Loading state for replies
    showReplies?: boolean;                      // Whether replies are expanded
    currentUserId?: string;                     // For ownership checks
    maxDepth?: number;                          // Max nesting level (default: 5)
}
```

**Visual States:**

- Normal: Full comment display
- Removed: Shows "[removed]" with optional reason
- Editing: Shows CommentComposer inline
- Replying: Shows CommentComposer below comment

#### 3. CommentComposer (`/components/CommentComposer.tsx`)

Reusable input component for creating and editing comments.

**Features:**

- Multi-line text input with auto-resize
- Post/Cancel buttons
- Loading state during submission
- Keyboard handling for mobile
- Auto-focus option

**Props:**

```typescript
interface CommentComposerProps {
    onSubmit: (content: string) => void;  // Submit handler
    onCancel?: () => void;                 // Cancel handler
    isLoading?: boolean;                   // Loading state
    placeholder?: string;                  // Input placeholder
    initialValue?: string;                 // Pre-filled content (for editing)
    autoFocus?: boolean;                   // Auto-focus on mount
    showCancel?: boolean;                  // Show cancel button
}
```

#### 4. VoteButtons (`/components/VoteButtons.tsx`)

Reusable voting UI component used by both comments and clips.

**Features:**

- Upvote/downvote buttons
- Score display with color coding
- Loading state
- Two sizes: small (for comments) and medium (for clips)

**Props:**

```typescript
interface VoteButtonsProps {
    voteScore: number;                    // Current vote score
    userVote?: number | null;             // User's current vote (1, -1, null)
    onUpvote: () => void;                 // Upvote handler
    onDownvote: () => void;               // Downvote handler
    isLoading?: boolean;                  // Loading state
    size?: 'small' | 'medium';            // Size variant
}
```

### Services

#### Comment Service (`/services/comments.ts`)

API client for all comment-related operations.

**Endpoints:**

- `listComments(clipId, options)` - GET `/clips/:id/comments`
- `getReplies(commentId, options)` - GET `/comments/:id/replies`
- `createComment(clipId, input)` - POST `/clips/:id/comments`
- `updateComment(commentId, input)` - PUT `/comments/:id`
- `deleteComment(commentId)` - DELETE `/comments/:id`
- `voteOnComment(commentId, vote)` - POST `/comments/:id/vote`

**Types:**

```typescript
export type Comment = {
    id: string;
    clip_id: string;
    user_id: string;
    user: CommentUser;
    parent_comment_id?: string;
    content: string;
    vote_score: number;
    user_vote?: number | null;    // 1 = upvote, -1 = downvote, null = no vote
    reply_count?: number;
    is_edited: boolean;
    is_removed: boolean;
    removed_reason?: string;
    created_at: string;
    updated_at: string;
};
```

## Integration

The comments UI is integrated into the clip detail screen (`/app/clip/[id].tsx`):

```tsx
import { CommentList } from '@/components/CommentList';
import { useAuth } from '@/contexts/AuthContext';

// In the component:
const { user } = useAuth();

// In the render:
<CommentList clipId={id!} currentUserId={user?.id} />
```

## User Flows

### Creating a Top-Level Comment

1. User types comment in the composer at the top
2. User clicks "Post" button
3. Optimistic update: Comment appears immediately with "You" as username
4. API request sent to backend
5. On success: Real comment data replaces optimistic version
6. On error: Optimistic comment removed, error shown

### Replying to a Comment

1. User clicks "Reply" button on a comment
2. Reply composer appears below the comment
3. User types reply and clicks "Post"
4. Optimistic update: Reply appears in the list
5. API request sent with parent_comment_id
6. On success: Real reply data loaded
7. On error: Optimistic reply removed

### Voting on a Comment

1. User clicks upvote or downvote button
2. Optimistic update: Score changes immediately, button color updates
3. API request sent to backend
4. On success: Vote confirmed
5. On error: Vote reverted to previous state

### Expanding/Collapsing Threads

1. User clicks on "▶ N replies" button
2. Replies expand and button changes to "▼ N replies"
3. Clicking again collapses the thread
4. State managed locally for instant response

### Editing Own Comment

1. User clicks "•••" menu on own comment
2. User clicks "Edit"
3. Comment content replaced with CommentComposer
4. User modifies text and clicks "Post"
5. API request sent
6. On success: Updated content shown with "(edited)" badge
7. On error: Edit reverted

### Deleting Own Comment

1. User clicks "•••" menu on own comment
2. User clicks "Delete"
3. Confirmation alert shown
4. On confirm: API request sent
5. Comment removed from list
6. On error: Error message shown

## Performance Optimizations

### 1. Optimistic Updates

All mutations (create, vote, update, delete) use optimistic updates to provide instant feedback. If an operation fails, the UI rolls back to the previous state.

### 2. React Query Caching

Comments are cached by React Query with the key `['comments', clipId, sortBy]`. This means:

- Comments persist between navigations
- No unnecessary re-fetches
- Background updates when stale

### 3. Memoized Callbacks

All event handlers use `useCallback` to prevent unnecessary re-renders of child components.

### 4. Efficient Rendering

- Uses simple `View` instead of `FlatList` to avoid ScrollView nesting
- Comments render recursively only when expanded
- No virtualization needed for typical comment counts (< 100)

### 5. Pagination

Cursor-based pagination loads comments in batches (default 50) with a "Load More" button instead of infinite scroll to reduce memory usage.

## Styling

The UI uses NativeWind (Tailwind CSS) for styling:

- **Colors**: Primary blue (#0ea5e9) for interactive elements
- **Spacing**: Consistent padding and margins (p-2, p-3, p-4)
- **Typography**: Font sizes from text-xs to text-2xl
- **Layout**: Flexbox for all layouts
- **Indentation**: 16px per nesting level for threaded comments

## Accessibility

- TouchableOpacity with activeOpacity for visual feedback
- Clear visual hierarchy with font sizes and weights
- Color contrast meets WCAG AA standards
- Disabled states for loading operations

## Error Handling

All API operations include error handling:

- Network errors: Rolled back optimistically
- Auth errors: User prompted to log in
- Validation errors: Shown in UI
- Server errors: Generic error message

## Testing Considerations

### Manual Testing Checklist

- [ ] Create top-level comment
- [ ] Reply to a comment
- [ ] Reply to a reply (nested)
- [ ] Upvote a comment
- [ ] Downvote a comment
- [ ] Remove vote (toggle)
- [ ] Edit own comment
- [ ] Delete own comment
- [ ] Expand/collapse threads
- [ ] Sort by best/new/top
- [ ] Load more comments
- [ ] Error handling (network offline)
- [ ] Optimistic updates rollback

### Performance Testing

- Test with 100+ comments
- Test with deeply nested threads (5 levels)
- Test rapid voting (spam clicking)
- Test on slow network
- Monitor memory usage

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time updates**: Use WebSocket for live comment updates
2. **Mention system**: @username mentions with autocomplete
3. **Rich text**: Support for markdown or basic formatting
4. **Image/GIF support**: Inline media in comments
5. **Reactions**: Quick emoji reactions instead of just votes
6. **Sorting improvements**: Add "controversial" sort option
7. **User profiles**: Click username to view profile
8. **Report/flag**: Report inappropriate comments
9. **Pin comments**: Moderators can pin important comments
10. **Load on scroll**: Replace "Load More" with infinite scroll

## API Requirements

The backend must provide these endpoints:

- `GET /clips/:id/comments` - List comments (with sort, cursor, limit params)
- `POST /clips/:id/comments` - Create comment (requires auth)
- `GET /comments/:id/replies` - Get replies for a comment
- `PUT /comments/:id` - Update comment (requires auth, ownership)
- `DELETE /comments/:id` - Delete comment (requires auth, ownership)
- `POST /comments/:id/vote` - Vote on comment (requires auth)

## Dependencies

- `@tanstack/react-query` - Data fetching and caching
- `axios` - HTTP client
- `react-native` - Core mobile framework
- `expo-router` - Navigation
- `nativewind` - Tailwind CSS for React Native

## Files Changed

- `mobile/services/comments.ts` - New comment API service
- `mobile/components/CommentList.tsx` - New main comments component
- `mobile/components/CommentItem.tsx` - New single comment component
- `mobile/components/CommentComposer.tsx` - New comment input component
- `mobile/components/VoteButtons.tsx` - New voting UI component
- `mobile/app/clip/[id].tsx` - Updated to integrate CommentList
