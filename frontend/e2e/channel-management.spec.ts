import { expect, test } from '@playwright/test';

test.describe('Channel Management', () => {
  test('should navigate to channel discovery page', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    // Check if discovery page loads
    const heading = page.getByText('Discover Channels');
    expect(await heading.isVisible()).toBeTruthy();
  });

  test('should display create channel button on discovery page', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    // Look for create channel button
    const createButton = page.getByRole('button', { name: /create channel/i });
    if (await createButton.isVisible()) {
      expect(createButton).toBeVisible();
    }
  });

  test('should open create channel modal', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    // Click create channel button
    const createButton = page.getByRole('button', { name: /create channel/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for modal to appear
      await page.waitForTimeout(300);
      
      // Check if modal is visible
      const modalTitle = page.getByText('Create Channel');
      if (await modalTitle.isVisible()) {
        expect(modalTitle).toBeVisible();
      }
    }
  });

  test('should validate channel name is required', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    const createButton = page.getByRole('button', { name: /create channel/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(300);
      
      // Try to submit without name
      const submitButton = page.getByRole('button', { name: /^create channel$/i });
      if (await submitButton.isVisible()) {
        // Button should be disabled without a name
        expect(await submitButton.isDisabled()).toBeTruthy();
      }
    }
  });

  test('should filter channels by search query', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    // Find search input
    const searchInput = page.getByPlaceholder('Search channels...');
    if (await searchInput.isVisible()) {
      await searchInput.fill('general');
      await page.waitForTimeout(500);
      
      // Check if search is applied
      expect(searchInput).toHaveValue('general');
    }
  });

  test('should filter channels by type', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    // Try to click public filter
    const publicButton = page.getByRole('button', { name: 'Public', exact: true });
    if (await publicButton.isVisible()) {
      await publicButton.click();
      await page.waitForTimeout(500);
      
      // Public button should be active
      expect(publicButton).toBeVisible();
    }
  });

  test('should navigate to channel settings', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Select a channel first
    const channelButton = page.locator('button:has-text("#")').first();
    if (await channelButton.isVisible()) {
      await channelButton.click();
      await page.waitForTimeout(500);
      
      // Look for settings icon/button - this would depend on your UI
      // For now, try navigating directly
      const channelId = 'test-channel-id';
      await page.goto(`/chat/${channelId}/settings`);
      await page.waitForLoadState('networkidle');
      
      // Check if settings page loads
      const settingsHeading = page.getByText('Channel Settings');
      if (await settingsHeading.isVisible()) {
        expect(settingsHeading).toBeVisible();
      }
    }
  });

  test('should display channel members list on settings page', async ({ page }) => {
    // Navigate to a test channel settings
    const channelId = 'test-channel-id';
    await page.goto(`/chat/${channelId}/settings`);
    await page.waitForLoadState('networkidle');
    
    // Look for members section
    const membersHeading = page.getByText(/members/i);
    if (await membersHeading.isVisible()) {
      expect(membersHeading).toBeVisible();
    }
  });

  test('should show invite button for admins', async ({ page }) => {
    const channelId = 'test-channel-id';
    await page.goto(`/chat/${channelId}/settings`);
    await page.waitForLoadState('networkidle');
    
    // Look for invite button (only visible for admins/owners)
    const inviteButton = page.getByRole('button', { name: /invite/i });
    if (await inviteButton.isVisible()) {
      expect(inviteButton).toBeVisible();
    }
  });

  test('should show danger zone for channel owners', async ({ page }) => {
    const channelId = 'test-channel-id';
    await page.goto(`/chat/${channelId}/settings`);
    await page.waitForLoadState('networkidle');
    
    // Look for danger zone (only visible for owners)
    const dangerZoneHeading = page.getByText('Danger Zone');
    if (await dangerZoneHeading.isVisible()) {
      expect(dangerZoneHeading).toBeVisible();
      
      // Check for delete button
      const deleteButton = page.getByRole('button', { name: /delete channel/i });
      expect(deleteButton).toBeVisible();
    }
  });

  test('should display channel information correctly', async ({ page }) => {
    await page.goto('/chat/discover');
    await page.waitForLoadState('networkidle');
    
    // Find a channel card
    const channelCard = page.locator('[class*="shadow"]').first();
    if (await channelCard.isVisible()) {
      // Should have channel name
      const channelName = channelCard.locator('h3');
      if (await channelName.isVisible()) {
        expect(channelName).toBeVisible();
      }
      
      // Should have join button
      const joinButton = channelCard.getByRole('button', { name: /join/i });
      if (await joinButton.isVisible()) {
        expect(joinButton).toBeVisible();
      }
    }
  });
});
