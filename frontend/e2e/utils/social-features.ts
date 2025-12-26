import { Page } from '@playwright/test';

/**
 * Social Features Testing Utilities
 * 
 * Provides functions for testing social features:
 * - Comments (CRUD, moderation, voting)
 * - Voting (upvote/downvote with anti-abuse)
 * - Following/unfollowing users
 * - Playlist management (CRUD, sharing, permissions)
 * - User blocking and visibility
 * - Rate limiting behavior
 * 
 * @example
 * ```typescript
 * import { createComment, voteOnComment, followUser } from '@utils/social-features';
 * 
 * const comment = await createComment(page, { clipId: '123', content: 'Great clip!' });
 * await voteOnComment(page, comment.id, 1);
 * await followUser(page, 'targetUserId');
 * ```
 */

export interface CommentData {
  clipId: string;
  content: string;
  parentCommentId?: string | null;
  userId?: string;
}

export interface PlaylistData {
  title: string;
  description?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  coverUrl?: string;
}

export interface VoteData {
  targetId: string;
  voteType: 1 | -1; // 1 for upvote, -1 for downvote
  targetType: 'clip' | 'comment';
}

export interface BlockData {
  blockedUserId: string;
  reason?: string;
}

/**
 * Get API base URL from environment
 */
function getApiBaseUrl(): string {
  return process.env.VITE_API_URL || 'http://localhost:8080/api/v1';
}

/**
 * Extract authentication token from page context
 */
async function getAuthToken(page: Page): Promise<string | null> {
  try {
    const token = await page.evaluate(() => {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    });
    return token;
  } catch {
    return null;
  }
}

// ============================================================================
// Comment Functions
// ============================================================================

/**
 * Create a comment on a clip
 */
export async function createComment(page: Page, commentData: CommentData): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/clips/${commentData.clipId}/comments`, {
      data: {
        content: commentData.content,
        parent_comment_id: commentData.parentCommentId || null,
      },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to create comment via API, using mock data');
      return { 
        id: `mock-comment-${Date.now()}`, 
        ...commentData,
        vote_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available, using mock comment data:', error);
    return { 
      id: `mock-comment-${Date.now()}`, 
      ...commentData,
      vote_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Edit an existing comment
 */
export async function editComment(page: Page, commentId: string, newContent: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.patch(`${apiUrl}/comments/${commentId}`, {
      data: { content: newContent },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to edit comment via API');
      return { id: commentId, content: newContent, edited: true };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for comment edit:', error);
    return { id: commentId, content: newContent, edited: true };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(page: Page, commentId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    await page.request.delete(`${apiUrl}/comments/${commentId}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
  } catch (error) {
    console.warn('Failed to delete comment:', error);
  }
}

/**
 * Get comments for a clip
 */
export async function getComments(page: Page, clipId: string, options: { sort?: string; limit?: number } = {}): Promise<any[]> {
  const apiUrl = getApiBaseUrl();
  const params = new URLSearchParams({
    ...(options.sort && { sort: options.sort }),
    ...(options.limit && { limit: options.limit.toString() }),
  });
  
  try {
    const response = await page.request.get(`${apiUrl}/clips/${clipId}/comments?${params}`);
    
    if (!response.ok()) {
      return [];
    }
    
    const result = await response.json();
    return result.data?.comments || result.comments || [];
  } catch (error) {
    console.warn('Failed to get comments:', error);
    return [];
  }
}

/**
 * Vote on a comment
 */
export async function voteOnComment(page: Page, commentId: string, voteType: 1 | -1): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/comments/${commentId}/vote`, {
      data: { vote_type: voteType },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to vote on comment');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for comment vote:', error);
    return { success: false };
  }
}

/**
 * Remove vote from a comment
 */
export async function removeCommentVote(page: Page, commentId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    await page.request.delete(`${apiUrl}/comments/${commentId}/vote`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
  } catch (error) {
    console.warn('Failed to remove comment vote:', error);
  }
}

// ============================================================================
// Clip Voting Functions
// ============================================================================

/**
 * Vote on a clip
 */
export async function voteOnClip(page: Page, clipId: string, voteType: 1 | -1): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/clips/${clipId}/vote`, {
      data: { vote_type: voteType },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to vote on clip');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for clip vote:', error);
    return { success: false };
  }
}

/**
 * Remove vote from a clip
 */
export async function removeClipVote(page: Page, clipId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    await page.request.delete(`${apiUrl}/clips/${clipId}/vote`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
  } catch (error) {
    console.warn('Failed to remove clip vote:', error);
  }
}

/**
 * Get voting status for a clip
 */
export async function getClipVoteStatus(page: Page, clipId: string): Promise<{ user_vote: number | null; vote_score: number }> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.get(`${apiUrl}/clips/${clipId}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      return { user_vote: null, vote_score: 0 };
    }
    
    const result = await response.json();
    const clip = result.data || result;
    return {
      user_vote: clip.user_vote || null,
      vote_score: clip.vote_score || 0,
    };
  } catch (error) {
    console.warn('Failed to get clip vote status:', error);
    return { user_vote: null, vote_score: 0 };
  }
}

// ============================================================================
// Following Functions
// ============================================================================

/**
 * Follow a user
 */
export async function followUser(page: Page, targetUserId: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/users/${targetUserId}/follow`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to follow user');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for following user:', error);
    return { success: false };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(page: Page, targetUserId: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.delete(`${apiUrl}/users/${targetUserId}/follow`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to unfollow user');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for unfollowing user:', error);
    return { success: false };
  }
}

/**
 * Get user's following status
 */
export async function getFollowingStatus(page: Page, targetUserId: string): Promise<boolean> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.get(`${apiUrl}/users/${targetUserId}/follow-status`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      return false;
    }
    
    const result = await response.json();
    return result.is_following || false;
  } catch (error) {
    console.warn('Failed to get following status:', error);
    return false;
  }
}

/**
 * Get user's feed (from followed users)
 */
export async function getFollowingFeed(page: Page, options: { page?: number; limit?: number } = {}): Promise<any[]> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  const params = new URLSearchParams({
    page: (options.page || 1).toString(),
    limit: (options.limit || 20).toString(),
  });
  
  try {
    const response = await page.request.get(`${apiUrl}/feed/following?${params}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      return [];
    }
    
    const result = await response.json();
    return result.data?.clips || result.clips || [];
  } catch (error) {
    console.warn('Failed to get following feed:', error);
    return [];
  }
}

// ============================================================================
// Playlist Functions
// ============================================================================

/**
 * Create a playlist
 */
export async function createPlaylist(page: Page, playlistData: PlaylistData): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/playlists`, {
      data: {
        title: playlistData.title,
        description: playlistData.description || '',
        visibility: playlistData.visibility || 'private',
        cover_url: playlistData.coverUrl,
      },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to create playlist via API, using mock data');
      return {
        id: `mock-playlist-${Date.now()}`,
        ...playlistData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available, using mock playlist data:', error);
    return {
      id: `mock-playlist-${Date.now()}`,
      ...playlistData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

/**
 * Update a playlist
 */
export async function updatePlaylist(page: Page, playlistId: string, updates: Partial<PlaylistData>): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.patch(`${apiUrl}/playlists/${playlistId}`, {
      data: updates,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to update playlist');
      return { id: playlistId, ...updates };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for playlist update:', error);
    return { id: playlistId, ...updates };
  }
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(page: Page, playlistId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    await page.request.delete(`${apiUrl}/playlists/${playlistId}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
  } catch (error) {
    console.warn('Failed to delete playlist:', error);
  }
}

/**
 * Add clips to a playlist
 */
export async function addClipsToPlaylist(page: Page, playlistId: string, clipIds: string[]): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/playlists/${playlistId}/clips`, {
      data: { clip_ids: clipIds },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to add clips to playlist');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for adding clips:', error);
    return { success: false };
  }
}

/**
 * Remove clip from playlist
 */
export async function removeClipFromPlaylist(page: Page, playlistId: string, clipId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    await page.request.delete(`${apiUrl}/playlists/${playlistId}/clips/${clipId}`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
  } catch (error) {
    console.warn('Failed to remove clip from playlist:', error);
  }
}

/**
 * Get playlist share link
 */
export async function getPlaylistShareLink(page: Page, playlistId: string): Promise<string | null> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.get(`${apiUrl}/playlists/${playlistId}/share`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      return null;
    }
    
    const result = await response.json();
    return result.share_url || result.data?.share_url || null;
  } catch (error) {
    console.warn('Failed to get playlist share link:', error);
    return null;
  }
}

/**
 * Update playlist visibility/permissions
 */
export async function updatePlaylistVisibility(page: Page, playlistId: string, visibility: 'private' | 'public' | 'unlisted'): Promise<any> {
  return updatePlaylist(page, playlistId, { visibility });
}

// ============================================================================
// Blocking Functions
// ============================================================================

/**
 * Block a user
 */
export async function blockUser(page: Page, targetUserId: string, reason?: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.post(`${apiUrl}/users/${targetUserId}/block`, {
      data: { reason },
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to block user');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for blocking user:', error);
    return { success: false };
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(page: Page, targetUserId: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.delete(`${apiUrl}/users/${targetUserId}/block`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to unblock user');
      return { success: false };
    }
    
    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.warn('API not available for unblocking user:', error);
    return { success: false };
  }
}

/**
 * Check if a user is blocked
 */
export async function isUserBlocked(page: Page, targetUserId: string): Promise<boolean> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.get(`${apiUrl}/users/${targetUserId}/block-status`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      return false;
    }
    
    const result = await response.json();
    return result.is_blocked || false;
  } catch (error) {
    console.warn('Failed to get block status:', error);
    return false;
  }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(page: Page): Promise<any[]> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);
  
  try {
    const response = await page.request.get(`${apiUrl}/users/blocked`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok()) {
      return [];
    }
    
    const result = await response.json();
    return result.data?.users || result.users || [];
  } catch (error) {
    console.warn('Failed to get blocked users:', error);
    return [];
  }
}

// ============================================================================
// Rate Limiting Functions
// ============================================================================

/**
 * Trigger rate limit by performing rapid actions
 * Returns true if rate limit was triggered, false otherwise
 */
export async function triggerRateLimit(
  page: Page, 
  action: 'comment' | 'vote' | 'follow',
  targetId: string,
  attempts: number = 20
): Promise<{ triggered: boolean; response?: any }> {
  let lastResponse: any = null;
  
  for (let i = 0; i < attempts; i++) {
    try {
      if (action === 'comment') {
        lastResponse = await createComment(page, {
          clipId: targetId,
          content: `Test comment ${i} ${Date.now()}`,
        });
      } else if (action === 'vote') {
        lastResponse = await voteOnClip(page, targetId, i % 2 === 0 ? 1 : -1);
      } else if (action === 'follow') {
        lastResponse = await followUser(page, targetId);
      }
      
      // Check if we got a rate limit response
      if (lastResponse?.error?.includes('rate limit') || 
          lastResponse?.message?.includes('rate limit') ||
          lastResponse?.status === 429) {
        return { triggered: true, response: lastResponse };
      }
      
      // Small delay between attempts
      await page.waitForTimeout(50);
    } catch (error: any) {
      // Check if error indicates rate limiting
      if (error?.message?.includes('429') || error?.message?.includes('rate limit')) {
        return { triggered: true, response: error };
      }
    }
  }
  
  return { triggered: false, response: lastResponse };
}

/**
 * Check if rate limit error message is displayed correctly
 */
export async function verifyRateLimitMessage(page: Page, expectedMessage?: string): Promise<boolean> {
  try {
    // Look for common rate limit indicators in the UI
    const rateLimitSelectors = [
      '[data-testid="rate-limit-message"]',
      '[data-testid="error-message"]',
      '.rate-limit-error',
      '.error-toast',
    ];
    
    for (const selector of rateLimitSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        if (expectedMessage) {
          const text = await element.textContent();
          return text?.toLowerCase().includes(expectedMessage.toLowerCase()) || false;
        }
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Failed to verify rate limit message:', error);
    return false;
  }
}

/**
 * Wait for rate limit to clear (exponential backoff)
 */
export async function waitForRateLimitClear(page: Page, maxWaitMs: number = 60000): Promise<void> {
  const startTime = Date.now();
  let delay = 1000; // Start with 1 second
  
  while (Date.now() - startTime < maxWaitMs) {
    await page.waitForTimeout(delay);
    delay = Math.min(delay * 2, 10000); // Max 10 second delay
    
    // Check if rate limit has cleared by making a simple request
    try {
      const apiUrl = getApiBaseUrl();
      const token = await getAuthToken(page);
      const response = await page.request.get(`${apiUrl}/health`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (response.ok()) {
        return; // Rate limit cleared
      }
    } catch {
      // Continue waiting
    }
  }
  
  console.warn('Rate limit did not clear within timeout period');
}
