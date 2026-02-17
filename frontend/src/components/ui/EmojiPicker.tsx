import React from 'react';
import { cn } from '@/lib/utils';
import { useClickOutside } from '@/hooks/useClickOutside';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

// Common emoji categories - defined outside component to avoid recreation on every render
const EMOJI_CATEGORIES = {
  smileys: {
    name: 'Smileys & People',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  },
  gestures: {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  },
  hearts: {
    name: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  },
  objects: {
    name: 'Objects',
    emojis: ['💻', '⌨️', '🖱️', '🖨️', '💾', '💿', '📱', '☎️', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏰', '⏱️', '⏲️', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🔥', '💥', '✨', '⭐', '🌟', '💫', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉'],
  },
  symbols: {
    name: 'Symbols',
    emojis: ['✅', '❌', '⭕', '❗', '❓', '❕', '❔', '⚠️', '🚫', '💯', '🔞', '📵', '🚭', '🚱', '🚷', '♻️', '✔️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜'],
  },
} as const;

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose, className }) => {
  const [activeCategory, setActiveCategory] = React.useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const pickerRef = React.useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useClickOutside(pickerRef, onClose);

  // Close on Escape key
  const handleEscape = React.useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  React.useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleEscape]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Auto-close after selection for better UX
    onClose();
  };

  return (
    <div
      ref={pickerRef}
      className={cn(
        'absolute z-50 bg-background border border-border rounded-lg shadow-lg',
        'w-80 max-h-96 overflow-hidden',
        className
      )}
      role="dialog"
      aria-label="Emoji picker"
    >
      {/* Category tabs */}
      <div className="flex gap-1 p-2 border-b border-border bg-muted overflow-x-auto">
        {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveCategory(key as keyof typeof EMOJI_CATEGORIES)}
            className={cn(
              'px-3 py-1 text-xs rounded whitespace-nowrap transition-colors',
              activeCategory === key
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title={category.name}
          >
            {category.emojis[0]}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 overflow-y-auto max-h-72">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl p-2 rounded hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              title={emoji}
              aria-label={`Insert ${emoji} emoji`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border bg-muted text-xs text-muted-foreground">
        Click an emoji to insert
      </div>
    </div>
  );
};
