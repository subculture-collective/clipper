---
title: Watch Party Chat & Emoji Reactions System
summary: This document provides an overview of the chat and emoji reactions feature implementation for watch parties.
tags: ["archive", "implementation", "summary"]
area: docs
status: archived
owner: team-core
version: "1.0"
last_reviewed: 2026-01-29
---

# Watch Party Chat & Emoji Reactions System

This document provides an overview of the chat and emoji reactions feature implementation for watch parties.

## Overview

The watch party chat and reactions system enables real-time communication and engagement during synchronized video watching sessions. Users can send chat messages, react with emojis that appear as floating overlays on the video, and see typing indicators from other participants.

## Features Implemented

### Backend Features

- ✅ Real-time chat messaging via WebSocket
- ✅ Persistent chat message storage (last 100 messages)
- ✅ Emoji reactions with optional video timestamps
- ✅ Rate limiting (10 messages/min, 30 reactions/min per user)
- ✅ Typing indicators (non-persistent)
- ✅ HTTP endpoints for message history and persistence
- ✅ Automatic reconnection with exponential backoff

### Frontend Features

- ✅ Chat panel with message list and composer
- ✅ Emoji picker integration
- ✅ Reaction overlay with floating animations
- ✅ Typing indicators
- ✅ Auto-scroll to latest messages
- ✅ Reaction cooldowns (1 second per emoji)
- ✅ Connection status indicator

## Architecture

### Database Schema

#### watch_party_messages

```sql
CREATE TABLE watch_party_messages (
    id UUID PRIMARY KEY,
    watch_party_id UUID REFERENCES watch_parties(id),
    user_id UUID REFERENCES users(id),
    message TEXT CHECK (length(message) > 0 AND length(message) <= 1000),
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### watch_party_reactions

```sql
CREATE TABLE watch_party_reactions (
    id UUID PRIMARY KEY,
    watch_party_id UUID REFERENCES watch_parties(id),
    user_id UUID REFERENCES users(id),
    emoji VARCHAR(10),
    video_timestamp DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### Chat Messages

- `POST /api/v1/watch-parties/:id/messages` - Send a message
  - Rate limit: 10 requests/minute
  - Request: `{ "message": "Hello!" }`
  - Response: `{ "success": true, "data": {...} }`

- `GET /api/v1/watch-parties/:id/messages` - Get message history
  - Returns last 100 messages
  - Response: `{ "success": true, "data": { "messages": [...], "count": 50 } }`

#### Reactions

- `POST /api/v1/watch-parties/:id/react` - Send a reaction
  - Rate limit: 30 requests/minute
  - Request: `{ "emoji": "🔥", "video_timestamp": 42.5 }`
  - Response: `{ "success": true, "data": {...} }`

### WebSocket Protocol

Connect to: `wss://[host]/api/v1/watch-parties/:id/ws`

**Authentication**:
- WebSocket connections require authentication via JWT token
- Token is passed via `Sec-WebSocket-Protocol` header as a subprotocol
- Format: `auth.bearer.<base64_encoded_token>`
- This approach prevents tokens from appearing in URLs/query parameters
- Query parameters would be logged by proxies, load balancers, and access logs
- Token is validated before WebSocket upgrade
- Unauthenticated connections will receive 401 Unauthorized response

**JavaScript Example:**
```javascript
const token = getJWT();
const authProtocol = `auth.bearer.${btoa(token)}`;
const ws = new WebSocket('wss://example.com/api/v1/watch-parties/123/ws', [authProtocol]);
```

#### Client → Server Commands

```typescript
{
  type: 'chat' | 'reaction' | 'typing',
  party_id: string,
  message?: string,           // for chat
  emoji?: string,             // for reaction
  video_timestamp?: number,   // for reaction
  is_typing?: boolean,        // for typing
  timestamp: number           // Unix timestamp
}
```

#### Server → Client Events

```typescript
{
  type: 'chat_message' | 'reaction' | 'typing' | 'sync' | 'play' | 'pause',
  party_id: string,
  server_timestamp: number,
  chat_message?: {
    id: string,
    user_id: string,
    username: string,
    display_name: string,
    message: string,
    created_at: string
  },
  reaction?: {
    id: string,
    user_id: string,
    username: string,
    emoji: string,
    video_timestamp?: number,
    created_at: string
  },
  user_id?: string,          // for typing events
  is_typing?: boolean        // for typing events
}
```

## Usage Examples

### Backend Usage

```go
// In watch_party_hub.go, the hub automatically handles:
// - Rate limiting (10 msgs/min, 30 reactions/min)
// - Message persistence via repository
// - Broadcasting to all participants
// - Typing indicators (non-persistent)

// Message handling is automatic via WebSocket
// Reactions are broadcast immediately
```

### Frontend Usage

```typescript
import { ChatPanel, ReactionOverlay } from '@/components/watch-party';
import { useWatchPartyWebSocket } from '@/hooks/useWatchPartyWebSocket';
import { getWatchPartyMessages } from '@/lib/watch-party-api';

function WatchPartyPage({ partyId }: { partyId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  
  // Load initial message history
  useEffect(() => {
    getWatchPartyMessages(partyId).then(setMessages);
  }, [partyId]);
  
  // Connect to WebSocket
  const { 
    sendChatMessage, 
    sendReaction, 
    sendTyping,
    isConnected 
  } = useWatchPartyWebSocket({
    partyId,
    onChatMessage: (msg) => {
      setMessages(prev => [...prev, msg]);
    },
    onReaction: (reaction) => {
      // Reaction animations handled by ReactionOverlay
    },
    onTyping: (userId, isTyping) => {
      // Update typing indicators
    },
  });

  return (
    <div className="flex h-screen">
      {/* Video player with reactions */}
      <div className="flex-1 relative bg-black">
        <video ref={videoRef} className="w-full h-full" />
        <ReactionOverlay 
          partyId={partyId}
          videoRef={videoRef}
          onSendReaction={sendReaction}
        />
      </div>
      
      {/* Chat panel */}
      <div className="w-80">
        <ChatPanel
          partyId={partyId}
          messages={messages}
          onSendMessage={sendChatMessage}
          onTyping={sendTyping}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
}
```

## Rate Limiting

### Per-User Limits

- **Chat Messages**: 10 messages per minute
- **Reactions**: 30 reactions per minute
- Implemented using Redis-backed distributed rate limiter with sliding window algorithm
- **Multi-Instance Deployments**: Rate limits are enforced globally across all server instances via Redis
- Failed rate limit checks are logged but silently dropped (no error sent to client)

### Architecture

- Uses Redis sorted sets for distributed rate limiting
- Sliding window algorithm ensures accurate rate limiting across instances
- Automatic cleanup of expired entries
- Fallback to in-memory rate limiter if Redis is unavailable (per-instance only)

### HTTP Endpoint Limits

- Enforced by middleware at HTTP layer
- Same limits as WebSocket (10 msgs/min, 30 reactions/min)
- Returns 429 status code when exceeded

### WebSocket Limits

- Enforced within watch party hub
- Silent drop of messages when limit exceeded
- Logged for monitoring

## Performance Characteristics

### Target Metrics

- **Message Latency**: < 100ms p95 (WebSocket broadcast)
- **Reaction Animation**: 60fps smooth floating animation
- **Chat History Load**: < 200ms for last 100 messages
- **Concurrent Users**: Tested with 100 simultaneous participants

### Optimizations

- Connection pooling for database queries
- Buffered broadcast channels (256 capacity)
- Efficient message storage with indexes
- CSS animations using GPU acceleration

## Security Features

1. **Authentication Required**: All endpoints and WebSocket connections require valid JWT token
   - HTTP endpoints: Token via Authorization header or cookie
   - WebSocket: Token via `Sec-WebSocket-Protocol` subprotocol header (prevents URL logging)
   - Tokens never appear in URLs or query parameters to prevent logging exposure
2. **Participant Validation**: Only active participants can send messages/reactions
3. **Distributed Rate Limiting**: Prevents spam and abuse across all server instances
   - Redis-backed sliding window algorithm with atomic Lua script execution
   - Global enforcement in multi-instance deployments
   - No race conditions in concurrent request handling
4. **Message Validation**: 1-1000 character limit, sanitized
5. **Emoji Validation**: Max 10 characters per emoji
6. **Party Visibility**: Private parties restrict access to participants only
7. **Secure Token Transport**: Tokens transmitted via headers, never in URLs
4. **Message Validation**: 1-1000 character limit, sanitized
5. **Emoji Validation**: Max 10 characters per emoji
6. **Party Visibility**: Private parties restrict access to participants only
7. **Secure Token Transport**: HTTPS encrypts WebSocket URLs including query parameters

## Testing

### Unit Tests

```bash
# Backend tests
cd backend
go test ./internal/repository/watch_party_repository_test.go -v

# Expected output:
# PASS: TestWatchPartyMessageLifecycle
# PASS: TestWatchPartyReactionLifecycle
# PASS: TestWatchPartyMessageLimit
```

### Manual Testing

1. Create a watch party
2. Join from multiple browser sessions
3. Send chat messages and verify real-time delivery
4. Send reactions and verify floating animations
5. Test rate limiting by sending rapid messages
6. Test typing indicators
7. Test reconnection after network interruption

## Known Limitations

1. **Message History**: Limited to last 100 messages per party
2. **Reaction History**: Not retrieved on initial load (real-time only)
3. **Typing Indicators**: Non-persistent, lost on reconnection
4. **No Editing**: Messages cannot be edited after sending
5. **No Deletion**: Messages cannot be deleted by users

## Deployment Considerations

### Multi-Instance Deployments

- **Rate Limiting**: Requires Redis for distributed rate limiting across instances
- **WebSocket Connections**: Each instance maintains its own WebSocket connections
- **Load Balancing**: Configure load balancer for WebSocket sticky sessions or use Redis pub/sub
- **Redis Requirements**:
  - Must be accessible from all backend instances
  - Recommended: Redis Cluster or Sentinel for high availability
  - Rate limit keys automatically expire after window + 1 minute

### Single Instance Deployments

- Can use in-memory rate limiter fallback if Redis is unavailable
- Simpler setup but limited scalability
- Rate limits are per-instance (can be bypassed by connecting to different instances)

## Future Enhancements

- [ ] Message editing and deletion
- [ ] @mention notifications
- [ ] Custom emoji upload
- [ ] Reaction summary/aggregation (e.g., "5 people reacted with 🔥")
- [ ] Message search/filtering
- [ ] Moderation tools (mute, ban)
- [ ] Rich text formatting (bold, italic, links)
- [ ] File/image sharing
- [ ] Voice/video chat integration

## Migration Guide

### Database Migration

```bash
# Run migration
migrate -path backend/migrations -database "postgres://..." up

# Verify tables created
psql -c "SELECT * FROM watch_party_messages LIMIT 1;"
psql -c "SELECT * FROM watch_party_reactions LIMIT 1;"
```

### Frontend Integration

1. Import components from `@/components/watch-party`
2. Import hook from `@/hooks/useWatchPartyWebSocket`
3. Import API functions from `@/lib/watch-party-api`
4. Add to watch party page layout
5. Ensure WebSocket URL is configured in environment

## Troubleshooting

### WebSocket Connection Issues

- **Problem**: Connection fails with 401 Unauthorized
- **Solution**: Ensure JWT token is present in localStorage

- **Problem**: Connection drops frequently
- **Solution**: Check network stability, firewall rules, load balancer configuration

### Rate Limiting Issues

- **Problem**: Messages not appearing
- **Solution**: Check console for rate limit errors, wait for window to reset

### Animation Performance

- **Problem**: Reactions lag or stutter
- **Solution**: Reduce number of concurrent animations, check browser GPU acceleration

## Support

For issues or questions:
1. Check the implementation code in this PR
2. Review the API documentation above
3. Test with the provided examples
4. Check server logs for errors

## Contributors

- Backend implementation: Go + PostgreSQL + WebSocket
- Frontend implementation: React + TypeScript + Tailwind CSS
- Testing: Unit tests + Manual verification
