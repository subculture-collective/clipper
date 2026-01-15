import { test, expect } from '../fixtures';
import type { Page, Route, Request } from '@playwright/test';

/**
 * Moderation E2E Tests
 *
 * Tests complete moderation workflows including:
 * - Moderator onboarding flow
 * - Ban sync flow from Twitch
 * - Audit log verification
 * - Permission enforcement at UI level
 * - Banned user interactions
 * - Error handling and edge cases
 * - Browser compatibility
 */

type MockUser = {
    id: string;
    username: string;
    display_name?: string;
    email: string;
    role: 'user' | 'moderator' | 'admin';
    karma_points: number;
    is_banned: boolean;
    banned_until?: string;
    ban_reason?: string;
};

type MockBan = {
    id: string;
    user_id: string;
    target_username: string;
    channel_id: string;
    reason: string;
    created_at: string;
    expires_at?: string;
    created_by: string;
    is_active: boolean;
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

type MockModerator = {
    id: string;
    user_id: string;
    channel_id: string;
    role: 'moderator' | 'admin';
    permissions: string[];
    created_at: string;
    created_by: string;
    user?: MockUser;
};

// Twitch channel name validation regex - allows only alphanumeric and underscores
const VALID_TWITCH_CHANNEL_NAME = /^[a-zA-Z0-9_]+$/;

/**
 * Setup moderation API mocks
 */
async function setupModerationMocks(page: Page) {
    const users = new Map<string, MockUser>();
    const bans = new Map<string, MockBan>();
    const moderators = new Map<string, MockModerator>();
    const auditLogs: AuditLogEntry[] = [];
    const jobStatus = new Map<
        string,
        { status: string; error?: string; channelName?: string }
    >();
    let currentUser: MockUser | null = null;
    let banCounter = 1;
    let moderatorCounter = 1;

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
            id: `audit-${Date.now()}-${Math.random()}`,
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

            if (pathname === '/auth/test-login') {
                return respond(route, 200, { user: currentUser });
            }

            if (pathname === '/auth/logout') {
                currentUser = null;
                return respond(route, 200, { success: true });
            }

            // User autocomplete endpoint
            if (pathname === '/users/autocomplete' && method === 'GET') {
                const query = url.searchParams.get('q') || '';
                if (!query) {
                    return respond(route, 200, { success: true, data: [] });
                }

                const matchingUsers = Array.from(users.values())
                    .filter(u =>
                        u.username.toLowerCase().includes(query.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(u => ({
                        id: u.id,
                        username: u.username,
                        display_name: u.display_name || u.username,
                        avatar_url: '',
                        is_verified: false,
                    }));

                return respond(route, 200, {
                    success: true,
                    data: matchingUsers,
                });
            }

            // Moderator management endpoints (use /moderation/moderators matching backend API)
            if (pathname === '/moderation/moderators' && method === 'GET') {
                if (!currentUser || currentUser.role !== 'admin') {
                    return respond(route, 403, {
                        error: 'Forbidden: Admin access required',
                    });
                }

                const channelId = url.searchParams.get('channelId');
                const moderatorsList = Array.from(moderators.values())
                    .filter(m => !channelId || m.channel_id === channelId)
                    .map(m => ({
                        ...m,
                        user: users.get(m.user_id),
                    }));

                return respond(route, 200, {
                    success: true,
                    data: moderatorsList,
                    meta: { total: moderatorsList.length },
                });
            }

            if (pathname === '/moderation/moderators' && method === 'POST') {
                if (!currentUser || currentUser.role !== 'admin') {
                    return respond(route, 403, {
                        error: 'Forbidden: Admin access required',
                    });
                }

                const body = (request.postDataJSON?.() || {}) as {
                    userId?: string;
                    channelId?: string;
                    role?: 'moderator' | 'admin';
                };

                if (!body.userId || !body.channelId) {
                    return respond(route, 400, {
                        error: 'userId and channelId are required',
                    });
                }

                const moderator: MockModerator = {
                    id: `moderator-${moderatorCounter++}`,
                    user_id: body.userId,
                    channel_id: body.channelId,
                    role: body.role || 'moderator',
                    permissions: ['manage_bans', 'view_audit_logs'],
                    created_at: new Date().toISOString(),
                    created_by: currentUser.id,
                    user: users.get(body.userId),
                };

                moderators.set(moderator.id, moderator);

                // Update user role
                const user = users.get(body.userId);
                if (user) {
                    user.role = body.role || 'moderator';
                    users.set(user.id, user);
                }

                // Create audit log
                createAuditLog(
                    'create_moderator',
                    'moderator',
                    moderator.id,
                    currentUser.id,
                    {
                        user_id: body.userId,
                        channel_id: body.channelId,
                        role: moderator.role,
                    }
                );

                return respond(route, 201, {
                    success: true,
                    data: moderator,
                    message: 'Moderator added successfully',
                });
            }

            const removeModerator = pathname.match(
                /^\/moderation\/moderators\/([^/]+)$/
            );
            if (removeModerator && method === 'DELETE') {
                if (!currentUser || currentUser.role !== 'admin') {
                    return respond(route, 403, {
                        error: 'Forbidden: Admin access required',
                    });
                }

                const moderatorId = removeModerator[1];
                const moderator = moderators.get(moderatorId);

                if (!moderator) {
                    return respond(route, 404, {
                        error: 'Moderator not found',
                    });
                }

                moderators.delete(moderatorId);

                // Update user role back to user
                const user = users.get(moderator.user_id);
                if (user) {
                    user.role = 'user';
                    users.set(user.id, user);
                }

                // Create audit log
                createAuditLog(
                    'remove_moderator',
                    'moderator',
                    moderatorId,
                    currentUser.id,
                    {
                        user_id: moderator.user_id,
                    }
                );

                return respond(route, 200, {
                    success: true,
                    message: 'Moderator removed successfully',
                });
            }

            // Ban management endpoints
            if (pathname === '/chat/bans' && method === 'GET') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const channelId = url.searchParams.get('channel_id');
                const bansList = Array.from(bans.values())
                    .filter(b => !channelId || b.channel_id === channelId)
                    .sort(
                        (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                    );

                return respond(route, 200, {
                    success: true,
                    bans: bansList,
                    total: bansList.length,
                });
            }

            // RESTful ban endpoint - /chat/channels/:channelId/bans
            const channelBansMatch = pathname.match(
                /^\/chat\/channels\/([^/]+)\/bans$/
            );
            if (channelBansMatch && method === 'GET') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const channelId = channelBansMatch[1];
                const pageNum = parseInt(
                    url.searchParams.get('page') || '1',
                    10
                );
                const limit = parseInt(
                    url.searchParams.get('limit') || '50',
                    10
                );

                const bansList = Array.from(bans.values())
                    .filter(b => b.channel_id === channelId)
                    .sort(
                        (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                    );

                return respond(route, 200, {
                    bans: bansList,
                    total: bansList.length,
                    page: pageNum,
                    limit,
                });
            }

            // Sync bans from Twitch
            if (pathname === '/chat/sync-bans' && method === 'POST') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const body = (request.postDataJSON?.() || {}) as {
                    channel_id?: string;
                    channel_name?: string;
                };

                if (!body.channel_name) {
                    return respond(route, 400, {
                        error: 'channel_name is required',
                    });
                }

                const jobId = `job-${Date.now()}`;

                // Create audit log
                createAuditLog(
                    'sync_bans',
                    'channel',
                    body.channel_id || 'default',
                    currentUser.id,
                    {
                        channel_name: body.channel_name,
                        job_id: jobId,
                    }
                );

                return respond(route, 200, {
                    success: true,
                    job_id: jobId,
                    message: 'Ban sync started',
                });
            }

            // RESTful sync-bans endpoint - /chat/channels/:channelId/sync-bans
            const syncBansMatch = pathname.match(
                /^\/chat\/channels\/([^/]+)\/sync-bans$/
            );
            if (syncBansMatch && method === 'POST') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const channelId = syncBansMatch[1];
                const body = (request.postDataJSON?.() || {}) as {
                    channel_name?: string;
                };

                if (!body.channel_name) {
                    return respond(route, 400, {
                        error: 'channel_name is required',
                    });
                }

                // Simulate validation error for invalid channel names (for testing)
                if (!VALID_TWITCH_CHANNEL_NAME.test(body.channel_name)) {
                    return respond(route, 400, {
                        error: 'Invalid Twitch channel name',
                    });
                }

                const jobId = `job-${Date.now()}`;

                // Create audit log
                createAuditLog(
                    'sync_bans',
                    'channel',
                    channelId,
                    currentUser.id,
                    {
                        channel_name: body.channel_name,
                        job_id: jobId,
                    }
                );

                return respond(route, 200, {
                    job_id: jobId,
                    status: 'pending',
                    message: 'Ban sync job created.',
                });
            }

            // Check sync progress
            const syncProgress = pathname.match(
                /^\/chat\/sync-bans\/([^/]+)\/progress$/
            );
            if (syncProgress && method === 'GET') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const jobId = syncProgress[1];

                // Simulate completed sync with some bans
                const syncedBans: MockBan[] = [
                    {
                        id: `ban-${banCounter++}`,
                        user_id: 'user-banned-1',
                        target_username: 'banneduser1',
                        channel_id: 'channel-1',
                        reason: 'Harassment',
                        created_at: new Date().toISOString(),
                        created_by: currentUser.id,
                        is_active: true,
                    },
                    {
                        id: `ban-${banCounter++}`,
                        user_id: 'user-banned-2',
                        target_username: 'banneduser2',
                        channel_id: 'channel-1',
                        reason: 'Spam',
                        created_at: new Date().toISOString(),
                        expires_at: new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                        created_by: currentUser.id,
                        is_active: true,
                    },
                ];

                syncedBans.forEach(ban => {
                    bans.set(ban.id, ban);
                });

                return respond(route, 200, {
                    job_id: jobId,
                    status: 'completed',
                    progress: 100,
                    bans_synced: syncedBans.length,
                    message:
                        'Twitch bans have been synchronized to your channel.',
                });
            }

            // RESTful sync-bans progress endpoint - /chat/channels/:channelId/sync-bans/:jobId
            const restfulSyncProgress = pathname.match(
                /^\/chat\/channels\/([^/]+)\/sync-bans\/([^/]+)$/
            );
            if (restfulSyncProgress && method === 'GET') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const channelId = restfulSyncProgress[1];
                const jobId = restfulSyncProgress[2];

                // Simulate completed sync with some bans
                const syncedBans: MockBan[] = [
                    {
                        id: `ban-${banCounter++}`,
                        user_id: 'user-banned-1',
                        target_username: 'banneduser1',
                        channel_id: channelId,
                        reason: 'Harassment',
                        created_at: new Date().toISOString(),
                        created_by: currentUser.id,
                        is_active: true,
                    },
                    {
                        id: `ban-${banCounter++}`,
                        user_id: 'user-banned-2',
                        target_username: 'banneduser2',
                        channel_id: channelId,
                        reason: 'Spam',
                        created_at: new Date().toISOString(),
                        expires_at: new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000
                        ).toISOString(),
                        created_by: currentUser.id,
                        is_active: true,
                    },
                ];

                syncedBans.forEach(ban => {
                    bans.set(ban.id, ban);
                });

                return respond(route, 200, {
                    job_id: jobId,
                    status: 'completed',
                    bans_added: syncedBans.length,
                    bans_existing: 0,
                    total_processed: syncedBans.length,
                });
            }

            // Unban user
            const unbanMatch = pathname.match(/^\/chat\/bans\/([^/]+)$/);
            if (unbanMatch && method === 'DELETE') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const banId = unbanMatch[1];
                const ban = bans.get(banId);

                if (!ban) {
                    return respond(route, 404, { error: 'Ban not found' });
                }

                ban.is_active = false;
                bans.set(banId, ban);

                // Update user ban status
                const user = users.get(ban.user_id);
                if (user) {
                    user.is_banned = false;
                    user.ban_reason = undefined;
                    user.banned_until = undefined;
                    users.set(user.id, user);
                }

                // Create audit log
                createAuditLog('unban_user', 'ban', banId, currentUser.id, {
                    target_username: ban.target_username,
                    user_id: ban.user_id,
                });

                return respond(route, 200, {
                    success: true,
                    message: 'User unbanned successfully',
                });
            }

            // RESTful unban endpoint - /chat/channels/:channelId/ban/:userId
            const restfulUnbanMatch = pathname.match(
                /^\/chat\/channels\/([^/]+)\/ban\/([^/]+)$/
            );
            if (restfulUnbanMatch && method === 'DELETE') {
                if (
                    !currentUser ||
                    (currentUser.role !== 'admin' &&
                        currentUser.role !== 'moderator')
                ) {
                    return respond(route, 403, {
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const channelId = restfulUnbanMatch[1];
                const userId = restfulUnbanMatch[2];

                // Find and deactivate the ban
                const userBan = Array.from(bans.values()).find(
                    b =>
                        b.channel_id === channelId &&
                        b.user_id === userId &&
                        b.is_active
                );

                if (!userBan) {
                    return respond(route, 404, { error: 'Ban not found' });
                }

                userBan.is_active = false;
                bans.set(userBan.id, userBan);

                // Update user ban status
                const user = users.get(userId);
                if (user) {
                    user.is_banned = false;
                    user.ban_reason = undefined;
                    user.banned_until = undefined;
                    users.set(user.id, user);
                }

                // Create audit log
                createAuditLog(
                    'unban_user',
                    'ban',
                    userBan.id,
                    currentUser.id,
                    {
                        target_username: userBan.target_username,
                        user_id: userId,
                        channel_id: channelId,
                    }
                );

                return respond(route, 200, {
                    success: true,
                    message: 'User unbanned successfully',
                });
            }

            // Check ban status
            const banStatus = pathname.match(/^\/users\/([^/]+)\/ban-status$/);
            if (banStatus && method === 'GET') {
                const userId = banStatus[1];
                const user = users.get(userId);
                const userBans = Array.from(bans.values()).filter(
                    b => b.user_id === userId && b.is_active
                );

                if (userBans.length > 0) {
                    const activeBan = userBans[0];
                    return respond(route, 200, {
                        is_banned: true,
                        ban_reason: activeBan.reason,
                        banned_until: activeBan.expires_at,
                    });
                }

                return respond(route, 200, {
                    is_banned: user?.is_banned || false,
                    ban_reason: user?.ban_reason,
                    banned_until: user?.banned_until,
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
                        error: 'Forbidden: Moderator access required',
                    });
                }

                const resourceId = url.searchParams.get('resource_id');
                const action = url.searchParams.get('action');
                const resourceType = url.searchParams.get('resource_type');

                let filteredLogs = [...auditLogs];
                if (resourceId) {
                    filteredLogs = filteredLogs.filter(
                        log => log.resource_id === resourceId
                    );
                }
                if (action) {
                    filteredLogs = filteredLogs.filter(
                        log => log.action === action
                    );
                }
                if (resourceType) {
                    filteredLogs = filteredLogs.filter(
                        log => log.resource_type === resourceType
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
        seedBan: (ban: MockBan) => {
            bans.set(ban.id, ban);
            return ban;
        },
        getUser: (id: string) => users.get(id),
        getBan: (id: string) => bans.get(id),
        getModerator: (id: string) => moderators.get(id),
        getAuditLogs: () => [...auditLogs],
        clear: () => {
            users.clear();
            bans.clear();
            moderators.clear();
            auditLogs.length = 0;
        },
    };
}

test.describe('Moderation E2E', () => {
    test.describe('Moderator Onboarding Flow', () => {
        test('admin creates new moderator and grants permissions', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as admin
            const adminUser: MockUser = {
                id: 'admin-1',
                username: 'adminuser',
                email: 'admin@example.com',
                role: 'admin',
                karma_points: 500,
                is_banned: false,
            };
            mocks.setCurrentUser(adminUser);

            // Seed a regular user to promote to moderator
            const regularUser: MockUser = {
                id: 'user-1',
                username: 'newmoderator',
                email: 'newmod@example.com',
                role: 'user',
                karma_points: 100,
                is_banned: false,
            };
            mocks.seedUser(regularUser);

            // Navigate to moderator management page
            await page.goto('/admin/moderators');
            await page.waitForLoadState('networkidle');

            // Wait for the moderators section to load
            await page.waitForSelector('text=Moderators', { timeout: 10000 });

            // Click "Add Moderator" button - wait for it to be ready
            const addButton = page.locator('button:has-text("Add Moderator")');
            await expect(addButton).toBeVisible({ timeout: 10000 });
            await addButton.click();

            // Wait for modal to appear
            const modal = page
                .locator('[role="dialog"]')
                .or(page.locator('.modal'));
            await expect(modal.first()).toBeVisible({ timeout: 5000 });

            // Search for user
            const searchInput = page.locator('#user-search');
            await searchInput.fill('newmoderator');

            // Wait for suggestions to appear by checking the suggestions list becomes visible
            const userSuggestionsList = page.locator('#user-suggestions');
            await expect(userSuggestionsList).toBeVisible({ timeout: 5000 });

            const userOption = page
                .locator('#user-suggestions button:has-text("newmoderator")')
                .first();
            await userOption.click();

            // Submit form - find the button within the modal and wait for it to be enabled
            const addModal = page.locator('[role="dialog"]').first();
            const submitButton = addModal
                .locator('button:has-text("Add Moderator")')
                .last();
            await expect(submitButton).toBeEnabled({ timeout: 5000 });
            await submitButton.click();

            // Wait for success message
            await expect(
                page
                    .locator('[role="alert"]')
                    .filter({ hasText: /success|added/i })
            ).toBeVisible({ timeout: 5000 });

            // Verify audit log was created
            const logs = mocks.getAuditLogs();
            const createLog = logs.find(
                log =>
                    log.action === 'create_moderator' &&
                    log.details?.user_id === 'user-1'
            );
            expect(createLog).toBeDefined();
            expect(createLog?.actor_id).toBe('admin-1');
        });

        test('moderator can access moderation features after being granted permissions', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to ban list (moderator feature)
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Verify moderator can access the page
            await expect(page).toHaveURL(/\/admin\/bans/);

            // Verify page heading or content is visible
            const heading = page.getByRole('heading', { name: /ban/i }).first();
            await expect(heading).toBeVisible({ timeout: 5000 });

            // Verify no access denied message
            await expect(
                page.getByText(/403|access denied|forbidden/i)
            ).not.toBeVisible();
        });

        test('regular user cannot access moderation features', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as regular user
            const regularUser: MockUser = {
                id: 'user-regular',
                username: 'regularuser',
                email: 'regular@example.com',
                role: 'user',
                karma_points: 50,
                is_banned: false,
            };
            mocks.setCurrentUser(regularUser);

            // Try to navigate to moderator management
            await page.goto('/admin/moderators');
            await page.waitForLoadState('networkidle');

            // Verify access is denied
            await expect(
                page.getByText(/403|access denied|forbidden/i)
            ).toBeVisible({
                timeout: 5000,
            });
        });
    });

    test.describe('Ban Sync Flow', () => {
        test('moderator syncs Twitch bans successfully', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to ban management page
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Click "Sync Bans" button
            const syncButton = page.getByRole('button', { name: /sync.*ban/i });
            await expect(syncButton).toBeVisible({ timeout: 5000 });
            await syncButton.click();

            // Wait for sync modal to appear
            const modal = page.locator('[role="dialog"]').first();
            await expect(modal).toBeVisible({ timeout: 5000 });

            // Fill in Twitch channel name
            const channelInput = modal
                .getByPlaceholder(/channel.*name/i)
                .or(modal.getByLabel(/twitch.*channel/i));
            await channelInput.fill('testchannel');

            // Click Start Sync button to show confirmation (scoped to modal)
            const startButton = modal.getByRole('button', {
                name: /start.*sync/i,
            });
            await startButton.click();

            // Click Confirm Sync button
            const confirmButton = modal.getByRole('button', {
                name: /confirm.*sync/i,
            });
            await confirmButton.click();

            // Wait for success message or progress indicator (inside modal)
            await expect(
                modal
                    .locator('[role="alert"]')
                    .filter({ hasText: /success|synced|completed/i })
            ).toBeVisible({ timeout: 10000 });

            // Verify audit log was created
            const logs = mocks.getAuditLogs();
            const syncLog = logs.find(log => log.action === 'sync_bans');
            expect(syncLog).toBeDefined();
            expect(syncLog?.details?.channel_name).toBe('testchannel');
        });

        test('verify bans appear in ban list after sync', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Seed some bans
            mocks.seedBan({
                id: 'ban-1',
                user_id: 'user-banned-1',
                target_username: 'banneduser1',
                channel_id: 'site',
                reason: 'Harassment',
                created_at: new Date().toISOString(),
                created_by: 'moderator-1',
                is_active: true,
            });

            mocks.seedBan({
                id: 'ban-2',
                user_id: 'user-banned-2',
                target_username: 'banneduser2',
                channel_id: 'site',
                reason: 'Spam',
                created_at: new Date().toISOString(),
                expires_at: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                ).toISOString(),
                created_by: 'moderator-1',
                is_active: true,
            });

            // Navigate to ban list
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Verify bans are visible in the list
            await expect(page.getByText('banneduser1')).toBeVisible({
                timeout: 5000,
            });
            await expect(page.getByText('banneduser2')).toBeVisible({
                timeout: 5000,
            });
            await expect(page.getByText('Harassment')).toBeVisible();
            await expect(page.getByText('Spam')).toBeVisible();
        });

        test('error handling for invalid Twitch channel', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to ban management page
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Click "Sync Bans" button
            const syncButton = page.getByRole('button', { name: /sync.*ban/i });
            if (
                await syncButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await syncButton.click();

                // Wait for sync modal
                const modal = page.locator('[role="dialog"]').first();
                await expect(modal).toBeVisible({ timeout: 5000 });

                // Fill in invalid channel name
                const channelInput = modal
                    .getByPlaceholder(/channel.*name/i)
                    .or(modal.getByLabel(/twitch.*channel/i));
                await channelInput.fill('invalid!!!channel###');

                // Click Start Sync button to show confirmation (scoped to modal)
                const startButton = modal.getByRole('button', {
                    name: /start.*sync/i,
                });
                await startButton.click();

                // Click Confirm Sync button
                const confirmButton = modal.getByRole('button', {
                    name: /confirm.*sync/i,
                });
                await confirmButton.click();

                // Verify error message is displayed (inside modal)
                await expect(
                    modal
                        .locator('[role="alert"]')
                        .filter({ hasText: /error|invalid|failed/i })
                ).toBeVisible({ timeout: 5000 });
            }
        });
    });

    test.describe('Audit Log Verification', () => {
        test('audit logs show all moderation actions', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as admin
            const adminUser: MockUser = {
                id: 'admin-1',
                username: 'adminuser',
                email: 'admin@example.com',
                role: 'admin',
                karma_points: 500,
                is_banned: false,
            };
            mocks.setCurrentUser(adminUser);

            // Create some audit logs via API
            await page.request.post('/api/admin/moderators', {
                data: {
                    user_id: 'user-1',
                    channel_id: 'channel-1',
                    role: 'moderator',
                },
            });

            await page.request.post('/api/chat/sync-bans', {
                data: {
                    channel_id: 'channel-1',
                    channel_name: 'testchannel',
                },
            });

            // Navigate to audit logs page
            await page.goto('/admin/audit-logs');
            await page.waitForLoadState('networkidle');

            // Verify page loaded
            await expect(
                page.getByRole('heading', { name: /audit.*log/i })
            ).toBeVisible({
                timeout: 5000,
            });

            // Verify logs are displayed
            const logs = mocks.getAuditLogs();
            expect(logs.length).toBeGreaterThan(0);

            // Check for create_moderator action
            await expect(page.getByText(/create.*moderator/i)).toBeVisible({
                timeout: 5000,
            });

            // Check for sync_bans action
            await expect(page.getByText(/sync.*ban/i)).toBeVisible({
                timeout: 5000,
            });
        });

        test('audit log filtering by action type', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to audit logs
            await page.goto('/admin/audit-logs');
            await page.waitForLoadState('networkidle');

            // Find filter dropdown or input
            const filterSelect = page
                .getByLabel(/action.*type/i)
                .or(page.getByLabel(/filter/i));

            if (
                await filterSelect
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await filterSelect.click();

                // Select specific action type
                const option = page
                    .getByRole('option', { name: /sync.*ban/i })
                    .or(
                        page
                            .getByText(/sync.*ban/i)
                            .filter({
                                has: page.locator('input[type="checkbox"]'),
                            })
                    );

                if (
                    await option.isVisible({ timeout: 2000 }).catch(() => false)
                ) {
                    await option.click();

                    // Verify filtered results
                    await page.waitForLoadState('networkidle');

                    // Should only show sync_bans logs
                    await expect(page.getByText(/sync.*ban/i)).toBeVisible();
                }
            }
        });

        test('audit log details modal displays complete information', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Create an audit log
            await page.request.post('/api/chat/sync-bans', {
                data: {
                    channel_id: 'channel-1',
                    channel_name: 'testchannel',
                },
            });

            // Navigate to audit logs
            await page.goto('/admin/audit-logs');
            await page.waitForLoadState('networkidle');

            // Click on first log entry
            const logEntry = page
                .locator('[data-testid^="audit-log-"]')
                .first()
                .or(page.getByText(/sync.*ban/i).first());

            if (
                await logEntry.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await logEntry.click();

                // Wait for details modal or expanded view to become visible
                const details = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.expanded-details'));
                await expect(details).toBeVisible({ timeout: 5000 });

                // Verify details are displayed
                await expect(
                    details
                        .getByText(/channel.*name/i)
                        .or(details.getByText('testchannel'))
                ).toBeVisible({ timeout: 5000 });
            }
        });
    });

    test.describe('Banned User Interactions', () => {
        test('banned user sees disabled interaction buttons on posts', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as banned user
            const bannedUser: MockUser = {
                id: 'user-banned',
                username: 'banneduser',
                email: 'banned@example.com',
                role: 'user',
                karma_points: 0,
                is_banned: true,
                ban_reason: 'Violation of community guidelines',
            };
            mocks.setCurrentUser(bannedUser);

            // Seed ban for the user
            mocks.seedBan({
                id: 'ban-1',
                user_id: 'user-banned',
                target_username: 'banneduser',
                channel_id: 'channel-1',
                reason: 'Violation of community guidelines',
                created_at: new Date().toISOString(),
                created_by: 'moderator-1',
                is_active: true,
            });

            // Navigate to a clip page or post
            await page.goto('/clips/test-clip-1');
            await page.waitForLoadState('networkidle');

            // Verify comment input is disabled or not visible
            const commentInput = page.getByPlaceholder(/comment|add.*comment/i);
            if (
                await commentInput
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await expect(commentInput).toBeDisabled();
            }

            // Verify vote buttons are disabled
            const upvoteButton = page.getByRole('button', { name: /upvote/i });
            if (
                await upvoteButton
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await expect(upvoteButton).toBeDisabled();
            }

            // Verify ban message is displayed
            await expect(
                page
                    .getByText(/banned|restricted|suspended/i)
                    .filter({ hasText: /cannot/i })
            ).toBeVisible({ timeout: 5000 });
        });

        test('unbanned user regains full interaction capabilities', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as previously banned but now unbanned user
            const unbannedUser: MockUser = {
                id: 'user-unbanned',
                username: 'unbanneduser',
                email: 'unbanned@example.com',
                role: 'user',
                karma_points: 50,
                is_banned: false,
            };
            mocks.setCurrentUser(unbannedUser);

            // Navigate to a clip page
            await page.goto('/clips/test-clip-1');
            await page.waitForLoadState('networkidle');

            // Verify comment input is enabled
            const commentInput = page.getByPlaceholder(/comment|add.*comment/i);
            if (
                await commentInput
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await expect(commentInput).toBeEnabled();
            }

            // Verify vote buttons are enabled
            const upvoteButton = page.getByRole('button', { name: /upvote/i });
            if (
                await upvoteButton
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await expect(upvoteButton).toBeEnabled();
            }
        });

        test('moderator can revoke ban and user is immediately unrestricted', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Seed a banned user
            const bannedUser: MockUser = {
                id: 'user-banned',
                username: 'banneduser',
                email: 'banned@example.com',
                role: 'user',
                karma_points: 0,
                is_banned: true,
                ban_reason: 'Spam',
            };
            mocks.seedUser(bannedUser);

            // Seed the ban
            mocks.seedBan({
                id: 'ban-1',
                user_id: 'user-banned',
                target_username: 'banneduser',
                channel_id: 'channel-1',
                reason: 'Spam',
                created_at: new Date().toISOString(),
                created_by: 'moderator-1',
                is_active: true,
            });

            // Navigate to ban list
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Find the ban entry
            const banEntry = page.getByText('banneduser').first();
            await expect(banEntry).toBeVisible({ timeout: 5000 });

            // Click revoke/unban button
            const revokeButton = page
                .getByRole('button', { name: /revoke|unban/i })
                .filter({ has: page.locator('text=banneduser') })
                .or(
                    page.getByRole('button', { name: /revoke|unban/i }).first()
                );

            if (
                await revokeButton
                    .isVisible({ timeout: 2000 })
                    .catch(() => false)
            ) {
                await revokeButton.click();

                // Confirm if there's a confirmation dialog
                const confirmButton = page
                    .getByRole('button', { name: /confirm|yes|revoke/i })
                    .filter({ hasNotText: /cancel/i });
                if (
                    await confirmButton
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    await confirmButton.click();
                }

                // Wait for success message
                await expect(
                    page
                        .locator('[role="alert"]')
                        .filter({ hasText: /success|unbanned|revoked/i })
                ).toBeVisible({ timeout: 5000 });

                // Verify audit log was created
                const logs = mocks.getAuditLogs();
                const unbanLog = logs.find(
                    log =>
                        log.action === 'unban_user' &&
                        log.resource_id === 'ban-1'
                );
                expect(unbanLog).toBeDefined();

                // Verify ban is no longer active
                const updatedBan = mocks.getBan('ban-1');
                expect(updatedBan?.is_active).toBe(false);
            }
        });
    });

    test.describe('Permission Enforcement', () => {
        test('non-moderators cannot sync bans', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as regular user
            const regularUser: MockUser = {
                id: 'user-regular',
                username: 'regularuser',
                email: 'regular@example.com',
                role: 'user',
                karma_points: 50,
                is_banned: false,
            };
            mocks.setCurrentUser(regularUser);

            // Try to navigate to ban management
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Verify access is denied
            await expect(
                page.getByText(/403|access denied|forbidden/i)
            ).toBeVisible({
                timeout: 5000,
            });
        });

        test('non-admins cannot manage moderators', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator (not admin)
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Try to navigate to moderator management
            await page.goto('/admin/moderators');
            await page.waitForLoadState('networkidle');

            // Verify access is denied or add button is not visible
            const accessDenied = page.getByText(/403|access denied|forbidden/i);
            const addButton = page.getByRole('button', {
                name: /add moderator/i,
            });

            const isAccessDenied = await accessDenied
                .isVisible({ timeout: 2000 })
                .catch(() => false);
            const isAddButtonHidden = !(await addButton
                .isVisible({ timeout: 2000 })
                .catch(() => false));

            expect(isAccessDenied || isAddButtonHidden).toBe(true);
        });

        test('moderators can view audit logs but not manage moderators', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to audit logs
            await page.goto('/admin/audit-logs');
            await page.waitForLoadState('networkidle');

            // Verify moderator can access audit logs
            await expect(
                page.getByRole('heading', { name: /audit.*log/i })
            ).toBeVisible({
                timeout: 5000,
            });
            await expect(
                page.getByText(/403|access denied|forbidden/i)
            ).not.toBeVisible();
        });
    });

    test.describe('Error Handling and Edge Cases', () => {
        test('handles network errors gracefully during ban sync', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Override sync endpoint to simulate network error
            await page.route('**/api/chat/sync-bans', async route => {
                await route.abort('failed');
            });

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to ban management
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Try to sync bans
            const syncButton = page.getByRole('button', { name: /sync.*ban/i });
            if (
                await syncButton.isVisible({ timeout: 2000 }).catch(() => false)
            ) {
                await syncButton.click();

                const modal = page
                    .locator('[role="dialog"]')
                    .or(page.locator('.modal'));
                if (
                    await modal
                        .first()
                        .isVisible({ timeout: 2000 })
                        .catch(() => false)
                ) {
                    const channelInput = page
                        .getByPlaceholder(/channel.*name/i)
                        .or(page.getByLabel(/twitch.*channel/i));
                    await channelInput.fill('testchannel');

                    const confirmButton = page
                        .getByRole('button', { name: /sync|confirm|start/i })
                        .filter({ hasNotText: /cancel/i });
                    await confirmButton.click();

                    // Verify error message is displayed
                    await expect(
                        page
                            .locator('[role="alert"]')
                            .filter({ hasText: /error|failed|network/i })
                    ).toBeVisible({ timeout: 5000 });
                }
            }
        });

        test('handles empty ban list gracefully', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Navigate to ban list (with no bans seeded)
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Verify empty state message is displayed
            await expect(
                page
                    .getByText(/no bans|empty|no results/i)
                    .filter({ hasNotText: /found|matching/ })
            ).toBeVisible({ timeout: 5000 });
        });

        test('handles concurrent moderator actions without conflicts', async ({
            page,
        }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as admin
            const adminUser: MockUser = {
                id: 'admin-1',
                username: 'adminuser',
                email: 'admin@example.com',
                role: 'admin',
                karma_points: 500,
                is_banned: false,
            };
            mocks.setCurrentUser(adminUser);

            // Seed two users to promote
            mocks.seedUser({
                id: 'user-1',
                username: 'newmod1',
                email: 'newmod1@example.com',
                role: 'user',
                karma_points: 100,
                is_banned: false,
            });

            mocks.seedUser({
                id: 'user-2',
                username: 'newmod2',
                email: 'newmod2@example.com',
                role: 'user',
                karma_points: 100,
                is_banned: false,
            });

            // Make concurrent requests to add moderators
            const [response1, response2] = await Promise.all([
                page.request.post('/api/admin/moderators', {
                    data: {
                        user_id: 'user-1',
                        channel_id: 'channel-1',
                        role: 'moderator',
                    },
                }),
                page.request.post('/api/admin/moderators', {
                    data: {
                        user_id: 'user-2',
                        channel_id: 'channel-1',
                        role: 'moderator',
                    },
                }),
            ]);

            // Verify both requests succeeded
            expect(response1.status()).toBe(201);
            expect(response2.status()).toBe(201);

            // Verify both audit logs were created
            const logs = mocks.getAuditLogs();
            const moderatorLogs = logs.filter(
                log => log.action === 'create_moderator'
            );
            expect(moderatorLogs.length).toBe(2);
        });
    });

    test.describe('Performance and Browser Compatibility', () => {
        test('ban list loads within acceptable time', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as moderator
            const moderatorUser: MockUser = {
                id: 'moderator-1',
                username: 'moderatoruser',
                email: 'moderator@example.com',
                role: 'moderator',
                karma_points: 200,
                is_banned: false,
            };
            mocks.setCurrentUser(moderatorUser);

            // Seed multiple bans
            for (let i = 1; i <= 20; i++) {
                mocks.seedBan({
                    id: `ban-${i}`,
                    user_id: `user-${i}`,
                    target_username: `user${i}`,
                    channel_id: 'channel-1',
                    reason: `Reason ${i}`,
                    created_at: new Date().toISOString(),
                    created_by: 'moderator-1',
                    is_active: true,
                });
            }

            // Measure page load time
            const startTime = Date.now();
            await page.goto('/admin/bans');
            await page.waitForLoadState('networkidle');

            // Wait for ban list to be visible
            await expect(page.getByText('user1')).toBeVisible({
                timeout: 5000,
            });

            const loadTime = Date.now() - startTime;

            // Verify load time is acceptable (< 3 seconds for mocked data)
            expect(loadTime).toBeLessThan(3000);
        });

        test('moderator management UI is responsive', async ({ page }) => {
            const mocks = await setupModerationMocks(page);

            // Set current user as admin
            const adminUser: MockUser = {
                id: 'admin-1',
                username: 'adminuser',
                email: 'admin@example.com',
                role: 'admin',
                karma_points: 500,
                is_banned: false,
            };
            mocks.setCurrentUser(adminUser);

            // Navigate to moderator management
            await page.goto('/admin/moderators');
            await page.waitForLoadState('networkidle');

            // Test different viewport sizes
            await page.setViewportSize({ width: 375, height: 667 }); // Mobile

            // Verify UI is still accessible
            const heading = page.getByRole('heading', { name: /moderator/i });
            await expect(heading).toBeVisible();

            await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop

            // Verify UI is still accessible
            await expect(heading).toBeVisible();
        });
    });
});
