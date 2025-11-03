import React from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { useComments } from '@/hooks';
import type { CommentSortOption } from '@/types/comment';

interface CommentSectionProps {
  clipId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  className?: string;
}

// Memoized CommentItem wrapper for performance
// Compares only the properties that affect rendering to prevent unnecessary re-renders
// Note: If Comment type changes, update this comparison to include new relevant fields
const MemoizedCommentItem = React.memo(CommentItem, (prevProps, nextProps) => {
  const prev = prevProps.comment;
  const next = nextProps.comment;
  
  // Compare all properties that affect visual rendering
  return (
    prev.id === next.id &&
    prev.vote_score === next.vote_score &&
    prev.user_vote === next.user_vote &&
    prev.content === next.content &&
    prev.edited_at === next.edited_at &&
    prev.is_deleted === next.is_deleted &&
    prev.is_removed === next.is_removed &&
    prev.child_count === next.child_count &&
    // Compare other props that might change
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isAdmin === nextProps.isAdmin
  );
});

export const CommentSection: React.FC<CommentSectionProps> = ({
  clipId,
  currentUserId,
  isAdmin = false,
  className,
}) => {
  const [sort, setSort] = React.useState<CommentSortOption>('best');
  const [showCommentForm, setShowCommentForm] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const touchStartRef = React.useRef<number>(0);
  const scrollTopRef = React.useRef<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useComments(clipId, sort);

  const totalComments = data?.pages[0]?.total || 0;
  const allComments = React.useMemo(
    () => data?.pages.flatMap((page) => page.comments) || [],
    [data]
  );

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
  });

  // Load more when the trigger element comes into view
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Pull-to-refresh handlers for mobile web
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    // Only enable pull-to-refresh when at the top of the container
    const container = containerRef.current;
    if (container) {
      scrollTopRef.current = container.scrollTop;
      if (scrollTopRef.current === 0) {
        touchStartRef.current = e.touches[0].clientY;
      }
    }
  }, []);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (touchStartRef.current && scrollTopRef.current === 0 && e.touches.length > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartRef.current);
      
      // Only activate pull-to-refresh if user is pulling down
      if (distance > 0) {
        setPullDistance(Math.min(distance, 100));
      }
    }
  }, []);

  const handleTouchEnd = React.useCallback(() => {
    if (pullDistance > 80 && !isRefreshing) {
      setIsRefreshing(true);
      refetch().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = 0;
  }, [pullDistance, isRefreshing, refetch]);

  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="text-center py-8">
          <p className="text-error-500">Error loading comments</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('space-y-6', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 transition-opacity"
          style={{
            opacity: Math.min(pullDistance / 80, 1),
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
          }}
        >
          <div className="bg-background border border-border rounded-full p-3 shadow-lg">
            <svg
              className={cn(
                'w-6 h-6 text-primary-500 transition-transform',
                isRefreshing && 'animate-spin'
              )}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">
          Comments ({totalComments.toLocaleString()})
        </h2>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground sr-only sm:not-sr-only">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as CommentSortOption)}
            className="touch-target px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Sort comments"
          >
            <option value="best">Best</option>
            <option value="top">Top</option>
            <option value="new">New</option>
            <option value="old">Old</option>
            <option value="controversial">Controversial</option>
          </select>
        </div>
      </div>

      {/* Add comment button/form */}
      <div>
        {showCommentForm ? (
          <CommentForm
            clipId={clipId}
            onCancel={() => setShowCommentForm(false)}
            onSuccess={() => setShowCommentForm(false)}
            placeholder="What are your thoughts?"
          />
        ) : (
          <Button 
            onClick={() => setShowCommentForm(true)} 
            fullWidth
            className="touch-target"
          >
            Add Comment
          </Button>
        )}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : allComments.length === 0 ? (
        /* Empty state */
        <div className="text-center py-12 border border-border rounded-lg">
          <p className="text-xl font-semibold mb-2">No comments yet</p>
          <p className="text-muted-foreground mb-4">Be the first to comment!</p>
          <Button
            onClick={() => setShowCommentForm(true)}
            variant="primary"
            size="lg"
          >
            Add Comment
          </Button>
        </div>
      ) : (
        <>
          {/* Comments list */}
          <div className="space-y-6">
            {allComments.map((comment) => (
              <div key={comment.id} className="lazy-render">
                <MemoizedCommentItem
                  comment={comment}
                  clipId={clipId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              </div>
            ))}
          </div>

          {/* Infinite scroll trigger and load more */}
          {hasNextPage && (
            <>
              {/* Intersection observer trigger */}
              <div ref={loadMoreRef} className="h-4" />
              
              {/* Loading spinner */}
              {isFetchingNextPage ? (
                <div className="flex justify-center py-4">
                  <Spinner size="md" />
                </div>
              ) : (
                /* Fallback button if auto-load doesn't work */
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => fetchNextPage()}
                    variant="outline"
                    className="touch-target"
                  >
                    Load More Comments
                  </Button>
                </div>
              )}
            </>
          )}

          {/* End of comments indicator */}
          {!hasNextPage && allComments.length > 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              You've reached the end of the comments
            </div>
          )}
        </>
      )}
    </div>
  );
};
