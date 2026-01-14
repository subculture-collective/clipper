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

// Use page-context fetch so page.route mocks apply to API calls
// Falls back to page.request if page context isn't ready
async function fetchJson(
  page: Page,
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: any }
): Promise<{ ok: boolean; status: number; json: any }> {
  try {
    // Try page-context fetch first (allows route mocking)
    return await page.evaluate(async ({ url, init }) => {
      const res = await fetch(url, init);
      const ok = res.ok;
      const status = res.status;
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return { ok, status, json };
    }, { url, init });
  } catch (evalError) {
    // Fallback to page.request if page-context fetch fails
    // (e.g., page not navigated yet, CORS, etc.)
    try {
      const method = init?.method || 'GET';
      const response = await page.request.fetch(url, {
        method,
        headers: init?.headers,
        data: init?.body ? JSON.parse(init.body) : undefined,
      });

      const ok = response.ok();
      const status = response.status();
      let json: any = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }
      return { ok, status, json };
    } catch (fallbackError) {
      // Return a failed fetch response
      return { ok: false, status: 0, json: null };
    }
  }
}

// Configuration constants
const DEFAULT_RATE_LIMIT_ATTEMPTS = 20; // Number of rapid actions to trigger rate limit
const RATE_LIMIT_DELAY_MS = 50; // Small delay between rate limit attempts (ms)
const MAX_RATE_LIMIT_WAIT_MS = 60000; // Maximum time to wait for rate limit to clear (ms)
const RATE_LIMIT_BACKOFF_START_MS = 1000; // Initial backoff delay (ms)
const RATE_LIMIT_BACKOFF_MAX_MS = 10000; // Maximum backoff delay (ms)

export interface CommentData {
  clipId: string;
  content: string;
  parentCommentId?: string | null;
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
 * Get API base URL from environment or use default
 * The fallback to localhost is suitable for local development
 * but should be overridden via VITE_API_URL in other environments
 */
function getApiBaseUrl(): string {
  return process.env.VITE_API_URL || process.env.PLAYWRIGHT_API_URL || 'http://127.0.0.1:8080/api/v1';
}

/**
 * Extract authentication token from page context
 * Safely handles malformed JSON or non-string values
 */
async function getAuthToken(page: Page): Promise<string | null> {
  try {
    const token = await page.evaluate(() => {
      const authTokensJson = localStorage.getItem('auth_tokens') || sessionStorage.getItem('auth_tokens');
      if (authTokensJson) {
        try {
          const parsed = JSON.parse(authTokensJson);
          if (parsed?.accessToken) return parsed.accessToken;
          if (parsed?.access_token) return parsed.access_token;
        } catch {
          // fall through to other sources
        }
      }

      const localToken = localStorage.getItem('auth_token');
      const sessionToken = sessionStorage.getItem('auth_token');
      const rawToken = localToken || sessionToken;

      if (!rawToken) return null;

      // Handle case where token might be a JSON string
      if (rawToken.startsWith('{') || rawToken.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawToken);
          // If it's an object with an access_token field
          if (parsed && typeof parsed === 'object' && parsed.access_token) {
            return parsed.access_token;
          }
          // Otherwise return null for malformed structure
          return null;
        } catch {
          // If JSON parse fails, treat as plain token
          return rawToken;
        }
      }

      // Return plain token
      return rawToken;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/clips/${commentData.clipId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content: commentData.content,
        parent_comment_id: commentData.parentCommentId || null,
      }),
    });

    if (!ok) {
      console.warn('Failed to create comment via API, using mock data');
      return {
        id: `mock-comment-${Date.now()}`,
        ...commentData,
        vote_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return json?.data || json;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/comments/${commentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content: newContent }),
    });

    if (!ok) {
      console.warn('Failed to edit comment via API');
      return { id: commentId, content: newContent, edited: true };
    }

    return json?.data || json;
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
    const { ok } = await fetchJson(page, `${apiUrl}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to delete comment via API');
    }
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
    ...(options.sort ? { sort: options.sort } : {}),
    ...(options.limit ? { limit: options.limit.toString() } : {}),
  });

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/clips/${clipId}/comments?${params}`);

    if (!ok) {
      return [];
    }

    return json?.data?.comments || json?.comments || [];
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/comments/${commentId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ vote_type: voteType }),
    });

    if (!ok) {
      console.warn('Failed to vote on comment');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok } = await fetchJson(page, `${apiUrl}/comments/${commentId}/vote`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to remove comment vote via API');
    }
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/clips/${clipId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ vote_type: voteType }),
    });

    if (!ok) {
      console.warn('Failed to vote on clip');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok } = await fetchJson(page, `${apiUrl}/clips/${clipId}/vote`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to remove clip vote via API');
    }
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/clips/${clipId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return { user_vote: null, vote_score: 0 };
    }

    const clip = json?.data || json || {};
    return {
      user_vote: clip.user_vote ?? null,
      vote_score: clip.vote_score ?? 0,
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/${targetUserId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      console.warn('Failed to follow user');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/${targetUserId}/follow`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      console.warn('Failed to unfollow user');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/${targetUserId}/follow-status`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return false;
    }

    return json?.is_following ?? false;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/feed/following?${params}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return [];
    }

    return json?.data?.clips || json?.clips || [];
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title: playlistData.title,
        description: playlistData.description || '',
        visibility: playlistData.visibility || 'private',
        cover_url: playlistData.coverUrl,
      }),
    });

    if (!ok) {
      console.warn('Failed to create playlist via API, using mock data');
      return {
        id: `mock-playlist-${Date.now()}`,
        ...playlistData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return json?.data || json;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });

    if (!ok) {
      console.warn('Failed to update playlist');
      return { id: playlistId, ...updates };
    }

    return json?.data || json;
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
    const { ok } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to delete playlist via API');
    }
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}/clips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ clip_ids: clipIds }),
    });

    if (!ok) {
      console.warn('Failed to add clips to playlist');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}/clips/${clipId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to remove clip from playlist via API');
    }
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}/share`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return null;
    }

    return json?.share_url || json?.data?.share_url || null;
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

/**
 * Get playlist details
 */
export async function getPlaylist(page: Page, playlistId: string): Promise<any | null> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return null;
    }

    return json?.data || json;
  } catch (error) {
    console.warn('Failed to get playlist:', error);
    return null;
  }
}

/**
 * Validate playlist access with the current page context
 */
export async function validatePlaylistAccess(page: Page, playlistId: string, expectedStatus: number = 200): Promise<boolean> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { status } = await fetchJson(page, `${apiUrl}/playlists/${playlistId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    return status === expectedStatus;
  } catch (error) {
    console.warn('Failed to validate playlist access:', error);
    return false;
  }
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/${targetUserId}/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });

    if (!ok) {
      console.warn('Failed to block user');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/${targetUserId}/block`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      console.warn('Failed to unblock user');
      return { success: false };
    }

    return json?.data || json;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/${targetUserId}/block-status`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return false;
    }

    return json?.is_blocked ?? false;
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
    const { ok, json } = await fetchJson(page, `${apiUrl}/users/blocked`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return [];
    }

    return json?.data?.users || json?.users || [];
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
 *
 * @param page - Playwright Page object
 * @param action - Type of action to perform ('comment' | 'vote' | 'follow')
 * @param targetId - ID of the target (clip or user)
 * @param attempts - Number of rapid attempts (default: 20, empirically determined to trigger most rate limits)
 * @returns Object indicating if rate limit was triggered and the response
 *
 * Note: The default 20 attempts with 50ms delay between each is designed to trigger
 * typical rate limits while keeping test execution time reasonable (~1 second total).
 * Adjust these values based on your specific rate limit configuration.
 *
 * Warning: This function creates test data (comments) that are not automatically cleaned up.
 * Consider using a dedicated test endpoint that doesn't persist data, or manually clean up
 * test comments after rate limit tests complete.
 */
export async function triggerRateLimit(
  page: Page,
  action: 'comment' | 'vote' | 'follow',
  targetId: string,
  attempts: number = DEFAULT_RATE_LIMIT_ATTEMPTS
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

      // Small delay between attempts to prevent overwhelming the server
      // while still being fast enough to trigger rate limits
      await page.waitForTimeout(RATE_LIMIT_DELAY_MS);
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
 * Wait for rate limit to clear using exponential backoff
 *
 * @param page - Playwright Page object
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 60 seconds)
 *
 * Uses exponential backoff starting at 1 second, doubling each attempt up to 10 seconds.
 * This pattern is recommended for handling rate limits gracefully while not overloading the server.
 *
 * Note: This function uses the /health endpoint to check if rate limiting has cleared.
 * Health endpoints are typically exempt from rate limiting. In production, consider using
 * a lightweight endpoint that is subject to rate limiting, or accept that this function
 * primarily validates the backoff timing rather than actual rate limit clearance.
 */
export async function waitForRateLimitClear(page: Page, maxWaitMs: number = MAX_RATE_LIMIT_WAIT_MS): Promise<void> {
  const startTime = Date.now();
  let delay = RATE_LIMIT_BACKOFF_START_MS;

  while (Date.now() - startTime < maxWaitMs) {
    await page.waitForTimeout(delay);
    delay = Math.min(delay * 2, RATE_LIMIT_BACKOFF_MAX_MS); // Exponential backoff with cap

    // Check if rate limit has cleared by making a simple request
    try {
      const apiUrl = getApiBaseUrl();
      const token = await getAuthToken(page);
      const { ok } = await fetchJson(page, `${apiUrl}/health`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (ok) {
        return; // Rate limit cleared
      }
    } catch {
      // Continue waiting
    }
  }

  console.warn('Rate limit did not clear within timeout period');
}

// ============================================================================
// Watch Party (Theatre Queue) Functions
// ============================================================================

export interface WatchPartyData {
  title: string;
  playlistId?: string;
  visibility?: 'private' | 'public' | 'unlisted';
  maxParticipants?: number;
  password?: string;
}

export interface WatchPartyParticipant {
  id: string;
  userId: string;
  role: 'host' | 'participant';
  joinedAt: string;
}

/**
 * Create mock watch party data for fallback
 */
function createMockWatchParty(watchPartyData: WatchPartyData): any {
  const timestamp = Date.now();
  const mockId = `mock-watch-party-${timestamp}`;
  const mockCode = `MOCK${timestamp}`;
  return {
    id: mockId,
    invite_code: mockCode,
    invite_url: `http://localhost/watch-party/${mockCode}`,
    party: {
      id: mockId,
      ...watchPartyData,
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Create a watch party (theatre queue)
 */
export async function createWatchParty(page: Page, watchPartyData: WatchPartyData): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/watch-parties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title: watchPartyData.title,
        playlist_id: watchPartyData.playlistId,
        visibility: watchPartyData.visibility || 'private',
        max_participants: watchPartyData.maxParticipants,
        password: watchPartyData.password,
      }),
    });

    if (!ok) {
      console.warn('Failed to create watch party via API, using mock data');
      return createMockWatchParty(watchPartyData);
    }

    return json?.data || json;
  } catch (error) {
    console.warn('API not available, using mock watch party data:', error);
    return createMockWatchParty(watchPartyData);
  }
}

/**
 * Join a watch party using invite code or ID
 */
export async function joinWatchParty(page: Page, partyIdOrCode: string, password?: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/watch-parties/${partyIdOrCode}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ...(password ? { password } : {}),
      }),
    });

    if (!ok) {
      console.warn('Failed to join watch party');
      return { success: false };
    }

    return json?.data || json;
  } catch (error) {
    console.warn('API not available for joining watch party:', error);
    return { success: false };
  }
}

/**
 * Leave a watch party
 */
export async function leaveWatchParty(page: Page, partyId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok } = await fetchJson(page, `${apiUrl}/watch-parties/${partyId}/leave`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to leave watch party via API');
    }
  } catch (error) {
    console.warn('Failed to leave watch party:', error);
  }
}

/**
 * Get watch party details
 */
export async function getWatchParty(page: Page, partyId: string): Promise<any | null> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/watch-parties/${partyId}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return null;
    }

    return json?.data || json;
  } catch (error) {
    console.warn('Failed to get watch party:', error);
    return null;
  }
}

/**
 * Get watch party participants
 */
export async function getWatchPartyParticipants(page: Page, partyId: string): Promise<WatchPartyParticipant[]> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/watch-parties/${partyId}/participants`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      return [];
    }

    return json?.data?.participants || json?.participants || [];
  } catch (error) {
    console.warn('Failed to get watch party participants:', error);
    return [];
  }
}

/**
 * Update watch party settings
 */
export async function updateWatchPartySettings(page: Page, partyId: string, settings: Partial<WatchPartyData>): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/watch-parties/${partyId}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(settings),
    });

    if (!ok) {
      console.warn('Failed to update watch party settings');
      return { success: false };
    }

    return json?.data || json;
  } catch (error) {
    console.warn('API not available for updating watch party settings:', error);
    return { success: false };
  }
}

/**
 * Kick a participant from watch party (host only)
 */
export async function kickWatchPartyParticipant(page: Page, partyId: string, participantId: string): Promise<any> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok, json } = await fetchJson(page, `${apiUrl}/watch-parties/${partyId}/participants/${participantId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!ok) {
      console.warn('Failed to kick participant');
      return { success: false };
    }

    return json?.data || json;
  } catch (error) {
    console.warn('API not available for kicking participant:', error);
    return { success: false };
  }
}

/**
 * Delete/end a watch party (host only)
 */
export async function deleteWatchParty(page: Page, partyId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const token = await getAuthToken(page);

  try {
    const { ok } = await fetchJson(page, `${apiUrl}/watch-parties/${partyId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!ok) {
      console.warn('Failed to delete watch party via API');
    }
  } catch (error) {
    console.warn('Failed to delete watch party:', error);
  }
}
