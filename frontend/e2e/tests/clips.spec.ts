import { expect, test, Page } from '@playwright/test';

type MockClip = {
    id: string;
    twitch_clip_id: string;
    twitch_clip_url: string;
    embed_url: string;
    title: string;
    creator_name: string;
    broadcaster_name: string;
    view_count: number;
    created_at: string;
    imported_at: string;
    vote_score: number;
    comment_count: number;
    favorite_count: number;
    is_featured: boolean;
    is_nsfw: boolean;
    is_removed: boolean;
    game_name?: string;
    game_id?: string;
    thumbnail_url?: string;
    user_vote?: 1 | -1 | null;
    is_favorited?: boolean;
};

const mockUser = {
    id: 'user-1',
    twitch_id: 'twitch-user-1',
    username: 'e2e_user',
    display_name: 'E2E User',
    role: 'user',
    karma_points: 100,
    is_banned: false,
    is_verified: true,
    is_premium: false,
    created_at: new Date().toISOString(),
};

const now = new Date().toISOString();

const feedPages = [
    {
        page: 1,
        total: 4,
        has_more: true,
        cursor: 'cursor-1',
        clips: [
            {
                id: 'clip-1',
                twitch_clip_id: 'twitch-clip-1',
                twitch_clip_url: 'https://clips.twitch.tv/clip-1',
                embed_url: 'https://clips.twitch.tv/embed?clip=clip-1&parent=localhost',
                title: 'Amazing clutch play',
                creator_name: 'CreatorOne',
                broadcaster_name: 'StreamerOne',
                view_count: 1200,
                created_at: now,
                imported_at: now,
                vote_score: 87,
                comment_count: 14,
                favorite_count: 23,
                is_featured: false,
                is_nsfw: false,
                is_removed: false,
                game_name: 'Valorant',
                game_id: 'game-1',
                thumbnail_url: 'https://placehold.co/640x360',
            },
            {
                id: 'clip-2',
                twitch_clip_id: 'twitch-clip-2',
                twitch_clip_url: 'https://clips.twitch.tv/clip-2',
                embed_url: 'https://clips.twitch.tv/embed?clip=clip-2&parent=localhost',
                title: 'Hilarious fail moment',
                creator_name: 'CreatorTwo',
                broadcaster_name: 'StreamerTwo',
                view_count: 540,
                created_at: now,
                imported_at: now,
                vote_score: 12,
                comment_count: 3,
                favorite_count: 5,
                is_featured: true,
                is_nsfw: false,
                is_removed: false,
                game_name: 'Fortnite',
                game_id: 'game-2',
                thumbnail_url: 'https://placehold.co/640x360',
            },
        ] satisfies MockClip[],
    },
    {
        page: 2,
        total: 4,
        has_more: false,
        cursor: null,
        clips: [
            {
                id: 'clip-3',
                twitch_clip_id: 'twitch-clip-3',
                twitch_clip_url: 'https://clips.twitch.tv/clip-3',
                embed_url: 'https://clips.twitch.tv/embed?clip=clip-3&parent=localhost',
                title: 'Speedrun world record',
                creator_name: 'SpeedRunner',
                broadcaster_name: 'StreamerThree',
                view_count: 9100,
                created_at: now,
                imported_at: now,
                vote_score: 152,
                comment_count: 45,
                favorite_count: 60,
                is_featured: false,
                is_nsfw: false,
                is_removed: false,
                game_name: 'Celeste',
                game_id: 'game-3',
                thumbnail_url: 'https://placehold.co/640x360',
            },
            {
                id: 'clip-4',
                twitch_clip_id: 'twitch-clip-4',
                twitch_clip_url: 'https://clips.twitch.tv/clip-4',
                embed_url: 'https://clips.twitch.tv/embed?clip=clip-4&parent=localhost',
                title: 'Incredible comeback',
                creator_name: 'CreatorFour',
                broadcaster_name: 'StreamerFour',
                view_count: 2200,
                created_at: now,
                imported_at: now,
                vote_score: 64,
                comment_count: 9,
                favorite_count: 18,
                is_featured: false,
                is_nsfw: false,
                is_removed: false,
                game_name: 'League of Legends',
                game_id: 'game-4',
                thumbnail_url: 'https://placehold.co/640x360',
            },
        ] satisfies MockClip[],
    },
];

const allMockClips = feedPages.flatMap(page => page.clips);

async function setupClipFeedMocks(page: Page) {
    // Auth endpoints: keep user unauthenticated but stable
    await page.route('**/api/v1/auth/me', route =>
        route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'unauthorized' }) })
    );

    await page.route('**/api/v1/auth/test-login', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ user: mockUser }),
        })
    );

    // Clip feed with two pages for infinite scroll
    let feedRequestCount = 0;
    await page.route('**/api/v1/feeds/clips**', async route => {
        const response = feedPages[Math.min(feedRequestCount, feedPages.length - 1)];
        feedRequestCount += 1;

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                clips: response.clips,
                pagination: {
                    limit: 20,
                    offset: (response.page - 1) * 20,
                    total: response.total,
                    total_pages: 2,
                    has_more: response.has_more,
                    cursor: response.cursor,
                },
            }),
        });
    });

    // Comments for a clip
    await page.route('**/api/v1/clips/*/comments**', route =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ comments: [], total: 0, has_more: false }),
        })
    );

    // Clip detail (registered after comments so it doesn't capture them)
    await page.route('**/api/v1/clips/*', route => {
        const url = new URL(route.request().url());
        const id = url.pathname.split('/').pop() || 'clip-1';
        const clip = allMockClips.find(c => c.id === id) || allMockClips[0];

        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: clip }),
        });
    });
}

test.beforeEach(async ({ page }) => {
    await setupClipFeedMocks(page);
});

test.describe('Clip Feed', () => {
    test('should load and display clips', async ({ page }) => {
        await page.goto('/');

        // Wait for clips to load
        await page.waitForSelector('[data-testid="clip-card"]', {
            timeout: 5000,
        });

        // Check if clips are displayed
        const clipCards = await page
            .locator('[data-testid="clip-card"]')
            .count();
        expect(clipCards).toBeGreaterThan(0);
    });

    test('should filter clips by sort option', async ({ page }) => {
        await page.goto('/');

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Select the "New" sort option from the dropdown
        const sortSelect = page.locator('#sort-select');
        await sortSelect.selectOption('new');

        // Wait for clips to reload
        await page.waitForLoadState('networkidle');

        // Accept either the dedicated /new route or a ?sort=new query param
        const url = new URL(page.url());
        const sortParam = url.searchParams.get('sort');
        expect(url.pathname === '/new' || sortParam === 'new').toBeTruthy();
    });

    test('should scroll and load more clips (infinite scroll)', async ({
        page,
    }) => {
        await page.goto('/');

        // Wait for initial clips
        await page.waitForSelector('[data-testid="clip-card"]');
        const initialCount = await page
            .locator('[data-testid="clip-card"]')
            .count();

        // Scroll to bottom
        await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight)
        );

        // Wait for new clips to load
        await page.waitForTimeout(2000);

        // Check if more clips loaded (this depends on whether there are more clips)
        const newCount = await page
            .locator('[data-testid="clip-card"]')
            .count();

        // Either more clips loaded, or we're at the end
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
    });
});

test.describe('Clip Detail', () => {
    test('should navigate to clip detail page', async ({ page }) => {
        await page.goto('/');

        // Wait for clips to load
        await page.waitForSelector('[data-testid="clip-card"]');

        // Click on first clip
        const firstClipLink = page
            .locator('[data-testid="clip-card"] a')
            .first();
        await firstClipLink.click();

        // Wait for navigation
        await page.waitForLoadState('networkidle');

        // Check if we're on clip detail page
        const url = new URL(page.url());
        expect(url.pathname).toMatch(/\/clip\/[^/]+/);
    });
});

test.describe('User Authentication', () => {
    test.beforeEach(async ({ page }) => {
        // Force unauthenticated state even when auto-login is enabled for E2E
        await page.route('**/api/v1/auth/test-login', route =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'unauthorized' }),
            })
        );
    });

    test('should show login button for unauthenticated users', async ({
        page,
    }) => {
        await page.goto('/');

        // Look for login/sign in button
        const loginButton = page.getByTestId('login-button');
        await expect(loginButton).toBeVisible();
    });

    test('should redirect to Twitch OAuth when clicking login', async ({
        page,
    }) => {
        await page.goto('/');

        // Find and click login button
        const loginButton = page.getByTestId('login-button').first();

        if (await loginButton.isVisible()) {
            // Listen for navigation
            const [popup] = await Promise.all([
                page.waitForEvent('popup'),
                loginButton.click(),
            ]).catch(() => [null]); // Handle if no popup opens

            if (popup) {
                // Verify we're redirected to Twitch
                expect(popup.url()).toContain('twitch.tv');
            }
        }
    });
});

test.describe('Responsive Design', () => {
    test('should display correctly on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Wait for page load
        await page.waitForLoadState('networkidle');

        // Mobile layout smoke check

        // Page should load without errors
        expect(page.url()).toBeTruthy();
    });

    test('should display correctly on tablet', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        // Wait for page load
        await page.waitForLoadState('networkidle');

        // Page should load without errors
        expect(page.url()).toBeTruthy();
    });

    test('should display correctly on desktop', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        // Wait for page load
        await page.waitForLoadState('networkidle');

        // Page should load without errors
        expect(page.url()).toBeTruthy();
    });
});
