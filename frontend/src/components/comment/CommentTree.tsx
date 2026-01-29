import React from 'react';
import { CommentItem } from './CommentItem';
import type { Comment } from '@/types/comment';

export interface CommentTreeProps {
  comments: Comment[];
  depth?: number;
  maxDepth?: number;
  currentUserId?: string;
  isAdmin?: boolean;
  clipId: string;
}

/**
 * CommentTree - Reusable component for rendering nested comment threads
 * 
 * Features:
 * - Recursive rendering of nested comments
 * - Visual indentation (16px/ml-4 per level)
 * - Left border styling for nesting indication (2px border-border)
 * - Depth tracking with configurable maxDepth
 * - Performance optimized with React.memo
 * - Supports both flat and nested comment structures
 * - Handles deleted/removed comments gracefully
 * 
 * @param comments - Array of comments to render (can be top-level or nested)
 * @param depth - Current nesting depth (default: 0)
 * @param maxDepth - Maximum nesting depth before showing "Continue thread" (default: 10)
 * @param currentUserId - Current user's ID for edit/delete/vote checks
 * @param isAdmin - Whether current user has admin privileges
 * @param clipId - ID of the clip these comments belong to
 */
export const CommentTree: React.FC<CommentTreeProps> = React.memo(({
  comments,
  depth = 0,
  maxDepth = 10,
  currentUserId,
  isAdmin = false,
  clipId,
}) => {
  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <div className={depth > 0 ? 'ml-4 space-y-4 border-l-2 border-border pl-4' : 'space-y-6'}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          clipId={clipId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          depth={depth}
          maxDepth={maxDepth}
        />
      ))}
    </div>
  );
});

CommentTree.displayName = 'CommentTree';
