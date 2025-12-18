import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { WatchPartyMessage } from '@/types/watchParty';
import { useAuth } from '@/hooks/useAuth';

interface ChatPanelProps {
  partyId: string;
  messages: WatchPartyMessage[];
  onSendMessage: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  isConnected: boolean;
  className?: string;
}

/**
 * Chat panel component for watch party
 */
export function ChatPanel({
  partyId,
  messages,
  onSendMessage,
  onTyping,
  isConnected,
  className = '',
}: ChatPanelProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input change and send typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Send typing indicator
    if (value.trim()) {
      onTyping(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing indicator after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    } else {
      onTyping(false);
    }
  };

  // Handle send message
  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message || isLoading || !isConnected) return;

    setIsLoading(true);
    try {
      onSendMessage(message);
      setInputValue('');
      onTyping(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Chat</h3>
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = user?.id === message.user_id;
            return (
              <div
                key={message.id}
                className={`flex flex-col ${
                  isOwnMessage ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-baseline gap-2 text-xs text-gray-500 mb-1">
                  {!isOwnMessage && (
                    <span className="font-medium text-gray-400">
                      {message.display_name || message.username}
                    </span>
                  )}
                  <span>{formatTime(message.created_at)}</span>
                </div>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    isOwnMessage
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message composer */}
      <div className="px-4 py-3 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <EmojiPicker onSelect={handleEmojiSelect} />
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              disabled={!isConnected || isLoading}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              maxLength={1000}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected || isLoading}
            variant="primary"
            size="sm"
            className="h-10"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
