import { useEffect, useState, useCallback, useRef } from 'react';
import { getSecureItem } from '@/lib/secure-storage';
import type {
  WatchPartySyncEvent,
  WatchPartyCommand,
  WatchPartyMessage,
  WatchPartyReaction,
} from '@/types/watchParty';

interface UseWatchPartyWebSocketOptions {
  partyId: string;
  onSyncEvent?: (event: WatchPartySyncEvent) => void;
  onChatMessage?: (message: WatchPartyMessage) => void;
  onReaction?: (reaction: WatchPartyReaction) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
  enabled?: boolean;
}

interface UseWatchPartyWebSocketReturn {
  sendCommand: (command: Omit<WatchPartyCommand, 'party_id' | 'timestamp'>) => void;
  sendChatMessage: (message: string) => void;
  sendReaction: (emoji: string, videoTimestamp?: number) => void;
  sendTyping: (isTyping: boolean) => void;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for managing WebSocket connection to watch party
 */
export function useWatchPartyWebSocket({
  partyId,
  onSyncEvent,
  onChatMessage,
  onReaction,
  onTyping,
  enabled = true,
}: UseWatchPartyWebSocketOptions): UseWatchPartyWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const connectRef = useRef<(() => void) | null>(null);
  const sendCommandRef = useRef<((command: Omit<WatchPartyCommand, 'party_id' | 'timestamp'>) => void) | null>(null);

  // Store callbacks in refs to avoid reconnecting when they change
  const onSyncEventRef = useRef(onSyncEvent);
  const onChatMessageRef = useRef(onChatMessage);
  const onReactionRef = useRef(onReaction);
  const onTypingRef = useRef(onTyping);
  useEffect(() => { onSyncEventRef.current = onSyncEvent; }, [onSyncEvent]);
  useEffect(() => { onChatMessageRef.current = onChatMessage; }, [onChatMessage]);
  useEffect(() => { onReactionRef.current = onReaction; }, [onReaction]);
  useEffect(() => { onTypingRef.current = onTyping; }, [onTyping]);

  const connect = useCallback(async () => {
    if (!enabled) return;

    try {
      // Get WebSocket URL from environment or default
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;

      // Get auth token from secure storage
      const token = await getSecureItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Use subprotocol for authentication to avoid token in URL/query params
      // The token is sent via Sec-WebSocket-Protocol header, which:
      // 1. Is not logged in access logs (unlike query parameters)
      // 2. Is encrypted by WSS/HTTPS
      // 3. Follows WebSocket authentication best practices
      const wsUrl = `${wsProtocol}//${wsHost}/api/v1/watch-parties/${partyId}/ws`;

      // Pass token as subprotocol - server will extract it from Sec-WebSocket-Protocol header
      // Format: "auth.bearer.<base64_token>" to avoid protocol name conflicts
      const authProtocol = `auth.bearer.${btoa(token)}`;
      const ws = new WebSocket(wsUrl, [authProtocol]);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log(`Connected to watch party: ${partyId}`);

        // Request initial sync
        sendCommandRef.current?.({ type: 'sync-request' });
      };

      ws.onmessage = (event) => {
        try {
          const syncEvent = JSON.parse(event.data) as WatchPartySyncEvent;

          // Call the general sync event handler
          onSyncEventRef.current?.(syncEvent);

          // Handle specific event types
          switch (syncEvent.type) {
            case 'chat_message':
              if (syncEvent.chat_message) {
                onChatMessageRef.current?.(syncEvent.chat_message);
              }
              break;
            case 'reaction':
              if (syncEvent.reaction) {
                onReactionRef.current?.(syncEvent.reaction);
              }
              break;
            case 'typing':
              if (syncEvent.user_id) {
                onTypingRef.current?.(syncEvent.user_id, syncEvent.is_typing || false);
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log(`Disconnected from watch party: ${partyId}`);

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts && enabled) {
          const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          const attemptNumber = reconnectAttemptsRef.current + 1;
          reconnectAttemptsRef.current = attemptNumber;

          console.log(`Attempting to reconnect in ${backoffDelay}ms (attempt ${attemptNumber}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectRef.current?.();
          }, backoffDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Connection lost. Unable to reconnect after multiple attempts.');
        }
      };
    } catch (err) {
      setError('Failed to connect to watch party');
      console.error('WebSocket connection error:', err);
    }
  }, [partyId, enabled]);

  const sendCommand = useCallback((command: Omit<WatchPartyCommand, 'party_id' | 'timestamp'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullCommand: WatchPartyCommand = {
        ...command,
        party_id: partyId,
        timestamp: Date.now() / 1000, // Unix timestamp in seconds
      };
      wsRef.current.send(JSON.stringify(fullCommand));
    }
  }, [partyId]);

  useEffect(() => {
    // Store connect and sendCommand in refs so they can be called recursively
    connectRef.current = connect;
    sendCommandRef.current = sendCommand;
    queueMicrotask(() => {
      connect();
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, sendCommand]);

  const sendChatMessage = useCallback((message: string) => {
    sendCommand({
      type: 'chat',
      message,
    });
  }, [sendCommand]);

  const sendReaction = useCallback((emoji: string, videoTimestamp?: number) => {
    sendCommand({
      type: 'reaction',
      emoji,
      video_timestamp: videoTimestamp,
    });
  }, [sendCommand]);

  const sendTyping = useCallback((isTyping: boolean) => {
    // Only send if WebSocket is connected
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    // Clear previous typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    sendCommand({
      type: 'typing',
      is_typing: isTyping,
    });

    // Auto-clear typing indicator after 3 seconds if still typing
    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        sendCommand({
          type: 'typing',
          is_typing: false,
        });
      }, 3000);
    }
  }, [sendCommand]);

  return {
    sendCommand,
    sendChatMessage,
    sendReaction,
    sendTyping,
    isConnected,
    error,
  };
}
