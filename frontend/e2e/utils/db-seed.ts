import { Page } from '@playwright/test';

/**
 * Database Seeding Utilities
 * 
 * Provides functions for creating test data:
 * - Users
 * - Clips
 * - Submissions
 * - Comments
 * 
 * These utilities use API calls to seed data directly,
 * avoiding UI interactions for test data setup.
 * 
 * @example
 * ```typescript
 * import { createUser, createClip } from '@utils/db-seed';
 * 
 * const user = await createUser(page, { username: 'testuser' });
 * const clip = await createClip(page, { title: 'Test Clip' });
 * ```
 */

export interface UserData {
  username?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: 'user' | 'moderator' | 'admin';
}

export interface ClipData {
  title?: string;
  url?: string;
  thumbnailUrl?: string;
  streamerName?: string;
  game?: string;
  description?: string;
  tags?: string[];
  duration?: number;
}

export interface SubmissionData {
  clipUrl: string;
  title?: string;
  description?: string;
  tags?: string[];
  userId?: string;
}

export interface CommentData {
  clipId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
}

/**
 * Get API base URL from environment or page context
 */
function getApiBaseUrl(): string {
  const envUrl = process.env.VITE_API_URL;

  if (!envUrl) {
    console.warn(
      'VITE_API_URL is not set; falling back to default http://localhost:8080/api/v1'
    );
  }

  return envUrl || 'http://localhost:8080/api/v1';
}

/**
 * Create a test user
 * 
 * @param page - Playwright Page object (for context and cookies)
 * @param userData - User data to create
 * @returns Promise that resolves to created user object
 */
export async function createUser(page: Page, userData: UserData = {}): Promise<any> {
  const apiUrl = getApiBaseUrl();
  
  const defaultUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    displayName: userData.displayName || 'Test User',
    avatarUrl: userData.avatarUrl || 'https://via.placeholder.com/150',
    role: userData.role || 'user',
    ...userData,
  };
  
  try {
    const response = await page.request.post(`${apiUrl}/admin/users`, {
      data: defaultUser,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to create user via API, using mock data');
      return { id: `mock-${Date.now()}`, ...defaultUser };
    }
    
    return await response.json();
  } catch (error) {
    console.warn('API not available, using mock user data:', error);
    return { id: `mock-${Date.now()}`, ...defaultUser };
  }
}

/**
 * Create a test clip
 * 
 * @param page - Playwright Page object
 * @param clipData - Clip data to create
 * @returns Promise that resolves to created clip object
 */
export async function createClip(page: Page, clipData: ClipData = {}): Promise<any> {
  const apiUrl = getApiBaseUrl();
  
  const defaultClip = {
    title: clipData.title || `Test Clip ${Date.now()}`,
    url: clipData.url || `https://clips.twitch.tv/test-${Date.now()}`,
    thumbnailUrl: clipData.thumbnailUrl || 'https://via.placeholder.com/640x360',
    streamerName: clipData.streamerName || 'TestStreamer',
    game: clipData.game || 'Test Game',
    description: clipData.description || 'This is a test clip',
    tags: clipData.tags || ['test', 'e2e'],
    duration: clipData.duration || 30,
    viewCount: 0,
    likeCount: 0,
    ...clipData,
  };
  
  try {
    const response = await page.request.post(`${apiUrl}/admin/clips`, {
      data: defaultClip,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to create clip via API, using mock data');
      return { id: `mock-clip-${Date.now()}`, ...defaultClip };
    }
    
    return await response.json();
  } catch (error) {
    console.warn('API not available, using mock clip data:', error);
    return { id: `mock-clip-${Date.now()}`, ...defaultClip };
  }
}

/**
 * Create a test submission
 * 
 * @param page - Playwright Page object
 * @param submissionData - Submission data to create
 * @returns Promise that resolves to created submission object
 */
export async function createSubmission(
  page: Page,
  submissionData: SubmissionData
): Promise<any> {
  const apiUrl = getApiBaseUrl();
  
  const defaultSubmission = {
    title: submissionData.title || `Test Submission ${Date.now()}`,
    description: submissionData.description || 'Test submission description',
    tags: submissionData.tags || ['test'],
    status: 'pending',
    ...submissionData,
  };
  
  try {
    const response = await page.request.post(`${apiUrl}/submissions`, {
      data: defaultSubmission,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to create submission via API, using mock data');
      return { id: `mock-submission-${Date.now()}`, ...defaultSubmission };
    }
    
    return await response.json();
  } catch (error) {
    console.warn('API not available, using mock submission data:', error);
    return { id: `mock-submission-${Date.now()}`, ...defaultSubmission };
  }
}

/**
 * Create a test comment
 * 
 * @param page - Playwright Page object
 * @param commentData - Comment data to create
 * @returns Promise that resolves to created comment object
 */
export async function createComment(page: Page, commentData: CommentData): Promise<any> {
  const apiUrl = getApiBaseUrl();
  
  try {
    const response = await page.request.post(`${apiUrl}/clips/${commentData.clipId}/comments`, {
      data: {
        content: commentData.content,
        parentCommentId: commentData.parentCommentId,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok()) {
      console.warn('Failed to create comment via API, using mock data');
      return { id: `mock-comment-${Date.now()}`, ...commentData };
    }
    
    return await response.json();
  } catch (error) {
    console.warn('API not available, using mock comment data:', error);
    return { id: `mock-comment-${Date.now()}`, ...commentData };
  }
}

/**
 * Delete a user (cleanup)
 * 
 * @param page - Playwright Page object
 * @param userId - ID of user to delete
 */
export async function deleteUser(page: Page, userId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  
  try {
    await page.request.delete(`${apiUrl}/admin/users/${userId}`);
  } catch (error) {
    console.warn('Failed to delete user:', error);
  }
}

/**
 * Delete a clip (cleanup)
 * 
 * @param page - Playwright Page object
 * @param clipId - ID of clip to delete
 */
export async function deleteClip(page: Page, clipId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  
  try {
    await page.request.delete(`${apiUrl}/admin/clips/${clipId}`);
  } catch (error) {
    console.warn('Failed to delete clip:', error);
  }
}

/**
 * Delete a submission (cleanup)
 * 
 * @param page - Playwright Page object
 * @param submissionId - ID of submission to delete
 */
export async function deleteSubmission(page: Page, submissionId: string): Promise<void> {
  const apiUrl = getApiBaseUrl();
  
  try {
    await page.request.delete(`${apiUrl}/submissions/${submissionId}`);
  } catch (error) {
    console.warn('Failed to delete submission:', error);
  }
}

/**
 * Seed multiple test clips
 * 
 * @param page - Playwright Page object
 * @param count - Number of clips to create
 * @param clipData - Base clip data (will be varied for each clip)
 * @returns Promise that resolves to array of created clips
 */
export async function seedClips(
  page: Page,
  count: number = 10,
  clipData: Partial<ClipData> = {}
): Promise<any[]> {
  const clips = [];
  
  for (let i = 0; i < count; i++) {
    const clip = await createClip(page, {
      ...clipData,
      title: `${clipData.title || 'Test Clip'} ${i + 1}`,
      url: `https://clips.twitch.tv/test-${Date.now()}-${i}`,
    });
    clips.push(clip);
  }
  
  return clips;
}

/**
 * Seed multiple submissions for a user
 * 
 * **Note:** This function requires the page context to have valid authentication
 * credentials (cookies/headers) if the API enforces authentication. Ensure the
 * test has set up authentication before calling this function, or use it with
 * test fixtures that provide authenticated pages.
 * 
 * @param page - Playwright Page object with authentication context
 * @param userId - User ID to create submissions for
 * @param count - Number of submissions to create
 * @returns Promise that resolves to array of created submissions
 */
export async function seedSubmissions(
  page: Page,
  userId: string,
  count: number = 10
): Promise<any[]> {
  const submissions = [];
  
  for (let i = 0; i < count; i++) {
    const submission = await createSubmission(page, {
      clipUrl: `https://clips.twitch.tv/test-${Date.now()}-${i}`,
      title: `Test Submission ${i + 1}`,
      description: `Test submission description ${i + 1}`,
      tags: ['test', 'e2e'],
      userId,
    });
    submissions.push(submission);
  }
  
  return submissions;
}

/**
 * Clear all test data (cleanup helper)
 * 
 * Note: This is a destructive operation. Only use in test environments.
 * 
 * **Security:** Requires the ALLOW_TEST_DATA_CLEAR environment variable to be set to 'true'.
 * This prevents accidental data deletion in non-test environments.
 * 
 * **Usage:**
 * ```bash
 * ALLOW_TEST_DATA_CLEAR=true npm run test:e2e
 * ```
 * 
 * @param page - Playwright Page object
 */
export async function clearTestData(page: Page): Promise<void> {
  const apiUrl = getApiBaseUrl();
  const allowClear = process.env.ALLOW_TEST_DATA_CLEAR === 'true';

  if (!allowClear) {
    console.warn(
      'clearTestData was called but ALLOW_TEST_DATA_CLEAR is not set to "true". Skipping test data deletion.'
    );
    return;
  }
  
  try {
    // Only clear test data in non-production environments
    if (apiUrl.includes('localhost') || apiUrl.includes('test')) {
      await page.request.delete(`${apiUrl}/admin/test-data`);
    } else {
      console.warn(
        `clearTestData was allowed by environment variable but API base URL "${apiUrl}" does not look like a test environment. Skipping test data deletion.`
      );
    }
  } catch (error) {
    console.warn('Failed to clear test data:', error);
  }
}


