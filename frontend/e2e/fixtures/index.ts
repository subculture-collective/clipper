/*
 * Disable react-hooks/rules-of-hooks - ESLint incorrectly flags Playwright's fixture `use`
 * as a React hook. This is a false positive - these are Playwright test fixtures, not React hooks.
 * See: https://github.com/microsoft/playwright/issues/17239
 */
/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, Page, Route, Request } from '@playwright/test';
import {
    LoginPage,
    HomePage,
    ClipPage,
    SubmitClipPage,
    AdminModerationPage,
    SearchPage,
} from '../pages';
import { login, isAuthenticated, dismissCookieBanner } from '../utils/auth';
import {
    createUser,
    createClip,
    createSubmission,
    deleteUser,
    deleteClip,
    deleteSubmission,
} from '../utils/db-seed';
import {
    createMultiUserContexts,
    closeMultiUserContexts,
    MultiUserContext,
} from './multi-user-context';
import {
    apiRequest,
    apiRequestJson,
    createTestUser as apiCreateTestUser,
    createTestClip as apiCreateTestClip,
    createTestChannel as apiCreateTestChannel,
    getApiUrl,
} from './api-utils';

/**
 * Custom Test Fixtures
 *
 * Extends Playwright's test object with:
 * - Page Objects (loginPage, homePage, clipPage)
 * - Authenticated user context
 * - Test data (users, clips)
 * - Automatic cleanup
 *
 * @example
 * ```typescript
 * import { test, expect } from '@fixtures';
 *
 * test('should display clips', async ({ homePage }) => {
 *   await homePage.goto();
 *   await homePage.verifyClipsVisible();
 * });
 *
 * test('authenticated user can like clips', async ({ authenticatedPage, clipPage }) => {
 *   await clipPage.goto('clip-id');
 *   await clipPage.likeClip();
 * });
 * ```
 */

type CustomFixtures = {
    // Page Objects
    loginPage: LoginPage;
    homePage: HomePage;
    clipPage: ClipPage;
    submitClipPage: SubmitClipPage;
    adminModerationPage: AdminModerationPage;
    searchPage: SearchPage;

    // Authenticated context
    authenticatedPage: Page;
    authenticatedUser: any;
    adminUser: any;

    // Multi-user fixtures for testing permissions
    multiUserContexts: Record<string, MultiUserContext>;

    // API utilities
    apiUrl: string;
    apiUtils: {
        request: (endpoint: string, options?: any) => Promise<Response>;
        requestJson: (endpoint: string, options?: any) => Promise<any>;
        createUser: (data?: any) => Promise<any>;
        createClip: (data?: any) => Promise<any>;
        createChannel: (data?: any) => Promise<any>;
    };

    // Test data
    testUser: any;
    testClip: any;
    testSubmission: any;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
    /**
     * Base page fixture override
     * Installs social API mocks (and keeps any other route handlers) before use
     */
    page: async ({ page }, use) => {
        await enableSocialMocks(page);
        await use(page);
    },

    /**
     * LoginPage fixture
     * Automatically initialized for each test
     */
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },

    /**
     * HomePage fixture
     * Automatically initialized for each test
     */
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },

    /**
     * ClipPage fixture
     * Automatically initialized for each test
     */
    clipPage: async ({ page }, use) => {
        const clipPage = new ClipPage(page);
        await use(clipPage);
    },

    /**
     * SubmitClipPage fixture
     * Automatically initialized for each test
     */
    submitClipPage: async ({ page }, use) => {
        const submitClipPage = new SubmitClipPage(page);
        await use(submitClipPage);
    },

    /**
     * AdminModerationPage fixture
     * Automatically initialized for each test
     */
    adminModerationPage: async ({ page }, use) => {
        const adminModerationPage = new AdminModerationPage(page);
        await use(adminModerationPage);
    },

    /**
     * SearchPage fixture
     * Automatically initialized for each test
     */
    searchPage: async ({ page }, use, testInfo) => {
        // Detect if we're in a failover test suite
        const isFailoverTest =
            testInfo.title.includes('Failover Mode') ||
            testInfo.titlePath.some(t => t.includes('Failover Mode'));

        // Enable lightweight search API mocks to stabilize e2e when backend is unavailable
        await enableSearchMocks(page, isFailoverTest);
        const searchPage = new SearchPage(page);
        await use(searchPage);
    },

    /**
     * Authenticated page fixture
     * Provides a page with user already logged in
     *
     * Note: In a real implementation, you would:
     * 1. Load stored authentication state
     * 2. Or perform actual login before tests
     * 3. And save the state for reuse
     */
    authenticatedPage: async ({ page }, use) => {
        // First navigate to home to trigger any auto-login from E2E test mode
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Give the app more time to complete auto-login
        await page.waitForTimeout(1000);

        // Check if auto-login already authenticated the user
        let isAuth = await isAuthenticated(page);

        if (!isAuth) {
            // Attempt deterministic test login via API (avoids flaky UI OAuth)
            const apiUrl = getApiUrl();
            const testUser = process.env.VITE_E2E_TEST_USER || 'user1_e2e';
            try {
                // Use page.evaluate to call the API from within the browser context
                // This ensures cookies are properly set for the browser session
                const response = await page.evaluate(
                    async ({ apiUrl, testUser }) => {
                        try {
                            const resp = await fetch(
                                `${apiUrl}/api/v1/auth/test-login`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        username: testUser,
                                    }),
                                    credentials: 'include',
                                },
                            );
                            return { ok: resp.ok, status: resp.status };
                        } catch (e) {
                            return { ok: false, status: 0, error: String(e) };
                        }
                    },
                    { apiUrl, testUser },
                );

                if (!response.ok) {
                    console.warn(
                        '[authenticatedPage] test-login failed:',
                        response.status,
                    );
                } else {
                    // Navigate once to let app read cookies and populate auth context
                    await page.goto('/');
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(500);
                    isAuth = await isAuthenticated(page);
                }
            } catch (error) {
                console.warn('[authenticatedPage] test-login error:', error);
            }
        }

        // Fallback: try UI login (best-effort)
        if (!isAuth) {
            try {
                // Dismiss cookie banner before attempting login
                await dismissCookieBanner(page);
                await login(page);
                isAuth = await isAuthenticated(page);
            } catch (error) {
                console.warn(
                    'Could not authenticate page via UI login:',
                    error,
                );
            }
        }

        await use(page);
    },

    /**
     * Authenticated user fixture
     * Creates a test user and logs them in
     */
    authenticatedUser: async ({ page }: any, use: any) => {
        // Create a test user
        const user = await createUser(page, {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
        });

        // Use the user in tests
        await use(user);

        // Cleanup: delete the user after tests
        if (user.id && !user.id.startsWith('mock-')) {
            try {
                await deleteUser(page, user.id);
            } catch (error) {
                console.warn('Could not delete test user:', error);
            }
        }
    },

    /**
     * Test user fixture
     * Creates a user without authentication
     * Automatically cleans up after test
     */
    testUser: async ({ page }: any, use: any) => {
        const user = await createUser(page);
        await use(user);

        // Cleanup
        if (user.id && !user.id.startsWith('mock-')) {
            try {
                await deleteUser(page, user.id);
            } catch (error) {
                console.warn('Could not delete test user:', error);
            }
        }
    },

    /**
     * Admin user fixture
     * Creates an admin user for testing admin features
     * Automatically cleans up after test
     */
    adminUser: async ({ page }: any, use: any) => {
        const user = await createUser(page, {
            username: `admin_${Date.now()}`,
            email: `admin_${Date.now()}@example.com`,
            role: 'admin',
        });

        await use(user);

        // Cleanup
        if (user.id && !user.id.startsWith('mock-')) {
            try {
                await deleteUser(page, user.id);
            } catch (error) {
                console.warn('Could not delete admin user:', error);
            }
        }
    },

    /**
     * Test clip fixture
     * Creates a clip for testing
     * Automatically cleans up after test
     */
    testClip: async ({ page }: any, use: any) => {
        const clip = await createClip(page, {
            title: `Test Clip ${Date.now()}`,
            streamerName: 'TestStreamer',
            game: 'Test Game',
        });

        await use(clip);

        // Cleanup
        if (clip.id && !clip.id.startsWith('mock-')) {
            try {
                await deleteClip(page, clip.id);
            } catch (error) {
                console.warn('Could not delete test clip:', error);
            }
        }
    },

    /**
     * Test submission fixture
     * Creates a submission for testing
     * Automatically cleans up after test
     */
    testSubmission: async ({ page, testUser }: any, use: any) => {
        const submission = await createSubmission(page, {
            clipUrl: `https://clips.twitch.tv/test-${Date.now()}`,
            title: `Test Submission ${Date.now()}`,
            description: 'Test submission description',
            tags: ['test', 'e2e'],
            userId: testUser.id,
        });

        await use(submission);

        // Cleanup
        if (submission.id && !submission.id.startsWith('mock-')) {
            try {
                await deleteSubmission(page, submission.id);
            } catch (error) {
                console.warn('Could not delete test submission:', error);
            }
        }
    },

    /**
     * Multi-user contexts fixture
     * Creates isolated browser contexts for different test users
     * Useful for testing role-based permissions and multi-user scenarios
     */
    multiUserContexts: async ({ browser }, use) => {
        const baseUrl =
            process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
        const contexts = await createMultiUserContexts(browser, baseUrl, [
            'admin',
            'moderator',
            'member',
            'regular',
            'secondary',
        ]);

        await use(contexts);

        await closeMultiUserContexts(contexts);
    },

    /**
     * API utilities fixture
     * Provides helper functions for API requests in tests
     */
    apiUtils: async ({ page }, use) => {
        await use({
            request: (endpoint: string, options?: any) =>
                apiRequest(page, endpoint, options),
            requestJson: (endpoint: string, options?: any) =>
                apiRequestJson(page, endpoint, options),
            createUser: (data?: any) => apiCreateTestUser(page, data),
            createClip: (data?: any) => apiCreateTestClip(page, data),
            createChannel: (data?: any) => apiCreateTestChannel(page, data),
        });
    },

    /**
     * API URL fixture
     * Provides the base API URL for the test environment
     */
    apiUrl: async ({ page }, use) => {
        const baseUrl =
            process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
        await use(getApiUrl(baseUrl));
    },
});

/**
 * Re-export expect for convenience
 */
export { expect } from '@playwright/test';

// ---------------------------------------------------------------
// Local helpers: mock search API routes for e2e stability
// ---------------------------------------------------------------
async function enableSearchMocks(page: Page, isFailoverMode: boolean = false) {
    // Allow opt-out via env flag if needed
    const disable = process.env.PLAYWRIGHT_DISABLE_SEARCH_MOCKS === '1';
    if (disable) return;

    // Suggestions
    await page.route(
        url => {
            const { pathname } = new URL(url);
            return /\/api\/v\d+\/search\/suggestions\/?$/.test(pathname);
        },
        async (route: Route, request: Request) => {
            const url = new URL(request.url());
            const q = url.searchParams.get('q') || '';
            const base = q || 'game';
            const suggestions = [
                { text: base, type: 'query' },
                { text: `${base} highlights`, type: 'query' },
                { text: 'Valorant', type: 'game' },
                { text: 'Shroud', type: 'creator' },
                { text: 'clutch', type: 'tag' },
            ];
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ query: q, suggestions }),
            });
        },
    );

    // Universal search
    await page.route(
        url => {
            const { pathname } = new URL(url);
            return /\/api\/v\d+\/search\/?$/.test(pathname);
        },
        async (route: Route, request: Request) => {
            // Do not intercept document navigations to /search (only mock XHR/fetch)
            const type = request.resourceType();
            if (type === 'document') {
                return route.fallback();
            }

            // In failover mode, return 503 Service Unavailable to trigger error handling
            if (isFailoverMode) {
                await route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Service Temporarily Unavailable',
                        message:
                            'Search service is currently experiencing issues. Please try again later.',
                    }),
                });
                return;
            }

            const url = new URL(request.url());
            const q = url.searchParams.get('q') || '';
            const pageParam =
                parseInt(url.searchParams.get('page') || '1', 10) || 1;
            const limit =
                parseInt(url.searchParams.get('limit') || '20', 10) || 20;

            // Return empty results for non-existent queries
            const isNonExistentQuery =
                q &&
                /xyzabc123nonexistent|very.*rare.*query|gibberish/i.test(q);

            // Generate deterministic mock clips
            const totalItems = isNonExistentQuery ? 0 : 45; // ensure multiple pages
            const totalPages = Math.ceil(totalItems / limit);
            const start = (pageParam - 1) * limit;
            const end = Math.min(start + limit, totalItems);
            const clips = [] as any[];
            for (let i = start; i < end; i++) {
                clips.push({
                    id: `mock-clip-${i + 1}`,
                    title: q ? `${q} Clip ${i + 1}` : `Clip ${i + 1}`,
                    twitch_clip_id: `mock${i + 1}`,
                    twitch_clip_url: `https://clips.twitch.tv/mock${i + 1}`,
                    thumbnail_url: 'https://via.placeholder.com/640x360',
                    creator_name: `Creator${(i % 5) + 1}`,
                    game_id: `game-${(i % 3) + 1}`,
                    game_name: ['Valorant', 'CS:GO', 'LoL'][i % 3],
                    created_at: new Date(
                        Date.now() - i * 1000 * 60,
                    ).toISOString(),
                    vote_score: (i % 10) - 5,
                    user_vote: 0,
                    is_favorited: false,
                    duration: 30 + (i % 60),
                    is_nsfw: false,
                    is_featured: i % 13 === 0,
                    comment_count: (i * 7) % 50,
                    favorite_count: (i * 3) % 100,
                    view_count: 100 + i * 10,
                });
            }

            const creators = Array.from({ length: 5 }).map((_, idx) => ({
                id: `creator-${idx + 1}`,
                display_name: `Creator ${idx + 1}`,
                username: `creator${idx + 1}`,
                avatar_url: 'https://via.placeholder.com/96',
                bio: `Bio for creator ${idx + 1}`,
                karma_points: 100 + idx * 10,
            }));

            const games = ['Valorant', 'CS:GO', 'LoL'].map((name, idx) => ({
                id: `game-${idx + 1}`,
                name,
                clip_count: 10 + idx * 5,
            }));

            const tags = ['clutch', 'ace', 'highlight'].map((name, idx) => ({
                id: `tag-${idx + 1}`,
                name,
                usage_count: 20 + idx * 5,
                color: undefined,
            }));

            const response = {
                query: q,
                results: {
                    clips,
                    creators,
                    games,
                    tags,
                },
                counts: {
                    clips: totalItems,
                    creators: creators.length,
                    games: games.length,
                    tags: tags.length,
                },
                facets: {
                    languages: [
                        { key: 'en', label: 'English', count: 20 },
                        { key: 'es', label: 'Spanish', count: 10 },
                    ],
                    games: [
                        { key: 'Valorant', label: 'Valorant', count: 15 },
                        { key: 'CS:GO', label: 'CS:GO', count: 12 },
                    ],
                    date_range: {
                        last_hour: 2,
                        last_day: 8,
                        last_week: 20,
                        last_month: 15,
                        older: 0,
                    },
                },
                meta: {
                    page: pageParam,
                    limit,
                    total_items: totalItems,
                    total_pages: totalPages,
                },
            };

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(response),
            });
        },
    );
}

// ---------------------------------------------------------------
// Local helpers: mock social API routes for e2e stability
// ---------------------------------------------------------------
async function enableSocialMocks(page: Page) {
    const disable = process.env.PLAYWRIGHT_DISABLE_SOCIAL_MOCKS === '1';
    if (disable) return;

    const comments = new Map<string, any>();
    const clips = new Map<string, any>();
    const playlists = new Map<string, any>();
    const follows = new Set<string>();
    const blocked = new Set<string>();
    let commentCounter = 1;
    let playlistCounter = 1;
    let clipCounter = 1;

    // Track auth state for mock auth handling
    let isAuthenticated = false;
    const mockUser = {
        id: 'mock-user-1',
        username: 'user1_e2e',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        twitch_id: 'twitch-123',
        avatar_url: 'https://via.placeholder.com/96',
        created_at: new Date().toISOString(),
        karma_points: 100,
    };

    const makeClip = (id: string, base: any = {}) => {
        const clip = {
            id,
            title: base.title || `Mock Clip ${id}`,
            vote_score: base.vote_score ?? 0,
            user_vote: base.user_vote ?? 0,
            is_favorited: false,
            comment_count: base.comment_count ?? 0,
            ...base,
        };
        clips.set(id, clip);
        return clip;
    };

    // Seed a default clip to mirror fixtures using testClip
    makeClip('mock-clip-default');

    await page.route('**/*', async (route: Route, request: Request) => {
        const url = new URL(request.url());
        const { pathname, searchParams } = url;
        const method = request.method();

        // Only intercept API calls (common base /api/v1)
        if (!pathname.includes('/api/')) {
            return route.fallback();
        }

        // Auth test-login endpoint - sets mock auth state
        if (pathname.endsWith('/auth/test-login') && method === 'POST') {
            isAuthenticated = true;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    user: mockUser,
                    message: 'Test login successful',
                }),
                headers: {
                    'Set-Cookie':
                        'session=mock-session-token; Path=/; HttpOnly',
                },
            });
        }

        // Auth me endpoint - returns current auth state
        if (pathname.endsWith('/auth/me') && method === 'GET') {
            if (isAuthenticated) {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(mockUser),
                });
            }
            return route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'unauthenticated' }),
            });
        }

        // Auth logout endpoint
        if (pathname.endsWith('/auth/logout') && method === 'POST') {
            isAuthenticated = false;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        }

        // Admin users
        if (pathname.endsWith('/admin/users') && method === 'POST') {
            const body = request.postDataJSON?.() || {};
            const id = body.id || `mock-user-${Date.now()}`;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ id, ...body }),
            });
        }

        if (pathname.match(/\/admin\/users\/[^/]+$/) && method === 'DELETE') {
            return route.fulfill({ status: 204 });
        }

        // Admin clips
        if (pathname.endsWith('/admin/clips') && method === 'POST') {
            const body = request.postDataJSON?.() || {};
            const id = body.id || `mock-clip-${clipCounter++}`;
            const clip = makeClip(id, body);
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(clip),
            });
        }

        if (pathname.match(/\/admin\/clips\/[^/]+$/) && method === 'DELETE') {
            const [, clipId] = pathname.match(/\/admin\/clips\/([^/]+)$/) || [];
            if (clipId) {
                clips.delete(clipId);
            }
            return route.fulfill({ status: 204 });
        }

        // Submissions
        if (pathname.endsWith('/submissions') && method === 'POST') {
            const body = request.postDataJSON?.() || {};
            const submission = {
                id: `mock-submission-${Date.now()}`,
                user_id: 'mock-user',
                twitch_clip_id: `mock-clip-${Date.now()}`,
                twitch_clip_url:
                    body.clip_url ||
                    body.clipUrl ||
                    'https://clips.twitch.tv/test',
                title: body.title || 'Test Submission',
                custom_title: body.custom_title,
                tags: body.tags || [],
                is_nsfw: Boolean(body.is_nsfw),
                submission_reason: body.submission_reason,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    success: true,
                    message: 'Submission created',
                    submission,
                }),
            });
        }

        // Comments
        const clipCommentsMatch = pathname.match(/\/clips\/([^/]+)\/comments$/);
        if (clipCommentsMatch) {
            const clipId = clipCommentsMatch[1];

            if (method === 'POST') {
                const body = request.postDataJSON?.() || {};
                const id = `mock-comment-${commentCounter++}`;
                const comment = {
                    id,
                    clip_id: clipId,
                    content: body.content || 'mock comment',
                    parent_comment_id:
                        body.parent_comment_id || body.parentCommentId || null,
                    vote_score: 0,
                    user_vote: null,
                    is_deleted: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                comments.set(id, comment);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: comment }),
                });
            }

            if (method === 'GET') {
                const items = Array.from(comments.values()).filter(
                    c => c.clip_id === clipId,
                );
                const sort = searchParams.get('sort');
                if (sort === 'new') {
                    items.sort((a, b) =>
                        (b.created_at || '').localeCompare(a.created_at || ''),
                    );
                } else if (sort === 'top') {
                    items.sort(
                        (a, b) => (b.vote_score || 0) - (a.vote_score || 0),
                    );
                }
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ data: { comments: items } }),
                });
            }
        }

        const commentVoteMatch = pathname.match(/\/comments\/([^/]+)\/vote$/);
        if (commentVoteMatch) {
            const commentId = commentVoteMatch[1];
            const comment = comments.get(commentId);
            if (!comment) {
                return route.fulfill({
                    status: 404,
                    body: JSON.stringify({ error: 'not found' }),
                });
            }

            if (method === 'POST') {
                const body = request.postDataJSON?.() || {};
                const voteType = body.vote_type ?? body.voteType ?? 0;
                const prev = comment.user_vote || 0;
                if (prev !== voteType) {
                    comment.vote_score =
                        (comment.vote_score || 0) - prev + voteType;
                }
                comment.user_vote = voteType;
                comment.updated_at = new Date().toISOString();
                comments.set(commentId, comment);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, ...comment }),
                });
            }

            if (method === 'DELETE') {
                const prev = comment.user_vote || 0;
                comment.vote_score = (comment.vote_score || 0) - prev;
                comment.user_vote = null;
                comment.updated_at = new Date().toISOString();
                comments.set(commentId, comment);
                return route.fulfill({ status: 204 });
            }
        }

        const commentEditMatch = pathname.match(/\/comments\/([^/]+)$/);
        if (commentEditMatch && method === 'PATCH') {
            const commentId = commentEditMatch[1];
            const comment = comments.get(commentId);
            const body = request.postDataJSON?.() || {};
            if (comment) {
                comment.content = body.content || comment.content;
                comment.edited = true;
                comment.edited_at = new Date().toISOString();
                comments.set(commentId, comment);
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(
                    comment || {
                        id: commentId,
                        content: body.content,
                        edited: true,
                    },
                ),
            });
        }

        if (commentEditMatch && method === 'DELETE') {
            const commentId = commentEditMatch[1];
            const comment = comments.get(commentId);
            if (comment) {
                comment.is_deleted = true;
                comment.content = '[deleted]';
                comment.updated_at = new Date().toISOString();
                comments.set(commentId, comment);
            }
            return route.fulfill({ status: 204 });
        }

        // Clip votes and fetch
        const clipVoteMatch = pathname.match(/\/clips\/([^/]+)\/vote$/);
        if (clipVoteMatch) {
            const clipId = clipVoteMatch[1];
            const clip = clips.get(clipId) || makeClip(clipId);
            if (method === 'POST') {
                const body = request.postDataJSON?.() || {};
                const voteType = body.vote_type ?? body.voteType ?? 0;
                const prev = clip.user_vote || 0;
                if (prev !== voteType) {
                    clip.vote_score = (clip.vote_score || 0) - prev + voteType;
                }
                clip.user_vote = voteType;
                clips.set(clipId, clip);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, ...clip }),
                });
            }

            if (method === 'DELETE') {
                const prev = clip.user_vote || 0;
                clip.vote_score = (clip.vote_score || 0) - prev;
                clip.user_vote = null;
                clips.set(clipId, clip);
                return route.fulfill({ status: 204 });
            }
        }

        const clipFetchMatch = pathname.match(/\/clips\/([^/]+)$/);
        if (clipFetchMatch && method === 'GET') {
            const clipId = clipFetchMatch[1];
            const clip = clips.get(clipId) || makeClip(clipId);
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: clip }),
            });
        }

        // Following
        const followMatch = pathname.match(/\/users\/([^/]+)\/follow$/);
        if (followMatch) {
            const userId = followMatch[1];
            if (method === 'POST') {
                if (blocked.has(userId)) {
                    return route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            success: false,
                            is_following: false,
                            reason: 'blocked',
                        }),
                    });
                }
                follows.add(userId);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, is_following: true }),
                });
            }
            if (method === 'DELETE') {
                follows.delete(userId);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        success: true,
                        is_following: false,
                    }),
                });
            }
        }

        const followStatusMatch = pathname.match(
            /\/users\/([^/]+)\/follow-status$/,
        );
        if (followStatusMatch && method === 'GET') {
            const userId = followStatusMatch[1];
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ is_following: follows.has(userId) }),
            });
        }

        if (pathname.endsWith('/feed/following') && method === 'GET') {
            const feedItems = Array.from({ length: 3 })
                .map((_, idx) => ({
                    id: `feed-${idx + 1}`,
                    user_id: `user-${idx + 1}`,
                    submitted_by: { id: `user-${idx + 1}` },
                    clip_id: `mock-clip-feed-${idx + 1}`,
                }))
                .filter(item => !blocked.has(item.user_id));

            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: { clips: feedItems },
                    clips: feedItems,
                }),
            });
        }

        // Playlists
        if (pathname.endsWith('/playlists') && method === 'POST') {
            const body = request.postDataJSON?.() || {};
            const id = body.id || `mock-playlist-${playlistCounter++}`;
            const playlist = {
                id,
                title: body.title || `Playlist ${id}`,
                description: body.description || '',
                visibility: body.visibility || 'private',
                cover_url: body.cover_url,
                clips: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            playlists.set(id, playlist);
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(playlist),
            });
        }

        const playlistMatch = pathname.match(/\/playlists\/([^/]+)$/);
        if (playlistMatch && method === 'PATCH') {
            const playlistId = playlistMatch[1];
            const body = request.postDataJSON?.() || {};
            const playlist = playlists.get(playlistId) || { id: playlistId };
            const updated = {
                ...playlist,
                ...body,
                updated_at: new Date().toISOString(),
            };
            playlists.set(playlistId, updated);
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(updated),
            });
        }

        if (playlistMatch && method === 'DELETE') {
            playlists.delete(playlistMatch[1]);
            return route.fulfill({ status: 204 });
        }

        const playlistClipsMatch = pathname.match(
            /\/playlists\/([^/]+)\/clips$/,
        );
        if (playlistClipsMatch && method === 'POST') {
            const playlistId = playlistClipsMatch[1];
            const body = request.postDataJSON?.() || {};
            const playlist = playlists.get(playlistId) || {
                id: playlistId,
                clips: [],
            };
            playlist.clips = playlist.clips || [];
            const clipIds = body.clip_ids || body.clipIds || [];
            playlist.clips.push(...clipIds);
            playlists.set(playlistId, playlist);
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ success: true }),
            });
        }

        const playlistClipDeleteMatch = pathname.match(
            /\/playlists\/([^/]+)\/clips\/([^/]+)$/,
        );
        if (playlistClipDeleteMatch && method === 'DELETE') {
            const playlistId = playlistClipDeleteMatch[1];
            const clipId = playlistClipDeleteMatch[2];
            const playlist = playlists.get(playlistId);
            if (playlist && Array.isArray(playlist.clips)) {
                playlist.clips = playlist.clips.filter(
                    (id: string) => id !== clipId,
                );
                playlists.set(playlistId, playlist);
            }
            return route.fulfill({ status: 204 });
        }

        const playlistShareMatch = pathname.match(
            /\/playlists\/([^/]+)\/share$/,
        );
        if (playlistShareMatch && method === 'GET') {
            const playlistId = playlistShareMatch[1];
            // Return 404 for non-existent playlists
            if (!playlists.has(playlistId)) {
                return route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Playlist not found' }),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    share_url: `https://example.com/playlist/${playlistId}`,
                }),
            });
        }

        if (playlistMatch && method === 'GET') {
            const playlistId = playlistMatch[1];
            const playlist = playlists.get(playlistId);
            // Return 404 for invalid/non-existent playlist IDs
            if (!playlist) {
                return route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Playlist not found' }),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(playlist),
            });
        }

        // Blocking
        const blockMatch = pathname.match(/\/users\/([^/]+)\/block$/);
        if (blockMatch) {
            const userId = blockMatch[1];
            if (method === 'POST') {
                blocked.add(userId);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, is_blocked: true }),
                });
            }
            if (method === 'DELETE') {
                blocked.delete(userId);
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, is_blocked: false }),
                });
            }
        }

        const blockStatusMatch = pathname.match(
            /\/users\/([^/]+)\/block-status$/,
        );
        if (blockStatusMatch && method === 'GET') {
            const userId = blockStatusMatch[1];
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ is_blocked: blocked.has(userId) }),
            });
        }

        if (pathname.endsWith('/users/blocked') && method === 'GET') {
            const users = Array.from(blocked.values()).map(id => ({ id }));
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ users }),
            });
        }

        // Health
        if (pathname.endsWith('/health') && method === 'GET') {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ status: 'ok' }),
            });
        }

        return route.fallback();
    });
}
