import React from 'react';
import { LinkPreview } from './LinkPreview';

interface MessageContentProps {
  content: string;
  onMentionClick?: (username: string) => void;
}

/**
 * MessageContent component that parses and renders message content
 * with support for mentions (@username), links, and code blocks
 */
export function MessageContent({ content, onMentionClick }: MessageContentProps) {
  // Parse content for mentions, links, and code blocks
  const parts = content.split(/(@\w+)|(https?:\/\/[^\s]+)|(`[^`]+`)|(`{3}[\s\S]*?`{3})/g);

  const handleMentionClick = (mention: string) => {
    const username = mention.slice(1); // Remove @ symbol
    if (onMentionClick) {
      onMentionClick(username);
    } else {
      // Default behavior: could navigate to user profile
      window.location.href = `/user/${username}`;
    }
  };

  return (
    <div className="text-sm break-words whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (!part) return null;

        // Mention (@username)
        if (part.startsWith('@')) {
          return (
            <span
              key={i}
              className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer font-medium"
              role="button"
              tabIndex={0}
              onClick={() => handleMentionClick(part)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMentionClick(part);
                }
              }}
            >
              {part}
            </span>
          );
        }

        // URL link with preview
        if (part.startsWith('http')) {
          return <LinkPreview key={i} url={part} />;
        }

        // Multi-line code block
        if (part.startsWith('```')) {
          const code = part.slice(3, -3).trim();
          return (
            <pre
              key={i}
              className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1 mb-1 overflow-x-auto"
            >
              <code className="text-xs font-mono">{code}</code>
            </pre>
          );
        }

        // Inline code
        if (part.startsWith('`')) {
          return (
            <code
              key={i}
              className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs font-mono"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Regular text
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
