import React, { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  channelId: string;
  typingUsers: string[];
}

/**
 * TypingIndicator component that shows who is currently typing
 */
export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const [displayUsers, setDisplayUsers] = useState<string[]>([]);

  useEffect(() => {
    setDisplayUsers(typingUsers);
  }, [typingUsers]);

  if (displayUsers.length === 0) return null;

  const text =
    displayUsers.length === 1
      ? `${displayUsers[0]} is typing...`
      : displayUsers.length === 2
      ? `${displayUsers[0]} and ${displayUsers[1]} are typing...`
      : `${displayUsers[0]} and ${displayUsers.length - 1} others are typing...`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{text}</span>
    </div>
  );
}
