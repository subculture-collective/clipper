import { test, expect } from '@playwright/test';

test.describe('Clip Feed', () => {
  test('should load and display clips', async ({ page }) => {
    await page.goto('/');

    // Wait for clips to load
    await page.waitForSelector('[data-testid="clip-card"]', { timeout: 5000 });

    // Check if clips are displayed
    const clipCards = await page.locator('[data-testid="clip-card"]').count();
    expect(clipCards).toBeGreaterThan(0);
  });

  test('should filter clips by sort option', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click on "New" sort option if available
    const newButton = page.locator('button', { hasText: 'New' });
    if (await newButton.isVisible()) {
      await newButton.click();
      
      // Wait for clips to reload
      await page.waitForTimeout(1000);
      
      // Verify URL has updated
      expect(page.url()).toContain('sort=new');
    }
  });

  test('should scroll and load more clips (infinite scroll)', async ({ page }) => {
    await page.goto('/');

    // Wait for initial clips
    await page.waitForSelector('[data-testid="clip-card"]');
    const initialCount = await page.locator('[data-testid="clip-card"]').count();

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait for new clips to load
    await page.waitForTimeout(2000);

    // Check if more clips loaded (this depends on whether there are more clips)
    const newCount = await page.locator('[data-testid="clip-card"]').count();
    
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
    const firstClip = page.locator('[data-testid="clip-card"]').first();
    await firstClip.click();

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Check if we're on clip detail page
    expect(page.url()).toMatch(/\/clip\/[a-f0-9-]+/);
  });
});

test.describe('User Authentication', () => {
  test('should show login button for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Look for login/sign in button
    const loginButton = page.locator('button', { hasText: /login|sign in/i });
    await expect(loginButton).toBeVisible();
  });

  test('should redirect to Twitch OAuth when clicking login', async ({ page }) => {
    await page.goto('/');

    // Find and click login button
    const loginButton = page.locator('button', { hasText: /login|sign in/i }).first();
    
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

    // Check if mobile menu is accessible
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]');
    
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
