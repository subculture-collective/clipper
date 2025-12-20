import React from 'react';
import { ChatMessage } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { MessageContent } from './MessageContent';
import { formatDistanceToNow } from 'date-fns';

interface MessageItemProps {
  message: ChatMessage;
}

/**
 * MessageItem component that displays a single chat message
 */
export function MessageItem({ message }: MessageItemProps) {
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex items-start gap-3 py-2 px-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded transition-colors">
      <Avatar
        src={message.avatar_url}
        alt={message.username}
        fallback={message.username.charAt(0).toUpperCase()}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            {message.display_name || message.username}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
        </div>
        {message.is_deleted ? (
          <p className="text-sm text-muted-foreground italic">
            This message has been deleted
          </p>
        ) : (
          <MessageContent content={message.content} />
        )}
      </div>
    </div>
  );
}
