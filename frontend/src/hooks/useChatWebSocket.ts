import { useEffect, useState, useCallback, useRef } from 'react';
import { ChatMessage } from '@/types/chat';

interface UseChatWebSocketOptions {
  channelId: string;
  onMessage?: (message: ChatMessage) => void;
  onTyping?: (username: string) => void;
}

interface UseChatWebSocketReturn {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  sendTyping: () => void;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for managing WebSocket connection to chat channel
 */
export function useChatWebSocket({
  channelId,
  onMessage,
  onTyping,
}: UseChatWebSocketOptions): UseChatWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      // Get WebSocket URL from environment or default
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/${channelId}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log(`Connected to chat channel: ${channelId}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'message') {
            const message = data.data as ChatMessage;
            setMessages((prev) => [...prev, message]);
            onMessage?.(message);
          } else if (data.type === 'typing') {
            onTyping?.(data.data.username);
          } else if (data.type === 'history') {
            // Initial message history
            setMessages(data.data.messages || []);
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
        console.log(`Disconnected from chat channel: ${channelId}`);

        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
    } catch (err) {
      setError('Failed to connect to chat');
      console.error('WebSocket connection error:', err);
    }
  }, [channelId, onMessage, onTyping]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'message',
          content,
        })
      );
    }
  }, []);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Clear previous typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
        })
      );

      // Prevent sending typing events too frequently
      typingTimeoutRef.current = setTimeout(() => {
        // Allow sending typing event again after 3 seconds
      }, 3000);
    }
  }, []);

  return {
    messages,
    sendMessage,
    sendTyping,
    isConnected,
    error,
  };
}
