import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  const handleMentionClick = (mention: string) => {
    const username = mention.slice(1); // Remove @ symbol
    if (onMentionClick) {
      onMentionClick(username);
    } else {
      // Default behavior: navigate to user profile
      navigate(`/user/${username}`);
    }
  };

  // Parse content into structured elements
  const parseContent = (text: string) => {
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    // Regex patterns for different content types
    const patterns = {
      multilineCode: /```([\s\S]*?)```/g,
      inlineCode: /`([^`]+)`/g,
      url: /(https?:\/\/[^\s]+)/g,
      mention: /(@\w+)/g,
    };

    // Find all matches with their positions
    const matches: Array<{ type: string; match: RegExpMatchArray; start: number; end: number }> = [];
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type,
          match,
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Process matches and text in order
    matches.forEach((item, idx) => {
      // Add text before this match
      if (currentIndex < item.start) {
        const text = content.slice(currentIndex, item.start);
        if (text) {
          elements.push(<span key={`text-${idx}`}>{text}</span>);
        }
      }

      // Add the match
      const matchText = item.match[0];
      switch (item.type) {
        case 'multilineCode':
          const code = item.match[1] || '';
          elements.push(
            <pre
              key={`code-${idx}`}
              className="bg-neutral-100 dark:bg-neutral-800 p-2 rounded mt-1 mb-1 overflow-x-auto"
            >
              <code className="text-xs font-mono">{code.trim()}</code>
            </pre>
          );
          break;
        case 'inlineCode':
          const inlineCode = item.match[1] || '';
          elements.push(
            <code
              key={`inline-${idx}`}
              className="bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs font-mono"
            >
              {inlineCode}
            </code>
          );
          break;
        case 'url':
          elements.push(<LinkPreview key={`url-${idx}`} url={matchText} />);
          break;
        case 'mention':
          elements.push(
            <span
              key={`mention-${idx}`}
              className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer font-medium"
              role="button"
              tabIndex={0}
              onClick={() => handleMentionClick(matchText)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMentionClick(matchText);
                }
              }}
            >
              {matchText}
            </span>
          );
          break;
      }

      currentIndex = item.end;
    });

    // Add remaining text
    if (currentIndex < content.length) {
      const text = content.slice(currentIndex);
      if (text) {
        elements.push(<span key="text-final">{text}</span>);
      }
    }

    return elements.length > 0 ? elements : [content];
  };

  return (
    <div className="text-sm break-words whitespace-pre-wrap">
      {parseContent(content)}
    </div>
  );
}
