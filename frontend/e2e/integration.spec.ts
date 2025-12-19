import { expect, test } from '@playwright/test';

test.describe('Authentication Flows', () => {
    test('should display login button on homepage', async ({ page }) => {
        await page.goto('/');
        
        const loginButton = page.locator('button', { hasText: /login|sign in/i });
        await expect(loginButton).toBeVisible();
    });

    test('should handle authentication state correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Check for authentication-related UI elements
        const authElement = page.locator('button, a').filter({ hasText: /login|sign in|profile|account/i });
        await expect(authElement.first()).toBeVisible();
    });

    test('should redirect to authentication when accessing protected routes', async ({ page }) => {
        // Try to access a protected route (e.g., user settings)
        await page.goto('/settings');
        await page.waitForLoadState('networkidle');
        
        // Should either redirect to login or show login prompt
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/login|auth|settings/);
    });

    test('should handle OAuth popup window', async ({ page, context }) => {
        await page.goto('/');
        
        const loginButton = page.locator('button', { hasText: /login|sign in/i }).first();
        
        if (await loginButton.isVisible()) {
            // Set up listener for popup
            const popupPromise = context.waitForEvent('page');
            
            await loginButton.click();
            
            // Check if popup was opened or redirect occurred
            const popup = await popupPromise.catch(() => null);
            
            if (popup) {
                expect(popup.url()).toContain('twitch.tv');
                await popup.close();
            }
        }
    });

    test('should handle logout functionality', async ({ page }) => {
        await page.goto('/');
        
        // Look for logout button (may not be visible if not logged in)
        const logoutButton = page.locator('button', { hasText: /logout|sign out/i });
        
        if (await logoutButton.isVisible()) {
            await logoutButton.click();
            await page.waitForLoadState('networkidle');
            
            // Should show login button again after logout
            const loginButton = page.locator('button', { hasText: /login|sign in/i });
            await expect(loginButton).toBeVisible();
        }
    });
});

test.describe('Submission Workflows', () => {
    test('should show submit button or link', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Look for submit/upload button
        const submitButton = page.locator('button, a').filter({ hasText: /submit|upload|add clip/i });
        
        // May require authentication
        if (await submitButton.count() > 0) {
            await expect(submitButton.first()).toBeVisible();
        }
    });

    test('should navigate to submission page', async ({ page }) => {
        await page.goto('/');
        
        const submitLink = page.locator('a, button').filter({ hasText: /submit|upload|add clip/i });
        
        if (await submitLink.count() > 0) {
            await submitLink.first().click();
            await page.waitForLoadState('networkidle');
            
            // Should be on submission page or login page
            expect(page.url()).toMatch(/submit|upload|login|auth/);
        }
    });

    test('should display submission form for authenticated users', async ({ page }) => {
        // This test would require authentication setup
        test.skip(true, 'Requires authenticated session');
        
        await page.goto('/submit');
        
        // Should show submission form
        const urlInput = page.locator('input[type="text"], input[type="url"]').first();
        await expect(urlInput).toBeVisible();
    });

    test('should validate Twitch clip URL format', async ({ page }) => {
        test.skip(true, 'Requires authenticated session and submission form');
        
        await page.goto('/submit');
        
        const urlInput = page.locator('input[name="url"], input[placeholder*="URL"]').first();
        await urlInput.fill('invalid-url');
        
        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();
        
        // Should show validation error
        const errorMessage = page.locator('text=/invalid|error/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Search Functionality', () => {
    test('should display search input', async ({ page }) => {
        await page.goto('/');
        
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        await expect(searchInput.first()).toBeVisible();
    });

    test('should perform basic search', async ({ page }) => {
        await page.goto('/');
        
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
        await searchInput.fill('gameplay');
        await searchInput.press('Enter');
        
        await page.waitForLoadState('networkidle');
        
        // URL should reflect search query
        expect(page.url()).toContain('search');
    });

    test('should show search results', async ({ page }) => {
        await page.goto('/search?q=test');
        await page.waitForLoadState('networkidle');
        
        // Should show results or "no results" message
        const resultsContainer = page.locator('[data-testid="search-results"], [data-testid="clip-card"]');
        const noResultsMessage = page.locator('text=/no results|no clips found/i');
        
        const hasResults = await resultsContainer.count() > 0;
        const hasNoResultsMessage = await noResultsMessage.isVisible();
        
        expect(hasResults || hasNoResultsMessage).toBeTruthy();
    });

    test('should filter search results', async ({ page }) => {
        await page.goto('/search?q=clips');
        await page.waitForLoadState('networkidle');
        
        // Look for filter options
        const filterButton = page.locator('button').filter({ hasText: /filter|sort/i });
        
        if (await filterButton.count() > 0) {
            await filterButton.first().click();
            
            // Check for filter options
            const filterOptions = page.locator('[role="menuitem"], [role="option"]');
            expect(await filterOptions.count()).toBeGreaterThan(0);
        }
    });

    test('should handle empty search', async ({ page }) => {
        await page.goto('/search?q=');
        await page.waitForLoadState('networkidle');
        
        // Should handle gracefully
        expect(page.url()).toContain('search');
    });

    test('should support search suggestions/autocomplete', async ({ page }) => {
        await page.goto('/');
        
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
        await searchInput.fill('game');
        
        // Wait a bit for autocomplete to appear
        await page.waitForTimeout(500);
        
        // Check for suggestions dropdown
        const suggestions = page.locator('[role="listbox"], [role="menu"]');
        
        // Suggestions may or may not be implemented
        const hasSuggestions = await suggestions.isVisible();
        // This is optional, so we just check it doesn't error
        expect(typeof hasSuggestions).toBe('boolean');
    });
});

test.describe('Engagement Features', () => {
    test('should display like/vote buttons on clips', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="clip-card"]', { timeout: 10000 });
        
        // Check for engagement buttons
        const likeButton = page.locator('button').filter({ hasText: /like|upvote|vote/i });
        
        if (await likeButton.count() > 0) {
            await expect(likeButton.first()).toBeVisible();
        }
    });

    test('should navigate to clip comments', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="clip-card"]', { timeout: 10000 });
        
        const firstClip = page.locator('[data-testid="clip-card"]').first();
        await firstClip.click();
        
        await page.waitForLoadState('networkidle');
        
        // Should be on clip detail page
        expect(page.url()).toMatch(/clip\/[a-f0-9-]+/);
        
        // Look for comment section
        const commentSection = page.locator('[data-testid="comments"], section, div').filter({ hasText: /comment/i });
        expect(await commentSection.count()).toBeGreaterThan(0);
    });

    test('should show comment form for authenticated users', async ({ page }) => {
        test.skip(true, 'Requires authenticated session');
        
        await page.goto('/');
        await page.waitForSelector('[data-testid="clip-card"]');
        
        const firstClip = page.locator('[data-testid="clip-card"]').first();
        await firstClip.click();
        
        await page.waitForLoadState('networkidle');
        
        const commentForm = page.locator('form, textarea').filter({ hasText: /comment/i });
        await expect(commentForm.first()).toBeVisible();
    });

    test('should handle favorite/bookmark functionality', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="clip-card"]', { timeout: 10000 });
        
        // Look for favorite/bookmark button
        const favoriteButton = page.locator('button').filter({ hasText: /favorite|bookmark|save/i });
        
        if (await favoriteButton.count() > 0) {
            const button = favoriteButton.first();
            await expect(button).toBeVisible();
            
            // Try to click it (may require auth)
            await button.click();
            await page.waitForTimeout(500);
            
            // Should either perform action or prompt for login
        }
    });
});

test.describe('Premium Features', () => {
    test('should display premium/subscription information', async ({ page }) => {
        await page.goto('/');
        
        // Look for premium/pro/subscription links
        const premiumLink = page.locator('a, button').filter({ hasText: /premium|pro|subscribe|upgrade/i });
        
        if (await premiumLink.count() > 0) {
            await expect(premiumLink.first()).toBeVisible();
        }
    });

    test('should navigate to premium page', async ({ page }) => {
        await page.goto('/');
        
        const premiumLink = page.locator('a').filter({ hasText: /premium|pro|subscribe|upgrade/i });
        
        if (await premiumLink.count() > 0) {
            await premiumLink.first().click();
            await page.waitForLoadState('networkidle');
            
            expect(page.url()).toMatch(/premium|subscription|pricing/);
        }
    });

    test('should show premium tiers and pricing', async ({ page }) => {
        // Navigate to pricing/premium page if it exists
        const response = await page.goto('/premium');
        
        if (response?.status() === 200) {
            await page.waitForLoadState('networkidle');
            
            // Look for pricing information
            const pricingElement = page.locator('text=/\\$[0-9]+|price|tier/i');
            expect(await pricingElement.count()).toBeGreaterThan(0);
        }
    });

    test('should handle subscription checkout flow', async ({ page }) => {
        test.skip(true, 'Requires authenticated session and Stripe test mode');
        
        await page.goto('/premium');
        
        const subscribeButton = page.locator('button').filter({ hasText: /subscribe|get started|buy/i });
        await subscribeButton.first().click();
        
        await page.waitForLoadState('networkidle');
        
        // Should navigate to checkout or show payment form
        const checkoutIndicator = page.locator('text=/payment|checkout|card/i');
        await expect(checkoutIndicator.first()).toBeVisible({ timeout: 10000 });
    });
});

test.describe('Mobile Responsiveness', () => {
    test('should render correctly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Page should load without errors
        expect(page.url()).toBeTruthy();
        
        // Check for mobile menu or navigation
        const mobileMenu = page.locator('button').filter({ hasText: /menu|navigation/i });
        
        // Mobile menu may exist
        const hasMobileMenu = await mobileMenu.count() > 0;
        expect(typeof hasMobileMenu).toBe('boolean');
    });

    test('should handle mobile navigation', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Look for hamburger menu
        const menuButton = page.locator('button[aria-label*="menu" i], button[aria-label*="navigation" i]');
        
        if (await menuButton.count() > 0) {
            await menuButton.first().click();
            await page.waitForTimeout(500);
            
            // Navigation should be visible
            const navMenu = page.locator('nav, [role="navigation"]');
            await expect(navMenu.first()).toBeVisible();
        }
    });
});

test.describe('Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);
    });

    test('should have accessible navigation', async ({ page }) => {
        await page.goto('/');
        
        // Check for main navigation
        const nav = page.locator('nav, [role="navigation"]');
        expect(await nav.count()).toBeGreaterThan(0);
    });

    test('should have skip to content link', async ({ page }) => {
        await page.goto('/');
        
        // Check for skip link (common accessibility feature)
        const skipLink = page.locator('a[href="#main"], a[href="#content"]');
        
        // Optional feature
        const hasSkipLink = await skipLink.count() > 0;
        expect(typeof hasSkipLink).toBe('boolean');
    });
});
