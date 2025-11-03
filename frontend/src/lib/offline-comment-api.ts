/**
 * Offline-aware Comment API
 * 
 * Wraps comment API calls with offline cache support
 * Provides cache-first reads and optimistic writes
 */

import { fetchComments, createComment, updateComment, deleteComment, voteOnComment } from './comment-api';
import { getSyncManager } from './sync-manager';
import { getMobileApiClient } from './mobile-api-client';
import type { Comment, CommentFeedResponse, CommentSortOption, CreateCommentPayload, UpdateCommentPayload, CommentVotePayload } from '@/types/comment';

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Fetch comments with offline cache fallback
 * - Online: Fetch from server and cache the results
 * - Offline: Return cached data if available
 */
export async function fetchCommentsOfflineAware({
  clipId,
  sort = 'best',
  pageParam = 1,
  limit = 10,
}: {
  clipId: string;
  sort?: CommentSortOption;
  pageParam?: number;
  limit?: number;
}): Promise<CommentFeedResponse> {
  const mobileClient = getMobileApiClient();
  const syncManager = getSyncManager();
  const isOnline = mobileClient.isOnline();

  // Try cache first for faster loading
  const cachedComments = await syncManager.getCachedComments(clipId);
  
  if (!isOnline && cachedComments.length > 0) {
    // Offline and have cached comments - return them
    console.log('[OfflineCommentAPI] Returning cached comments (offline):', clipId);
    
    // Apply sorting to cached comments
    const sortedComments = sortCachedComments(cachedComments, sort);
    
    return {
      comments: sortedComments,
      total: sortedComments.length,
      page: pageParam,
      limit,
      has_more: false,
    };
  }

  try {
    // Fetch from server
    const response = await fetchComments({ clipId, sort, pageParam, limit });
    
    // Cache the comments for offline use
    if (response.comments.length > 0) {
      await syncManager.cacheComments(response.comments);
    }
    
    return response;
  } catch (error) {
    // If we have cached data, return it as fallback
    if (cachedComments.length > 0) {
      console.log('[OfflineCommentAPI] Returning cached comments (error fallback):', clipId);
      
      const sortedComments = sortCachedComments(cachedComments, sort);
      
      return {
        comments: sortedComments,
        total: sortedComments.length,
        page: pageParam,
        limit,
        has_more: false,
      };
    }
    
    throw error;
  }
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Create a comment with optimistic update
 * - Online: Send immediately and update cache
 * - Offline: Queue the operation and add to cache optimistically
 * 
 * @param payload - The comment creation payload
 * @param userId - The authenticated user's ID (optional, defaults to placeholder)
 * @param username - The authenticated user's username (optional, defaults to 'You')
 */
export async function createCommentOfflineAware(
  payload: CreateCommentPayload,
  userId?: string,
  username?: string
): Promise<Comment> {
  const mobileClient = getMobileApiClient();
  const syncManager = getSyncManager();
  const isOnline = mobileClient.isOnline();

  // Create optimistic comment with provided or placeholder user info
  const optimisticComment: Comment = {
    id: `temp-${Date.now()}-${Math.random()}`,
    clip_id: payload.clip_id,
    user_id: userId || 'pending-user-id',
    username: username || 'You',
    content: payload.content,
    parent_id: payload.parent_id || null,
    vote_score: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
    is_removed: false,
    depth: 0,
    child_count: 0,
    user_vote: null,
  };

  // Add to cache immediately for optimistic UI
  await syncManager.cacheComment(optimisticComment);

  if (!isOnline) {
    // Queue for later sync
    await syncManager.queueOperation({
      type: 'create',
      entity: 'comment',
      data: payload,
    });
    
    return optimisticComment;
  }

  try {
    // Try to create on server
    const createdComment = await createComment(payload);
    
    // Update cache with real comment (replacing optimistic one)
    await syncManager.cacheComment(createdComment);
    
    return createdComment;
  } catch (error) {
    // Queue for retry
    await syncManager.queueOperation({
      type: 'create',
      entity: 'comment',
      data: payload,
    });
    
    // Return optimistic comment
    return optimisticComment;
  }
}

/**
 * Update a comment with optimistic update
 */
export async function updateCommentOfflineAware(
  commentId: string,
  payload: UpdateCommentPayload
): Promise<{ message: string }> {
  const syncManager = getSyncManager();

  // Queue the operation for sync
  await syncManager.queueOperation({
    type: 'update',
    entity: 'comment',
    data: { id: commentId, ...payload },
  });

  // Try to update immediately if online
  try {
    return await updateComment(commentId, payload);
  } catch (error) {
    // Operation is already queued, will sync later
    return { message: 'Comment update queued for sync' };
  }
}

/**
 * Delete a comment with optimistic update
 */
export async function deleteCommentOfflineAware(commentId: string): Promise<{ message: string }> {
  const syncManager = getSyncManager();

  // Queue the operation for sync
  await syncManager.queueOperation({
    type: 'delete',
    entity: 'comment',
    data: { id: commentId },
  });

  // Try to delete immediately if online
  try {
    return await deleteComment(commentId);
  } catch (error) {
    // Operation is already queued, will sync later
    return { message: 'Comment deletion queued for sync' };
  }
}

/**
 * Vote on a comment with optimistic update
 */
export async function voteOnCommentOfflineAware(
  payload: CommentVotePayload
): Promise<{ message: string }> {
  const syncManager = getSyncManager();

  // Queue the operation for sync
  await syncManager.queueOperation({
    type: 'create',
    entity: 'vote',
    data: payload,
  });

  // Try to vote immediately if online
  try {
    return await voteOnComment(payload);
  } catch (error) {
    // Operation is already queued, will sync later
    return { message: 'Vote queued for sync' };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function sortCachedComments(comments: Comment[], sort: CommentSortOption): Comment[] {
  const sorted = [...comments];
  
  switch (sort) {
    case 'best':
      return sorted.sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0));
    
    case 'top':
      return sorted.sort((a, b) => (b.vote_score || 0) - (a.vote_score || 0));
    
    case 'new':
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    
    case 'old':
      return sorted.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    
    default:
      return sorted;
  }
}
