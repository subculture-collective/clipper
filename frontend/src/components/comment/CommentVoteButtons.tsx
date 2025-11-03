import React from 'react';
import { cn } from '@/lib/utils';
import { useCommentVote } from '@/hooks';
import { useIsAuthenticated, useToast } from '@/hooks';

interface CommentVoteButtonsProps {
  commentId: string;
  score: number;
  userVote?: 1 | -1 | null;
  className?: string;
}

export const CommentVoteButtons: React.FC<CommentVoteButtonsProps> = ({
  commentId,
  score,
  userVote,
  className,
}) => {
  const isAuthenticated = useIsAuthenticated();
  const { mutate: vote, isPending } = useCommentVote();
  const [isVoting, setIsVoting] = React.useState(false);
  const toast = useToast();

  const handleVote = (voteType: 1 | -1) => {
    if (!isAuthenticated) {
      toast.info('Please log in to vote');
      return;
    }

    if (isVoting) return;

    setIsVoting(true);
    vote(
      { comment_id: commentId, vote_type: voteType },
      {
        onSettled: () => {
          setTimeout(() => setIsVoting(false), 200);
        },
      }
    );
  };

  const isUpvoted = userVote === 1;
  const isDownvoted = userVote === -1;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <button
        onClick={() => handleVote(1)}
        disabled={isPending || isVoting}
        className={cn(
          'touch-target p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-95',
          isUpvoted && 'text-orange-500 bg-orange-50 dark:bg-orange-950'
        )}
        aria-label="Upvote comment"
        title="Upvote"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isUpvoted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'w-5 h-5 transition-transform',
            isUpvoted && 'scale-110'
          )}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 15.75l7.5-7.5 7.5 7.5"
          />
        </svg>
      </button>

      <span
        className={cn(
          'text-sm font-medium min-w-[2rem] text-center transition-colors',
          isUpvoted && 'text-orange-500',
          isDownvoted && 'text-blue-500',
          !userVote && 'text-muted-foreground'
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {score}
      </span>

      <button
        onClick={() => handleVote(-1)}
        disabled={isPending || isVoting}
        className={cn(
          'touch-target p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-95',
          isDownvoted && 'text-blue-500 bg-blue-50 dark:bg-blue-950'
        )}
        aria-label="Downvote comment"
        title="Downvote"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isDownvoted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            'w-5 h-5 transition-transform',
            isDownvoted && 'scale-110'
          )}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
    </div>
  );
};
