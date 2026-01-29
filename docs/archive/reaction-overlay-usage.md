---
title: Watch Party Reaction Overlay Usage Guide
summary: Usage guide for the refactored ReactionOverlay component using React hooks and proper ref patterns.
tags: ["archive", "implementation"]
area: docs
status: archived
owner: team-core
version: "1.0"
last_reviewed: 2026-01-29
---

# Watch Party Reaction Overlay Usage Guide

## Overview

The `ReactionOverlay` component has been refactored to use proper React patterns (forwardRef/useImperativeHandle) instead of window globals. This ensures memory safety, proper cleanup, and follows React best practices.

## Updated Component Interface

```typescript
// Component props
interface ReactionOverlayProps {
  partyId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onSendReaction: (emoji: string, videoTimestamp?: number) => void;
  className?: string;
}

// Exposed ref handle
export interface ReactionOverlayHandle {
  addReaction: (emoji: string) => void;
}
```

## Usage Example

### Basic Usage

```typescript
import { useRef } from 'react';
import { ReactionOverlay, ReactionOverlayHandle } from '@/components/watch-party/ReactionOverlay';
import { useWatchPartyWebSocket } from '@/hooks/useWatchPartyWebSocket';

function WatchPartyPage({ partyId }: { partyId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reactionOverlayRef = useRef<ReactionOverlayHandle>(null);
  
  // Setup WebSocket connection
  const { sendReaction, isConnected } = useWatchPartyWebSocket({
    partyId,
    onReaction: (reaction) => {
      // When a reaction is received from another user,
      // call the exposed method via ref
      reactionOverlayRef.current?.addReaction(reaction.emoji);
    },
  });

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} className="w-full h-full" />
      <ReactionOverlay
        ref={reactionOverlayRef}
        partyId={partyId}
        videoRef={videoRef}
        onSendReaction={sendReaction}
      />
    </div>
  );
}
```

## Key Changes from Previous Implementation

### Before (Window Globals - ❌ Not Recommended)

```typescript
// Old implementation used window globals
useEffect(() => {
  const handler = (emoji: string) => addReaction(emoji);
  (window as any)[`addReactionToParty_${partyId}`] = handler;
  
  return () => {
    delete (window as any)[`addReactionToParty_${partyId}`];
  };
}, [partyId]);

// Parent would call:
(window as any)[`addReactionToParty_${partyId}`]('🔥');
```

**Problems:**
- Memory leaks if cleanup fails
- Global namespace pollution
- No TypeScript safety
- Brittle coupling between components
- Hard to test

### After (React Refs - ✅ Recommended)

```typescript
// New implementation uses forwardRef
const ReactionOverlay = forwardRef<ReactionOverlayHandle, ReactionOverlayProps>(
  function ReactionOverlay({ partyId, videoRef, onSendReaction }, ref) {
    const addReaction = useCallback((emoji: string) => {
      // ... implementation
    }, []);
    
    useImperativeHandle(ref, () => ({
      addReaction,
    }), [addReaction]);
    
    // ... rest of component
  }
);

// Parent calls via ref:
reactionOverlayRef.current?.addReaction('🔥');
```

**Benefits:**
- Automatic cleanup with React lifecycle
- Type-safe with TypeScript
- No global namespace pollution
- Testable and maintainable
- Follows React best practices

## Migration Guide

If you have existing code using the old pattern, update it as follows:

1. **Add a ref for the ReactionOverlay component:**
   ```typescript
   const reactionOverlayRef = useRef<ReactionOverlayHandle>(null);
   ```

2. **Pass the ref to the component:**
   ```typescript
   <ReactionOverlay
     ref={reactionOverlayRef}
     // ... other props
   />
   ```

3. **Update reaction handling in WebSocket callback:**
   ```typescript
   // Old way:
   onReaction: (reaction) => {
     (window as any)[`addReactionToParty_${partyId}`](reaction.emoji);
   }
   
   // New way:
   onReaction: (reaction) => {
     reactionOverlayRef.current?.addReaction(reaction.emoji);
   }
   ```

4. **Remove any window global cleanup code** - it's no longer needed!

## Testing

```typescript
import { render, screen } from '@testing-library/react';
import { ReactionOverlay } from './ReactionOverlay';

test('exposes addReaction method via ref', () => {
  const ref = createRef<ReactionOverlayHandle>();
  
  render(
    <ReactionOverlay
      ref={ref}
      partyId="test-party"
      videoRef={createRef()}
      onSendReaction={jest.fn()}
    />
  );
  
  // Can call the exposed method
  expect(ref.current?.addReaction).toBeDefined();
  ref.current?.addReaction('🔥');
});
```

## Security Benefits

The refactoring eliminates potential security issues:

1. **No global namespace pollution** - prevents conflicts with other scripts
2. **Proper encapsulation** - methods only accessible through proper React refs
3. **Memory safety** - automatic cleanup prevents memory leaks
4. **Type safety** - TypeScript ensures correct usage at compile time

## Performance

No performance impact - the ref pattern is just as performant as the previous implementation, with the added benefit of better memory management.
