import React from 'react';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';
import { CommentTree } from './CommentTree';
import { CommentForm } from './CommentForm';
import { useComments } from '@/hooks';
import type { CommentSortOption } from '@/types/comment';

interface CommentSectionProps {
  clipId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  clipId,
  currentUserId,
  isAdmin = false,
  className,
}) => {
  const [sort, setSort] = React.useState<CommentSortOption>('best');
  const [showCommentForm, setShowCommentForm] = React.useState(false);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useComments(clipId, sort);

  const totalComments = data?.pages[0]?.total || 0;
  const allComments = React.useMemo(
    () => data?.pages.flatMap((page) => page.comments) || [],
    [data]
  );

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
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Comments ({totalComments.toLocaleString()})
        </h2>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as CommentSortOption)}
            className="px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          <Button onClick={() => setShowCommentForm(true)} fullWidth>
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
          <CommentTree
            comments={allComments}
            clipId={clipId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            depth={0}
            maxDepth={10}
          />

          {/* Load more button */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                loading={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More Comments'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
