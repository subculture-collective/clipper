import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ReplyComposerProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  isMobile?: boolean;
  className?: string;
}

export function ReplyComposer({
  onSubmit,
  onCancel,
  placeholder = 'Write your reply... (Markdown supported)',
  submitLabel = 'Post Reply',
  isMobile = false,
  className,
}: ReplyComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'bg-gray-900 rounded-lg border border-gray-700 p-4',
        isMobile && 'rounded-t-lg border-x-0 border-b-0',
        className
      )}
    >
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-gray-800 text-white rounded-lg p-3 mb-3',
          'border border-gray-700 focus:border-blue-500 focus:outline-none',
          'resize-none placeholder-gray-400'
        )}
        rows={isMobile ? 6 : 4}
        disabled={isSubmitting}
      />

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          Markdown formatting is supported
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={cn(
                'px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className={cn(
              'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? 'Posting...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
