import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn, formatTimestamp } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { UserRoleBadge } from '@/components/user';
import { CommentVoteButtons } from './CommentVoteButtons';
import { CommentActions } from './CommentActions';
import { CommentForm } from './CommentForm';
import type { Comment } from '@/types/comment';

interface CommentItemProps {
  comment: Comment;
  clipId: string;
  currentUserId?: string;
  isAdmin?: boolean;
  depth?: number;
  maxDepth?: number;
  className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  clipId,
  currentUserId,
  isAdmin = false,
  depth = 0,
  maxDepth = 10,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showReplyForm, setShowReplyForm] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const isAuthor = currentUserId === comment.user_id;
  const hasReplies = comment.replies && comment.replies.length > 0;
  const shouldShowContinueThread = depth >= maxDepth && hasReplies;

  const handleReply = () => {
    setShowReplyForm(true);
    setIsCollapsed(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelReply = () => {
    setShowReplyForm(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditSuccess = () => {
    setIsEditing(false);
  };

  const handleReplySuccess = () => {
    setShowReplyForm(false);
  };

  // Render deleted/removed state
  if (comment.is_deleted || comment.is_removed) {
    return (
      <div className={cn('flex gap-3', className)} id={`comment-${comment.id}`}>
        <div className="flex-shrink-0 w-12" /> {/* Spacer for alignment */}
        <div className="flex-1">
          <div className="text-sm text-muted-foreground italic py-2">
            {comment.is_deleted ? '[deleted by user]' : '[removed by moderator]'}
            {comment.removed_reason && isAdmin && ` - ${comment.removed_reason}`}
          </div>
          {/* Still show replies */}
          {hasReplies && !isCollapsed && (
            <div className="ml-4 space-y-4 border-l-2 border-border pl-4">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  clipId={clipId}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3', className)} id={`comment-${comment.id}`}>
      {/* Vote buttons */}
      <div className="flex-shrink-0">
        <CommentVoteButtons
          commentId={comment.id}
          score={comment.vote_score}
          userVote={comment.user_vote}
        />
      </div>

      {/* Comment content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar
            src={comment.user_avatar}
            alt={comment.username}
            size="sm"
            className="flex-shrink-0"
          />
          <span className="font-medium text-foreground">{comment.username}</span>

          {comment.user_role && comment.user_role !== 'user' && (
            <UserRoleBadge role={comment.user_role} size="sm" />
          )}

          {comment.user_karma !== undefined && (
            <span className="text-xs text-muted-foreground">
              {comment.user_karma.toLocaleString()} karma
            </span>
          )}

          <span className="text-xs text-muted-foreground">•</span>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={`${isCollapsed ? 'Expand' : 'Collapse'} thread (${formatTimestamp(comment.created_at).title})`}
          >
            {formatTimestamp(comment.created_at).display}
          </button>

          {comment.edited_at && (
            <>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground italic">edited</span>
            </>
          )}
        </div>

        {/* Collapsed state */}
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="text-sm text-primary-500 hover:text-primary-600 transition-colors cursor-pointer"
          >
            [{hasReplies ? `${comment.child_count} ${comment.child_count === 1 ? 'reply' : 'replies'}` : 'expand'}]
          </button>
        ) : (
          <>
            {/* Content */}
            {isEditing ? (
              <CommentForm
                clipId={clipId}
                editCommentId={comment.id}
                initialContent={comment.content}
                onCancel={handleCancelEdit}
                onSuccess={handleEditSuccess}
                placeholder="Edit your comment..."
                className="mb-3"
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                <ReactMarkdown
                  components={{
                    // Open external links in new tab
                    a: ({ ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-500 hover:text-primary-600 underline"
                      />
                    ),
                    // Code blocks
                    code: ({ className, children, ...props }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code
                          className="px-1 py-0.5 rounded bg-muted text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <code
                          className={cn(
                            'block p-3 rounded bg-muted text-sm font-mono overflow-x-auto',
                            className
                          )}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {comment.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Actions */}
            {!isEditing && (
              <CommentActions
                commentId={comment.id}
                clipId={clipId}
                isAuthor={isAuthor}
                isAdmin={isAdmin}
                createdAt={comment.created_at}
                onReply={handleReply}
                onEdit={handleEdit}
                className="mb-3"
              />
            )}

            {/* Reply form */}
            {showReplyForm && (
              <CommentForm
                clipId={clipId}
                parentId={comment.id}
                onCancel={handleCancelReply}
                onSuccess={handleReplySuccess}
                placeholder="Write a reply..."
                className="mb-3"
              />
            )}

            {/* Nested replies */}
            {hasReplies && !shouldShowContinueThread && (
              <div className="mt-4 space-y-4 border-l-2 border-border pl-4">
                {comment.replies!.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    clipId={clipId}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                  />
                ))}
              </div>
            )}

            {/* Continue thread link */}
            {shouldShowContinueThread && (
              <a
                href={`/clips/${clipId}/comments/${comment.id}`}
                className="mt-4 inline-block text-sm text-primary-500 hover:text-primary-600 transition-colors cursor-pointer"
              >
                Continue thread →
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
};
