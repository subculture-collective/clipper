# Chat UI & Channel Interface

This directory contains the comprehensive chat UI implementation for the Clipper platform, featuring live messaging, channel management, and real-time updates.

## Features

### Core Features
- ✅ Real-time messaging via WebSocket
- ✅ Channel list sidebar with search
- ✅ Active channel indicator
- ✅ Message history with infinite scroll
- ✅ Auto-scroll to bottom for new messages
- ✅ Mobile-responsive layout
- ✅ Dark mode support

### Message Features
- ✅ User avatars with online status
- ✅ User mentions (@username) with autocomplete
- ✅ Link previews for URLs
- ✅ Code block formatting (inline and multi-line)
- ✅ Emoji picker
- ✅ Typing indicators
- ✅ Message timestamps

### Advanced Features
- ✅ Desktop notifications for mentions
- ✅ Virtual scrolling for 1000+ messages
- ✅ Keyboard navigation (Enter to send, Shift+Enter for new line)
- ✅ Unread message badges
- ✅ Connection status indicator

## Components

### ChatPage
Main page component that manages the overall chat layout.

**Location:** `src/pages/ChatPage.tsx`

**Features:**
- Fetches and manages channel list
- Handles channel selection
- Mobile sidebar toggle
- Error handling with fallback to mock data in development

### ChannelSidebar
Displays the list of available channels with search functionality.

**Location:** `src/components/chat/ChannelSidebar.tsx`

**Props:**
- `channels`: Array of Channel objects
- `selectedChannel`: Currently selected channel ID
- `onSelectChannel`: Callback when channel is selected

**Features:**
- Search/filter channels
- Unread message badges
- Active channel highlighting
- Responsive design

### ChatView
Main chat interface for a specific channel.

**Location:** `src/components/chat/ChatView.tsx`

**Props:**
- `channelId`: ID of the channel to display
- `channelName`: Optional display name for the channel

**Features:**
- WebSocket connection management
- Desktop notification toggle
- Connection status indicator
- Message list and composer integration

### MessageList
Scrollable container for displaying messages.

**Location:** `src/components/chat/MessageList.tsx`

**Props:**
- `messages`: Array of ChatMessage objects
- `loading`: Loading state
- `onLoadMore`: Callback for loading more messages
- `hasMore`: Whether more messages are available

**Features:**
- Auto-scroll to bottom
- Infinite scroll support
- Maintains scroll position when loading more
- Empty state

### MessageItem
Individual message display component.

**Location:** `src/components/chat/MessageItem.tsx`

**Props:**
- `message`: ChatMessage object

**Features:**
- Avatar display
- Username and timestamp
- Deleted message handling
- Hover effects

### MessageContent
Parses and renders message content with rich formatting.

**Location:** `src/components/chat/MessageContent.tsx`

**Props:**
- `content`: Raw message content string

**Features:**
- @mention highlighting
- URL link preview
- Inline code blocks with `backticks`
- Multi-line code blocks with ```triple backticks```

### MessageComposer
Input component for composing messages.

**Location:** `src/components/chat/MessageComposer.tsx`

**Props:**
- `onSend`: Callback when message is sent
- `onTyping`: Callback when user is typing
- `placeholder`: Input placeholder text
- `disabled`: Disable input

**Features:**
- Auto-resizing textarea
- Emoji picker
- @mention autocomplete
- Keyboard shortcuts (Enter/Shift+Enter)
- Typing indicator emission

### EmojiPicker
Emoji selection component.

**Location:** `src/components/chat/EmojiPicker.tsx`

**Props:**
- `onSelect`: Callback when emoji is selected

**Features:**
- Common emoji grid
- Click outside to close
- Accessible with aria-labels

### TypingIndicator
Shows who is currently typing.

**Location:** `src/components/chat/TypingIndicator.tsx`

**Props:**
- `channelId`: Channel ID
- `typingUsers`: Array of usernames currently typing

**Features:**
- Animated dots
- Smart user display (1 user, 2 users, 3+ users)

### LinkPreview
Displays preview for URLs in messages.

**Location:** `src/components/chat/LinkPreview.tsx`

**Props:**
- `url`: URL to preview

**Features:**
- Metadata fetching (title, description, image)
- Fallback to simple link display
- External link indicator

### EmptyState
Placeholder shown when no channel is selected.

**Location:** `src/components/chat/EmptyState.tsx`

**Features:**
- Friendly messaging
- Icon display

## Hooks

### useChatWebSocket
Manages WebSocket connection for a chat channel.

**Location:** `src/hooks/useChatWebSocket.ts`

**Parameters:**
```typescript
{
  channelId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (username: string) => void;
}
```

**Returns:**
```typescript
{
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  sendTyping: () => void;
  isConnected: boolean;
  error: string | null;
}
```

**Features:**
- Auto-connect/reconnect
- Message history on connect
- Typing indicator emission
- Error handling

### useDesktopNotifications
Manages desktop notifications.

**Location:** `src/hooks/useDesktopNotifications.ts`

**Returns:**
```typescript
{
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: NotificationOptions) => void;
  isSupported: boolean;
}
```

**Features:**
- Permission management
- Notification display
- Auto-close after 5 seconds
- Click to focus window

## Types

### Channel
```typescript
interface Channel {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  channel_type: 'public' | 'private' | 'direct';
  is_active: boolean;
  max_participants?: number;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}
```

### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  content: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
  timestamp: string;
}
```

## Usage

### Basic Usage
```tsx
import { ChatPage } from '@/pages/ChatPage';

// In your router
<Route path="/chat" element={<ChatPage />} />
```

### Using Individual Components
```tsx
import { ChannelSidebar, ChatView } from '@/components/chat';

function MyChat() {
  const [selectedChannel, setSelectedChannel] = useState('general');
  
  return (
    <div className="flex h-screen">
      <ChannelSidebar
        channels={channels}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
      />
      <ChatView channelId={selectedChannel} />
    </div>
  );
}
```

### Using WebSocket Hook
```tsx
import { useChatWebSocket } from '@/hooks/useChatWebSocket';

function MyComponent() {
  const { messages, sendMessage, isConnected } = useChatWebSocket({
    channelId: 'general',
    onMessage: (msg) => console.log('New message:', msg),
  });
  
  return (
    <div>
      {messages.map(msg => <div key={msg.id}>{msg.content}</div>)}
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  );
}
```

## WebSocket Protocol

The chat system expects the following WebSocket message format:

### Client → Server

**Send Message:**
```json
{
  "type": "message",
  "content": "Hello world"
}
```

**Typing Indicator:**
```json
{
  "type": "typing"
}
```

### Server → Client

**New Message:**
```json
{
  "type": "message",
  "data": {
    "id": "msg_123",
    "channel_id": "general",
    "user_id": "user_456",
    "username": "john_doe",
    "content": "Hello world",
    "created_at": "2025-01-01T00:00:00Z",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**Message History:**
```json
{
  "type": "history",
  "data": {
    "messages": [/* array of messages */]
  }
}
```

**Typing Notification:**
```json
{
  "type": "typing",
  "data": {
    "username": "john_doe"
  }
}
```

## Testing

### Unit Tests
```bash
npm test -- MessageContent.test.tsx
npm test -- MessageItem.test.tsx
npm test -- ChannelSidebar.test.tsx
npm test -- TypingIndicator.test.tsx
npm test -- EmptyState.test.tsx
```

### E2E Tests
```bash
npm run test:e2e -- chat.spec.ts
```

## Performance Considerations

### Virtual Scrolling
The MessageList component implements basic virtual scrolling to handle 1000+ messages efficiently:
- Only visible messages are rendered
- Scroll position is maintained when loading more messages
- Auto-scroll only when user is at bottom

### Message Rendering
- Target: < 16ms per render (60fps)
- Uses React.memo for message components
- Efficient re-render prevention

### WebSocket
- Target: < 100ms message send latency
- Auto-reconnect on disconnect
- Throttled typing indicators (max once per 3 seconds)

## Accessibility

- ✅ Keyboard navigation support
- ✅ ARIA labels on interactive elements
- ✅ Focus management for modals
- ✅ Screen reader friendly
- ✅ Sufficient color contrast (WCAG AA)

## Browser Support

- Modern browsers with WebSocket support
- Desktop notifications require user permission
- Graceful degradation for unsupported features

## Future Enhancements

- [ ] Rich text editor
- [ ] File upload support
- [ ] Message reactions
- [ ] Thread replies
- [ ] Message search
- [ ] User presence indicators
- [ ] Read receipts
- [ ] Message editing
- [ ] Message pinning
- [ ] Channel creation/management UI
- [ ] Private messages/DMs
- [ ] Voice/video chat integration
