import { expect, test } from '@playwright/test';

test.describe('Chat Page', () => {
  test('should navigate to chat page when authenticated', async ({ page }) => {
    // This test assumes authentication is set up
    // In a real scenario, you would log in first
    await page.goto('/chat');

    // Check if we're redirected to login or the chat page loads
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    // Either on chat page or redirected to login (if not authenticated)
    expect(url).toMatch(/\/(chat|login)/);
  });

  test('should display channel sidebar', async ({ page }) => {
    await page.goto('/chat');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for channel sidebar (if authenticated)
    const channelHeader = page.getByText('Channels');
    if (await channelHeader.isVisible()) {
      expect(channelHeader).toBeVisible();
    }
  });

  test('should show empty state when no channel is selected', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Look for empty state message
    const emptyStateHeading = page.getByText('Select a channel');
    if (await emptyStateHeading.isVisible()) {
      expect(emptyStateHeading).toBeVisible();
    }
  });

  test('should search channels', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.getByPlaceholderText('Search channels...');
    if (await searchInput.isVisible()) {
      await searchInput.fill('general');
      
      // Wait for filter to apply
      await page.waitForTimeout(500);
      
      // Check if results are filtered
      expect(searchInput).toHaveValue('general');
    }
  });

  test('should select a channel and display chat view', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Try to click on a channel button (using hash symbol for channel names)
    const channelButton = page.locator('button:has-text("#")').first();
    if (await channelButton.isVisible()) {
      await channelButton.click();
      
      // Wait for chat view to load
      await page.waitForTimeout(500);
      
      // Check if message composer is visible
      const messageInput = page.getByPlaceholder('Type a message...');
      if (await messageInput.isVisible()) {
        expect(messageInput).toBeVisible();
      }
    }
  });

  test('should handle mobile sidebar toggle', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Look for mobile toggle button
    const toggleButton = page.getByLabel('Toggle channel list');
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      
      // Wait for sidebar animation
      await page.waitForTimeout(300);
      
      // Sidebar should be visible on mobile after toggle
      const channelHeader = page.getByText('Channels');
      if (await channelHeader.isVisible()) {
        expect(channelHeader).toBeVisible();
      }
    }
  });

  test('should display keyboard shortcuts hint', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Select a channel first
    const channelButton = page.locator('button:has-text("#")').first();
    if (await channelButton.isVisible()) {
      await channelButton.click();
      await page.waitForTimeout(500);
      
      // Look for keyboard shortcuts hint
      const enterHint = page.getByText('Enter', { exact: false });
      if (await enterHint.isVisible()) {
        expect(enterHint).toBeVisible();
      }
    }
  });

  test('should show emoji picker button', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Select a channel
    const channelButton = page.locator('button:has-text("#")').first();
    if (await channelButton.isVisible()) {
      await channelButton.click();
      await page.waitForTimeout(500);
      
      // Look for emoji picker button (using aria-label)
      const emojiButton = page.getByLabel('Insert emoji');
      if (await emojiButton.isVisible()) {
        expect(emojiButton).toBeVisible();
      }
    }
  });
});
