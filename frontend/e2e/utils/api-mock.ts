import { Page, Route } from '@playwright/test';

/**
 * API Mocking Utilities
 *
 * Provides functions for intercepting and mocking API requests:
 * - Mock authentication endpoints
 * - Mock clip data
 * - Mock search results
 * - Mock error responses
 *
 * @example
 * ```typescript
 * import { mockClipsEndpoint, mockAuthEndpoint } from '@utils/api-mock';
 *
 * await mockClipsEndpoint(page, { clips: mockClips });
 * await mockAuthEndpoint(page, { authenticated: true });
 * ```
 */

export interface MockClip {
    id: string;
    title: string;
    url: string;
    thumbnailUrl: string;
    streamerName: string;
    game: string;
    viewCount: number;
    likeCount: number;
    createdAt: string;
}

export interface MockUser {
    id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl: string;
    role: string;
}

/**
 * Mock clips list endpoint
 *
 * @param page - Playwright Page object
 * @param options - Mock data options
 */
export async function mockClipsEndpoint(
    page: Page,
    options: {
        clips?: MockClip[];
        total?: number;
        page?: number;
        limit?: number;
    } = {},
): Promise<void> {
    const defaultClips: MockClip[] = [
        {
            id: 'clip-1',
            title: 'Amazing Gameplay Moment',
            url: 'https://clips.twitch.tv/mock-clip-1',
            thumbnailUrl: 'https://via.placeholder.com/640x360',
            streamerName: 'TestStreamer1',
            game: 'Test Game',
            viewCount: 1000,
            likeCount: 50,
            createdAt: new Date().toISOString(),
        },
        {
            id: 'clip-2',
            title: 'Epic Victory Royale',
            url: 'https://clips.twitch.tv/mock-clip-2',
            thumbnailUrl: 'https://via.placeholder.com/640x360',
            streamerName: 'TestStreamer2',
            game: 'Test Game 2',
            viewCount: 2000,
            likeCount: 100,
            createdAt: new Date().toISOString(),
        },
    ];

    await page.route('**/api/v1/clips**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                clips: options.clips || defaultClips,
                total:
                    options.total ||
                    (options.clips?.length ?? defaultClips.length),
                page: options.page || 1,
                limit: options.limit || 20,
            }),
        });
    });
}

/**
 * Mock authentication endpoint
 *
 * @param page - Playwright Page object
 * @param options - Authentication state
 */
export async function mockAuthEndpoint(
    page: Page,
    options: {
        authenticated?: boolean;
        user?: MockUser;
    } = {},
): Promise<void> {
    const defaultUser: MockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: 'https://via.placeholder.com/150',
        role: 'user',
    };

    await page.route('**/api/v1/auth/**', async (route: Route) => {
        const url = route.request().url();

        // Block test-login when simulating unauthenticated state
        if (url.includes('/test-login')) {
            if (options.authenticated === false) {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'Not authenticated',
                    }),
                });
            } else {
                await route.continue();
            }
            return;
        }

        if (url.includes('/me') || url.includes('/user')) {
            if (options.authenticated !== false) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        user: options.user || defaultUser,
                    }),
                });
            } else {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: 'Not authenticated',
                    }),
                });
            }
        } else {
            await route.continue();
        }
    });
}

/**
 * Mock search endpoint
 *
 * @param page - Playwright Page object
 * @param options - Search results
 */
export async function mockSearchEndpoint(
    page: Page,
    options: {
        results?: MockClip[];
        query?: string;
        total?: number;
    } = {},
): Promise<void> {
    await page.route('**/api/v1/search**', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                results: options.results || [],
                query: options.query || '',
                total: options.total || 0,
            }),
        });
    });
}

/**
 * Mock clip detail endpoint
 *
 * @param page - Playwright Page object
 * @param clipId - Clip ID to mock
 * @param clip - Clip data
 */
export async function mockClipDetailEndpoint(
    page: Page,
    clipId: string,
    clip: Partial<MockClip>,
): Promise<void> {
    const defaultClip: MockClip = {
        id: clipId,
        title: 'Mock Clip Title',
        url: 'https://clips.twitch.tv/mock-clip',
        thumbnailUrl: 'https://via.placeholder.com/640x360',
        streamerName: 'TestStreamer',
        game: 'Test Game',
        viewCount: 1000,
        likeCount: 50,
        createdAt: new Date().toISOString(),
        ...clip,
    };

    await page.route(`**/api/v1/clips/${clipId}`, async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(defaultClip),
        });
    });
}

/**
 * Mock error response for any endpoint
 *
 * @param page - Playwright Page object
 * @param pattern - URL pattern to match
 * @param statusCode - HTTP status code
 * @param errorMessage - Error message
 */
export async function mockErrorResponse(
    page: Page,
    pattern: string | RegExp,
    statusCode: number = 500,
    errorMessage: string = 'Internal Server Error',
): Promise<void> {
    await page.route(pattern, async (route: Route) => {
        await route.fulfill({
            status: statusCode,
            contentType: 'application/json',
            body: JSON.stringify({
                success: false,
                error: errorMessage,
            }),
        });
    });
}

/**
 * Mock submission endpoint
 *
 * @param page - Playwright Page object
 * @param options - Submission response options
 */
export async function mockSubmissionEndpoint(
    page: Page,
    options: {
        success?: boolean;
        submissionId?: string;
        error?: string;
    } = {},
): Promise<void> {
    await page.route('**/api/v1/submissions', async (route: Route) => {
        if (route.request().method() === 'POST') {
            if (options.success !== false) {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        submission: {
                            id: options.submissionId || 'submission-1',
                            status: 'pending',
                            createdAt: new Date().toISOString(),
                        },
                    }),
                });
            } else {
                await route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: false,
                        error: options.error || 'Submission failed',
                    }),
                });
            }
        } else {
            await route.continue();
        }
    });
}

/**
 * Mock like/vote endpoint
 *
 * @param page - Playwright Page object
 */
export async function mockLikeEndpoint(page: Page): Promise<void> {
    await page.route('**/api/v1/clips/*/like', async (route: Route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                liked: true,
                likeCount: 51,
            }),
        });
    });
}

/**
 * Mock comment endpoints
 *
 * @param page - Playwright Page object
 * @param clipId - Clip ID
 * @param comments - Mock comments
 */
export async function mockCommentsEndpoint(
    page: Page,
    clipId: string,
    comments: any[] = [],
): Promise<void> {
    // GET comments
    await page.route(
        `**/api/v1/clips/${clipId}/comments`,
        async (route: Route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        comments,
                        total: comments.length,
                    }),
                });
            } else if (route.request().method() === 'POST') {
                // POST comment
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        comment: {
                            id: `comment-${Date.now()}`,
                            content: 'Test comment',
                            createdAt: new Date().toISOString(),
                        },
                    }),
                });
            } else {
                await route.continue();
            }
        },
    );
}

/**
 * Clear all route mocks
 *
 * @param page - Playwright Page object
 */
export async function clearAllMocks(page: Page): Promise<void> {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
}

/**
 * Mock network delay for endpoint
 *
 * @param page - Playwright Page object
 * @param pattern - URL pattern to match
 * @param delayMs - Delay in milliseconds
 */
export async function mockNetworkDelay(
    page: Page,
    pattern: string | RegExp,
    delayMs: number,
): Promise<void> {
    await page.route(pattern, async (route: Route) => {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        await route.continue();
    });
}
