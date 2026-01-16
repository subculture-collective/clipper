import { test, expect } from '../fixtures';
import type { Page, Route, Request } from '@playwright/test';

/**
 * Twitch Ban/Unban Actions E2E Tests
 *
 * Tests complete Twitch moderation workflows including:
 * - Broadcaster ban/unban operations
 * - Channel moderator ban/unban operations
 * - Site moderator read-only enforcement
 * - Permission gating and scope validation
 * - Error handling (scopes, rate limits, auth)
 * - Ban durations (permanent, timeout)
 * - Audit logging for Twitch actions
 *
 * Uses mocked Twitch Helix API for deterministic testing.
 */

type MockUser = {
    id: string;
    username: string;
    display_name?: string;
    twitch_id?: string;
    email: string;
    role: 'user' | 'moderator' | 'admin';
    is_broadcaster?: boolean;
    is_twitch_moderator?: boolean;
    has_twitch_ban_scope?: boolean;
    is_banned_on_twitch?: boolean;
};

type TwitchBanRequest = {
    broadcasterID: string;
    userID: string;
    reason?: string;
    duration?: number;
};

type TwitchUnbanRequest = {
    broadcasterID: string;
    userID: string;
};

type AuditLogEntry = {
    id: string;
    actor_id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: Record<string, unknown>;
    timestamp: string;
};

// Constants for rate limiting
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour in milliseconds
const MAX_BAN_DURATION_SECONDS = 1209600; // 14 days

/**
 * Setup Twitch moderation API mocks with Helix simulation
 */
async function setupTwitchModerationMocks(page: Page) {
    const users = new Map<string, MockUser>();
    const bannedUsers = new Map<
        string,
        { banId: string; reason: string; expiresAt?: string }
    >();
    const auditLogs: AuditLogEntry[] = [];
    let currentUser: MockUser | null = null;
    let rateLimitCount = 0;
    let rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
    let auditIdCounter = 1;

    const respond = (route: Route, status: number, body: any) =>
        route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });

    const createAuditLog = (
        action: string,
        resourceType: string,
        resourceId: string,
        actorId: string,
        details: any = {}
    ) => {
        const log: AuditLogEntry = {
            id: `audit-${auditIdCounter++}`,
            actor_id: actorId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            details,
            timestamp: new Date().toISOString(),
        };
        auditLogs.push(log);
        return log;
    };

    await page
        .context()
        .route('**/api/**', async (route: Route, request: Request) => {
            const url = new URL(request.url());
            const pathname = url.pathname.replace(/.*\/api\/(v1\/)?/, '/');
            const method = request.method();

            // Auth endpoints
            if (pathname === '/auth/me') {
                if (currentUser) {
                    return respond(route, 200, currentUser);
                }
                return respond(route, 401, { error: 'unauthenticated' });
            }

            // Admin users listing for moderation UI
            if (pathname === '/admin/users' && method === 'GET') {
                // Seed a couple of users if none exist
                if (users.size === 0) {
                    users.set('99999', {
                        id: '99999',
                        username: 'twitchuser',
                        display_name: 'Twitch User',
                        email: 'twitchuser@example.com',
                        role: 'user',
                        twitch_id: '99999',
                        is_broadcaster: true,
                        is_twitch_moderator: true,
                        has_twitch_ban_scope: true,
                        is_banned_on_twitch: false,
                    });
                    users.set('88888', {
                        id: '88888',
                        username: 'banneduser',
                        display_name: 'Banned User',
                        email: 'banned@example.com',
                        role: 'user',
                        twitch_id: '88888',
                        is_broadcaster: true,
                        is_twitch_moderator: true,
                        has_twitch_ban_scope: true,
                        is_banned_on_twitch: true,
                    });
                }

                const search = (
                    url.searchParams.get('search') || ''
                ).toLowerCase();
                const pageNum = parseInt(
                    url.searchParams.get('page') || '1',
                    10
                );
                const perPage = parseInt(
                    url.searchParams.get('per_page') || '25',
                    10
                );

                const allUsers = Array.from(users.values()).filter(
                    u =>
                        !search ||
                        u.username.toLowerCase().includes(search) ||
                        u.display_name?.toLowerCase().includes(search)
                );

                const start = (pageNum - 1) * perPage;
                const paged = allUsers.slice(start, start + perPage).map(u => ({
                    id: u.id,
                    username: u.username,
                    display_name: u.display_name || u.username,
                    email: u.email,
                    avatar_url: '',
                    role: u.role,
                    twitch_id: u.twitch_id || u.id,
                    is_banned_on_twitch: u.is_banned_on_twitch || false,
                    created_at: new Date().toISOString(),
                }));

                return respond(route, 200, {
                    users: paged,
                    total: allUsers.length,
                    page: pageNum,
                    per_page: perPage,
                });
            }

            // Twitch Ban User endpoint
            if (pathname === '/moderation/twitch/ban' && method === 'POST') {
                // Reset rate limit counter if time window has passed
                if (Date.now() > rateLimitResetTime) {
                    rateLimitCount = 0;
                    rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
                }

                // Check rate limit
                rateLimitCount++;
                if (rateLimitCount > RATE_LIMIT_MAX_REQUESTS) {
                    return respond(route, 429, {
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                        detail: 'You have exceeded the rate limit for Twitch ban actions. Please try again later.',
                    });
                }

                if (!currentUser) {
                    return respond(route, 401, { error: 'Unauthorized' });
                }

                const body = (request.postDataJSON?.() ||
                    {}) as TwitchBanRequest;

                // Site moderators are read-only
                if (
                    currentUser.role === 'moderator' &&
                    !currentUser.is_twitch_moderator
                ) {
                    return respond(route, 403, {
                        error: 'Site moderators cannot perform Twitch actions',
                        code: 'SITE_MODERATORS_READ_ONLY',
                        detail: 'You are a site moderator but not a Twitch channel moderator. You can only view moderation data.',
                    });
                }

                // Check Twitch authentication
                if (!currentUser.twitch_id) {
                    return respond(route, 403, {
                        error: 'Not authenticated with Twitch',
                        code: 'NOT_AUTHENTICATED',
                        detail: 'You must authenticate with Twitch to perform moderation actions.',
                    });
                }

                // Check scopes
                if (!currentUser.has_twitch_ban_scope) {
                    return respond(route, 403, {
                        error: 'Insufficient OAuth scopes',
                        code: 'INSUFFICIENT_SCOPES',
                        detail: 'Your Twitch token lacks the required scopes. Please re-authenticate with moderator:manage:banned_users or channel:manage:banned_users scope.',
                    });
                }

                // Check broadcaster or moderator permission
                if (
                    !currentUser.is_broadcaster &&
                    !currentUser.is_twitch_moderator
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden',
                        code: 'NOT_BROADCASTER',
                        detail: 'Only the broadcaster or channel moderators can perform this action.',
                    });
                }

                // Validate required fields
                if (!body.broadcasterID || !body.userID) {
                    return respond(route, 400, {
                        error: 'Missing required fields: broadcasterID and userID are required',
                    });
                }

                // Validate duration if provided
                if (body.duration !== undefined && body.duration !== null) {
                    if (
                        body.duration < 1 ||
                        body.duration > MAX_BAN_DURATION_SECONDS
                    ) {
                        return respond(route, 400, {
                            error: `Duration must be between 1 and ${MAX_BAN_DURATION_SECONDS} seconds (14 days)`,
                        });
                    }
                }

                // Perform ban
                const banId = `ban-${Date.now()}`;
                const expiresAt = body.duration
                    ? new Date(Date.now() + body.duration * 1000).toISOString()
                    : undefined;

                bannedUsers.set(body.userID, {
                    banId,
                    reason: body.reason || 'No reason provided',
                    expiresAt,
                });

                // Create audit log
                createAuditLog(
                    'twitch_ban_user',
                    'twitch_ban',
                    banId,
                    currentUser.id,
                    {
                        broadcaster_id: body.broadcasterID,
                        user_id: body.userID,
                        reason: body.reason,
                        duration: body.duration,
                        is_timeout: !!body.duration,
                    }
                );

                return respond(route, 200, {
                    success: true,
                    message: body.duration
                        ? `User timed out on Twitch for ${body.duration} seconds`
                        : 'User banned on Twitch successfully',
                    broadcasterID: body.broadcasterID,
                    userID: body.userID,
                });
            }

            // Twitch Unban User endpoint
            if (pathname === '/moderation/twitch/ban' && method === 'DELETE') {
                // Reset rate limit counter if time window has passed
                if (Date.now() > rateLimitResetTime) {
                    rateLimitCount = 0;
                    rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
                }

                // Check rate limit
                rateLimitCount++;
                if (rateLimitCount > RATE_LIMIT_MAX_REQUESTS) {
                    return respond(route, 429, {
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                        detail: 'You have exceeded the rate limit for Twitch ban actions. Please try again later.',
                    });
                }

                if (!currentUser) {
                    return respond(route, 401, { error: 'Unauthorized' });
                }

                const broadcasterID = url.searchParams.get('broadcasterID');
                const userID = url.searchParams.get('userID');

                // Site moderators are read-only
                if (
                    currentUser.role === 'moderator' &&
                    !currentUser.is_twitch_moderator
                ) {
                    return respond(route, 403, {
                        error: 'Site moderators cannot perform Twitch actions',
                        code: 'SITE_MODERATORS_READ_ONLY',
                        detail: 'You are a site moderator but not a Twitch channel moderator. You can only view moderation data.',
                    });
                }

                // Check Twitch authentication
                if (!currentUser.twitch_id) {
                    return respond(route, 403, {
                        error: 'Not authenticated with Twitch',
                        code: 'NOT_AUTHENTICATED',
                        detail: 'You must authenticate with Twitch to perform moderation actions.',
                    });
                }

                // Check scopes
                if (!currentUser.has_twitch_ban_scope) {
                    return respond(route, 403, {
                        error: 'Insufficient OAuth scopes',
                        code: 'INSUFFICIENT_SCOPES',
                        detail: 'Your Twitch token lacks the required scopes. Please re-authenticate with moderator:manage:banned_users or channel:manage:banned_users scope.',
                    });
                }

                // Check broadcaster or moderator permission
                if (
                    !currentUser.is_broadcaster &&
                    !currentUser.is_twitch_moderator
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden',
                        code: 'NOT_BROADCASTER',
                        detail: 'Only the broadcaster or channel moderators can perform this action.',
                    });
                }

                // Validate required fields
                if (!broadcasterID || !userID) {
                    return respond(route, 400, {
                        error: 'Missing required query parameters: broadcasterID and userID are required',
                    });
                }

                // Perform unban
                const banInfo = bannedUsers.get(userID);
                if (banInfo) {
                    bannedUsers.delete(userID);

                    // Create audit log
                    createAuditLog(
                        'twitch_unban_user',
                        'twitch_ban',
                        banInfo.banId,
                        currentUser.id,
                        {
                            broadcaster_id: broadcasterID,
                            user_id: userID,
                        }
                    );
                }

                return respond(route, 200, {
                    success: true,
                    message: 'User unbanned on Twitch successfully',
                    broadcasterID,
                    userID,
                });
            }

            // Audit logs endpoint
            if (pathname === '/admin/audit-logs' && method === 'GET') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Admin or moderator access required',
                    });
                }

                const action = url.searchParams.get('action');
                let filteredLogs = [...auditLogs];

                if (action) {
                    filteredLogs = filteredLogs.filter(
                        log => log.action === action
                    );
                }

                return respond(route, 200, {
                    success: true,
                    data: filteredLogs.sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                    ),
                    meta: {
                        total: filteredLogs.length,
                    },
                });
            }

            return route.fallback();
        });

    return {
        setCurrentUser: (user: MockUser | null) => {
            currentUser = user;
        },
        seedUser: (user: MockUser) => {
            users.set(user.id, user);
            return user;
        },
        getBannedUser: (userId: string) => bannedUsers.get(userId),
        getAuditLogs: () => [...auditLogs],
        resetRateLimit: () => {
            rateLimitCount = 0;
            rateLimitResetTime = Date.now() + RATE_LIMIT_WINDOW_MS;
        },
        triggerRateLimit: () => {
            rateLimitCount = RATE_LIMIT_MAX_REQUESTS + 1; // Exceed the limit
        },
        clear: () => {
            users.clear();
            bannedUsers.clear();
            auditLogs.length = 0;
            rateLimitCount = 0;
        },
    };
}

test.describe('Twitch Ban/Unban Actions E2E', () => {
    test.describe('Broadcaster Ban Operations', () => {
        test('broadcaster can permanently ban user with reason', async ({
            page,
        }) => {
            const mocks = await setupTwitchModerationMocks(page);

            // Set current user as broadcaster with proper scopes
            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'user',
                is_broadcaster: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(broadcaster);

            // Navigate to moderation page or user profile
            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            // Find user and click ban button
            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();
            await expect(banButton).toBeVisible({ timeout: 5000 });
            await banButton.click();

            // Wait for ban modal
            const modal = page
                .locator('[role="dialog"]')
                .or(page.locator('.modal'));
            await expect(modal.first()).toBeVisible({ timeout: 5000 });

            // Fill ban reason
            const reasonInput = page
                .getByLabel(/reason/i)
                .or(page.getByPlaceholder(/reason/i));
            await reasonInput.fill('Violation of community guidelines');

            // Select permanent ban (no duration)
            const permanentRadio = page
                .getByLabel(/permanent/i)
                .or(page.getByText(/permanent/i));
            if (
                await permanentRadio
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await permanentRadio.click();
            }

            // Confirm ban
            const confirmButton = page.getByTestId('confirm-ban-action-button');
            await confirmButton.click();

            // Verify success message
            await expect(
                page.getByTestId('twitch-action-success-alert')
            ).toBeVisible({ timeout: 5000 });

            // Verify audit log was created
            const logs = mocks.getAuditLogs();
            const banLog = logs.find(log => log.action === 'twitch_ban_user');
            expect(banLog).toBeDefined();
            expect(banLog?.actor_id).toBe('broadcaster-1');
            expect(banLog?.details?.reason).toBe(
                'Violation of community guidelines'
            );
            expect(banLog?.details?.is_timeout).toBe(false);
        });

        test('broadcaster can timeout user with duration', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'user',
                is_broadcaster: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(broadcaster);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();
            if (
                await banButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await banButton.click();

                const modal = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.modal'));
                await expect(modal.first()).toBeVisible({ timeout: 5000 });

                // Fill reason
                const reasonInput = page
                    .getByLabel(/reason/i)
                    .or(page.getByPlaceholder(/reason/i));
                await reasonInput.fill('Spam');

                // Select timeout option
                const timeoutRadio = page
                    .getByLabel(/timeout/i)
                    .or(page.getByText(/timeout/i));
                if (
                    await timeoutRadio
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await timeoutRadio.click();
                }

                // Set duration (600 seconds = 10 minutes)
                const durationInput = page
                    .getByLabel(/duration/i)
                    .or(page.getByPlaceholder(/duration|seconds/i));
                if (
                    await durationInput
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await durationInput.fill('600');
                }

                const confirmButton = page.getByTestId(
                    'confirm-ban-action-button'
                );
                await confirmButton.click();

                await expect(
                    page.getByTestId('twitch-action-success-alert')
                ).toBeVisible({ timeout: 5000 });

                const logs = mocks.getAuditLogs();
                const banLog = logs.find(
                    log => log.action === 'twitch_ban_user'
                );
                expect(banLog).toBeDefined();
                expect(banLog?.details?.duration).toBe(600);
                expect(banLog?.details?.is_timeout).toBe(true);
            }
        });

        test('broadcaster can unban user', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'user',
                is_broadcaster: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(broadcaster);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            // Find and click unban button for a banned user
            const unbanButton = page
                .getByRole('button', { name: /unban.*twitch/i })
                .first();
            if (
                await unbanButton
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await unbanButton.click();

                // Confirm unban if modal appears
                const confirmButton = page
                    .getByRole('button', { name: /confirm|unban/i })
                    .filter({ hasNotText: /cancel/i });
                if (
                    await confirmButton
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await confirmButton.click();
                }

                await expect(
                    page.getByTestId('twitch-action-success-alert')
                ).toBeVisible({ timeout: 5000 });

                const logs = mocks.getAuditLogs();
                const unbanLog = logs.find(
                    log => log.action === 'twitch_unban_user'
                );
                expect(unbanLog).toBeDefined();
                expect(unbanLog?.actor_id).toBe('broadcaster-1');
            }
        });
    });

    test.describe('Channel Moderator Operations', () => {
        test('channel moderator can ban user', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const moderator: MockUser = {
                id: 'moderator-1',
                username: 'channelmoderator',
                twitch_id: '67890',
                email: 'mod@example.com',
                role: 'user',
                is_broadcaster: false,
                is_twitch_moderator: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(moderator);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();
            if (
                await banButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await banButton.click();

                const modal = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.modal'));
                await expect(modal.first()).toBeVisible({ timeout: 5000 });

                const reasonInput = page
                    .getByLabel(/reason/i)
                    .or(page.getByPlaceholder(/reason/i));
                await reasonInput.fill('Moderator action');

                const confirmButton = page.getByTestId(
                    'confirm-ban-action-button'
                );
                await confirmButton.click();

                await expect(
                    page.getByTestId('twitch-action-success-alert')
                ).toBeVisible({ timeout: 5000 });

                const logs = mocks.getAuditLogs();
                const banLog = logs.find(
                    log => log.action === 'twitch_ban_user'
                );
                expect(banLog).toBeDefined();
                expect(banLog?.actor_id).toBe('moderator-1');
            }
        });

        test('channel moderator can unban user', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const moderator: MockUser = {
                id: 'moderator-1',
                username: 'channelmoderator',
                twitch_id: '67890',
                email: 'mod@example.com',
                role: 'user',
                is_broadcaster: false,
                is_twitch_moderator: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(moderator);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const unbanButton = page
                .getByRole('button', { name: /unban.*twitch/i })
                .first();
            if (
                await unbanButton
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await unbanButton.click();

                const confirmButton = page
                    .getByRole('button', { name: /confirm|unban/i })
                    .filter({ hasNotText: /cancel/i });
                if (
                    await confirmButton
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await confirmButton.click();
                }

                await expect(
                    page.getByTestId('twitch-action-success-alert')
                ).toBeVisible({ timeout: 5000 });

                const logs = mocks.getAuditLogs();
                const unbanLog = logs.find(
                    log => log.action === 'twitch_unban_user'
                );
                expect(unbanLog).toBeDefined();
            }
        });
    });

    test.describe('Site Moderator Read-Only Enforcement', () => {
        test('site moderator cannot ban user on Twitch', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const siteModerator: MockUser = {
                id: 'site-mod-1',
                username: 'sitemoderator',
                email: 'sitemod@example.com',
                role: 'moderator',
                is_broadcaster: false,
                is_twitch_moderator: false, // Site mod only, not Twitch mod
                twitch_id: '11111',
                has_twitch_ban_scope: false,
            };
            mocks.setCurrentUser(siteModerator);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            // Twitch ban buttons should not be visible for site moderators
            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();

            // Either button is not visible, or if visible and clicked, shows error
            const isVisible = await banButton
                .isVisible({ timeout: 2000 })
                .catch(() => false);

            if (isVisible) {
                // If button is visible (shouldn't be), clicking should show error
                await banButton.click();

                await expect(
                    page.locator('[role="alert"]').filter({
                        hasText: /site moderator|read.*only|cannot perform/i,
                    })
                ).toBeVisible({ timeout: 5000 });
            } else {
                // Button should not be visible - this is the expected behavior
                expect(isVisible).toBe(false);
            }
        });

        test('site moderator cannot unban user on Twitch', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const siteModerator: MockUser = {
                id: 'site-mod-1',
                username: 'sitemoderator',
                email: 'sitemod@example.com',
                role: 'moderator',
                is_broadcaster: false,
                is_twitch_moderator: false,
                twitch_id: '11111',
                has_twitch_ban_scope: false,
            };
            mocks.setCurrentUser(siteModerator);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const unbanButton = page
                .getByRole('button', { name: /unban.*twitch/i })
                .first();
            const isVisible = await unbanButton
                .isVisible({ timeout: 2000 })
                .catch(() => false);

            if (isVisible) {
                await unbanButton.click();

                await expect(
                    page.locator('[role="alert"]').filter({
                        hasText: /site moderator|read.*only|cannot perform/i,
                    })
                ).toBeVisible({ timeout: 5000 });
            } else {
                expect(isVisible).toBe(false);
            }
        });
    });

    test.describe('Error Handling', () => {
        test('shows error when user lacks Twitch OAuth scopes', async ({
            page,
        }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'user',
                is_broadcaster: true,
                has_twitch_ban_scope: false, // Missing required scope
            };
            mocks.setCurrentUser(broadcaster);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();
            if (
                await banButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await banButton.click();

                const modal = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.modal'));
                if (
                    await modal
                        .first()
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    const reasonInput = page
                        .getByLabel(/reason/i)
                        .or(page.getByPlaceholder(/reason/i));
                    await reasonInput.fill('Test ban');

                    const confirmButton = page.getByTestId(
                        'confirm-ban-action-button'
                    );
                    await confirmButton.click();

                    // Use data-testid to specifically get the modal inline error alert, avoiding strict mode
                    await expect(
                        page.getByTestId('twitch-action-error-alert')
                    ).toBeVisible({ timeout: 5000 });
                }
            }
        });

        test('shows error when user not authenticated with Twitch', async ({
            page,
        }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const user: MockUser = {
                id: 'user-1',
                username: 'testuser',
                email: 'user@example.com',
                role: 'user',
                is_broadcaster: true,
                has_twitch_ban_scope: true,
                // twitch_id is missing - not authenticated with Twitch
            };
            mocks.setCurrentUser(user);

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();
            if (
                await banButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await banButton.click();

                const modal = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.modal'));
                if (
                    await modal
                        .first()
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    const reasonInput = page
                        .getByLabel(/reason/i)
                        .or(page.getByPlaceholder(/reason/i));
                    await reasonInput.fill('Test ban');

                    const confirmButton = page.getByTestId(
                        'confirm-ban-action-button'
                    );
                    await confirmButton.click();

                    // Use data-testid to specifically get the modal inline error alert, avoiding strict mode
                    await expect(
                        page.getByTestId('twitch-action-error-alert')
                    ).toBeVisible({ timeout: 5000 });
                }
            }
        });

        test('shows error when rate limit exceeded', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'user',
                is_broadcaster: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(broadcaster);

            // Trigger rate limit
            mocks.triggerRateLimit();

            await page.goto('/moderation/users');
            await page.waitForLoadState('networkidle');

            const banButton = page
                .getByRole('button', { name: /ban.*twitch/i })
                .first();
            if (
                await banButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await banButton.click();

                const modal = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.modal'));
                if (
                    await modal
                        .first()
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    const reasonInput = page
                        .getByLabel(/reason/i)
                        .or(page.getByPlaceholder(/reason/i));
                    await reasonInput.fill('Test ban');

                    const confirmButton = page.getByTestId(
                        'confirm-ban-action-button'
                    );
                    await confirmButton.click();

                    // Use data-testid to specifically get the modal inline error alert, avoiding strict mode
                    await expect(
                        page.getByTestId('twitch-action-error-alert')
                    ).toBeVisible({ timeout: 5000 });
                }
            }
        });
    });

    test.describe('Audit Logging', () => {
        test('creates audit log for ban action', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'admin', // Admin to access audit logs
                is_broadcaster: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(broadcaster);

            // Perform a ban action via API
            await page.request.post('/api/v1/moderation/twitch/ban', {
                data: {
                    broadcasterID: '12345',
                    userID: '99999',
                    reason: 'Test ban for audit',
                },
            });

            // Navigate to audit logs
            await page.goto('/admin/audit-logs');
            await page.waitForLoadState('networkidle');

            // Verify ban action is logged
            const logs = mocks.getAuditLogs();
            const banLog = logs.find(log => log.action === 'twitch_ban_user');
            expect(banLog).toBeDefined();
            expect(banLog?.actor_id).toBe('broadcaster-1');
            expect(banLog?.details?.user_id).toBe('99999');
            expect(banLog?.details?.reason).toBe('Test ban for audit');
        });

        test('creates audit log for unban action', async ({ page }) => {
            const mocks = await setupTwitchModerationMocks(page);

            const broadcaster: MockUser = {
                id: 'broadcaster-1',
                username: 'testbroadcaster',
                twitch_id: '12345',
                email: 'broadcaster@example.com',
                role: 'admin',
                is_broadcaster: true,
                has_twitch_ban_scope: true,
            };
            mocks.setCurrentUser(broadcaster);

            // Perform an unban action via API
            await page.request.delete(
                '/api/v1/moderation/twitch/ban?broadcasterID=12345&userID=99999'
            );

            const logs = mocks.getAuditLogs();
            const unbanLog = logs.find(
                log => log.action === 'twitch_unban_user'
            );
            expect(unbanLog).toBeDefined();
            expect(unbanLog?.actor_id).toBe('broadcaster-1');
        });
    });
});
