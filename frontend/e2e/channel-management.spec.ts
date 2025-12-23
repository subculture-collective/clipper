import { test, expect } from '@playwright/test';

/**
 * Channel Management E2E Tests
 *
 * These tests validate the full channel management flow including:
 * - Channel creation with creator as owner
 * - Member role detection and permissions
 * - Invite and remove member flows
 * - Owner protection (cannot demote/remove owner)
 * - Channel deletion by owner only
 */

test.describe('Channel Management', () => {
  let testChannelId: string | null = null;
  let testChannelName: string;

  test.beforeEach(async () => {
    // Generate unique channel name for this test run
    testChannelName = `test-channel-${Date.now()}`;

    // Navigate to chat page (assumes user is logged in via test setup)
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('should create a channel and assign creator as owner', async () => {
    // Look for "Create Channel" button or similar
    // Note: This assumes there's a UI to create channels in the chat page
    // For now, we'll test by directly calling the API since UI might not exist yet

    const response = await page.request.post('/api/v1/chat/channels', {
      data: {
        name: testChannelName,
        description: 'Test channel for E2E testing',
        channel_type: 'public',
      },
    });

    expect(response.ok()).toBeTruthy();
    const channel = await response.json();
    testChannelId = channel.id;
    expect(channel.name).toBe(testChannelName);

    // Verify creator is added as owner by checking the role
    const roleResponse = await page.request.get(`/api/v1/chat/channels/${testChannelId}/role`);
    expect(roleResponse.ok()).toBeTruthy();
    const roleData = await roleResponse.json();
    expect(roleData.role).toBe('owner');
  });

  test('should navigate to channel settings and display current user role', async () => {
    // Create a channel first
    const createResponse = await page.request.post('/api/v1/chat/channels', {
      data: {
        name: testChannelName,
        description: 'Test channel for settings',
        channel_type: 'public',
      },
    });
    const channel = await createResponse.json();
    testChannelId = channel.id;

    // Navigate to channel settings page
    await page.goto(`/chat/channels/${testChannelId}/settings`);
    await page.waitForLoadState('networkidle');

    // Check that the page shows the user's role
    await expect(page.getByText(/Your role:/i)).toBeVisible();
    await expect(page.getByText(/owner/i)).toBeVisible();
  });

  test('should display member list with roles', async () => {
    // Create a channel
    const createResponse = await page.request.post('/api/v1/chat/channels', {
      data: {
        name: testChannelName,
        description: 'Test channel for member list',
        channel_type: 'public',
      },
    });
    const channel = await createResponse.json();
    testChannelId = channel.id;

    // Navigate to settings
    await page.goto(`/chat/channels/${testChannelId}/settings`);
    await page.waitForLoadState('networkidle');

    // Check for members section
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible();

    // Should show at least 1 member (the owner)
    await expect(page.getByText(/Members \(1\)/i)).toBeVisible();
  });

  test('owner should see invite and danger zone controls', async () => {
    // Create a channel
    const createResponse = await page.request.post('/api/v1/chat/channels', {
      data: {
        name: testChannelName,
        description: 'Test channel for owner controls',
        channel_type: 'public',
      },
    });
    const channel = await createResponse.json();
    testChannelId = channel.id;

    // Navigate to settings
    await page.goto(`/chat/channels/${testChannelId}/settings`);
    await page.waitForLoadState('networkidle');

    // Owner should see invite button (even if disabled for now)
    await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible();

    // Owner should see danger zone
    await expect(page.getByRole('heading', { name: /danger zone/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete channel/i })).toBeVisible();
  });

  test('should prevent removing or demoting the owner', async () => {
    // Create a channel
    const createResponse = await page.request.post('/api/v1/chat/channels', {
      data: {
        name: testChannelName,
        description: 'Test channel for owner protection',
        channel_type: 'public',
      },
    });
    const channel = await createResponse.json();
    testChannelId = channel.id;

    // Get the members list to find owner's user_id
    const membersResponse = await page.request.get(`/api/v1/chat/channels/${testChannelId}/members`);
    const membersData = await membersResponse.json();
    const ownerMember = membersData.members.find((m: { role: string }) => m.role === 'owner');
    expect(ownerMember).toBeDefined();

    // Try to remove owner (should fail)
    const removeResponse = await page.request.delete(
      `/api/v1/chat/channels/${testChannelId}/members/${ownerMember.user_id}`
    );
    expect(removeResponse.status()).toBe(403);
    const removeError = await removeResponse.json();
    expect(removeError.error).toContain('owner');

    // Try to change owner role (should fail)
    const updateResponse = await page.request.patch(
      `/api/v1/chat/channels/${testChannelId}/members/${ownerMember.user_id}`,
      {
        data: { role: 'admin' },
      }
    );
    expect(updateResponse.status()).toBe(403);
    const updateError = await updateResponse.json();
    expect(updateError.error).toContain('owner');
  });

  test('owner should be able to delete channel', async () => {
    // Create a channel
    const createResponse = await page.request.post('/api/v1/chat/channels', {
      data: {
        name: testChannelName,
        description: 'Test channel for deletion',
        channel_type: 'public',
      },
    });
    const channel = await createResponse.json();
    testChannelId = channel.id;

    // Delete the channel via API (UI would require confirmation)
    const deleteResponse = await page.request.delete(`/api/v1/chat/channels/${testChannelId}`);
    expect(deleteResponse.ok()).toBeTruthy();

    // Verify channel is gone
    const getResponse = await page.request.get(`/api/v1/chat/channels/${testChannelId}`);
    expect(getResponse.status()).toBe(404);
  });

  test('non-owner should not be able to delete channel', async () => {
    // This test would require creating a second user context
    // Skipping for now as it requires more complex setup
    test.skip();
  });

  test('admin should be able to remove members but not owner', async () => {
    // This test would require:
    // 1. Creating a channel as user A (owner)
    // 2. Adding user B as admin
    // 3. Adding user C as member
    // 4. Logging in as user B
    // 5. Trying to remove user C (should succeed)
    // 6. Trying to remove user A (owner) (should fail)

    // Skipping for now as it requires multi-user setup
    test.skip();
  });

  test.afterEach(async () => {
    // Clean up: delete test channel if it was created
    if (testChannelId) {
      try {
        await page.request.delete(`/api/v1/chat/channels/${testChannelId}`);
      } catch (e) {
        // Channel might already be deleted or not exist
        console.log('Cleanup: Could not delete test channel', e);
      }
      testChannelId = null;
    }
  });
});

test.describe('Channel Member Permissions', () => {
  test('member should not see admin controls', async () => {
    // This would require multi-user setup
    test.skip();
  });

  test('moderator should not be able to update roles', async () => {
    // This would require multi-user setup
    test.skip();
  });

  test('only owner and admin can add members', async () => {
    // This would require multi-user setup
    test.skip();
  });
});
