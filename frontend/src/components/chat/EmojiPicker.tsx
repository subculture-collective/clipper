import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState, useRef } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

// Common emojis for quick access
const COMMON_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
  '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫',
  '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '👍', '👎', '👏', '🙌', '👋', '🤝', '🙏', '💪',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  '🔥', '✨', '💯', '✅', '❌', '⚠️', '🎉', '🎊',
];

/**
 * EmojiPicker component for selecting emojis to add to messages
 */
export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Insert emoji"
        className="p-2"
      >
        <Smile className="w-5 h-5" />
      </Button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-lg shadow-lg p-2 w-72 max-h-64 overflow-y-auto z-50">
          <div className="grid grid-cols-8 gap-1">
            {COMMON_EMOJIS.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className="text-2xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                aria-label={`Insert ${emoji} emoji`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
