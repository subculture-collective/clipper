/**
 * E2E Test Fixtures - Test Data Factory
 * Creates consistent test data across E2E tests
 */

import { Page } from '@playwright/test';

export interface TestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'moderator' | 'member' | 'user';
  mfaEnabled?: boolean;
}

export interface TestClip {
  id: string;
  title: string;
  url: string;
  channelId?: string;
  hasVideo: boolean;
  videoUrl?: string;
}

export interface TestChannel {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{ userId: string; role: string }>;
}

/**
 * Test User Factory
 * Creates users with different roles for testing permissions
 */
export const testUsers = {
  admin: {
    id: 'user-admin-001',
    email: 'admin@test.example.com',
    username: 'test_admin',
    password: 'AdminPassword123!',
    role: 'admin' as const,
  },
  moderator: {
    id: 'user-mod-001',
    email: 'moderator@test.example.com',
    username: 'test_moderator',
    password: 'ModPassword123!',
    role: 'moderator' as const,
  },
  member: {
    id: 'user-member-001',
    email: 'member@test.example.com',
    username: 'test_member',
    password: 'MemberPass123!',
    role: 'member' as const,
  },
  regular: {
    id: 'user-regular-001',
    email: 'user@test.example.com',
    username: 'test_user',
    password: 'UserPassword123!',
    role: 'user' as const,
  },
  // Additional users for multi-user scenarios
  secondary: {
    id: 'user-secondary-001',
    email: 'secondary@test.example.com',
    username: 'test_secondary',
    password: 'SecondaryPass123!',
    role: 'user' as const,
  },
  tertiary: {
    id: 'user-tertiary-001',
    email: 'tertiary@test.example.com',
    username: 'test_tertiary',
    password: 'TertiaryPass123!',
    role: 'user' as const,
  },
};

/**
 * Test Clip Factory
 * Creates clips with and without video for testing different scenarios
 */
export const testClips = {
  withVideo: {
    id: 'clip-video-001',
    title: 'Test Clip with HLS Video',
    url: 'https://www.twitch.tv/test_channel/clip/TestClipWithVideo',
    hasVideo: true,
    videoUrl: 'https://test-cdn.example.com/hls/clip-001/index.m3u8',
  },
  withoutVideo: {
    id: 'clip-no-video-001',
    title: 'Test Clip without Video',
    url: 'https://www.twitch.tv/test_channel/clip/TestClipNoVideo',
    hasVideo: false,
  },
  forFailover: {
    id: 'clip-failover-001',
    title: 'Test Clip for CDN Failover',
    url: 'https://www.twitch.tv/test_channel/clip/TestClipFailover',
    hasVideo: true,
    videoUrl: 'https://cdn.example.com/hls/clip-failover/index.m3u8',
  },
};

/**
 * Test Channel Factory
 * Creates channels with different member configurations
 */
export const testChannels = {
  basic: {
    id: 'channel-basic-001',
    name: 'Test Channel',
    ownerId: testUsers.regular.id,
    members: [{ userId: testUsers.regular.id, role: 'owner' }],
  },
  withMembers: {
    id: 'channel-members-001',
    name: 'Test Channel with Members',
    ownerId: testUsers.regular.id,
    members: [
      { userId: testUsers.regular.id, role: 'owner' },
      { userId: testUsers.moderator.id, role: 'moderator' },
      { userId: testUsers.member.id, role: 'member' },
    ],
  },
  multiUser: {
    id: 'channel-multiuser-001',
    name: 'Multi User Test Channel',
    ownerId: testUsers.admin.id,
    members: [
      { userId: testUsers.admin.id, role: 'owner' },
      { userId: testUsers.secondary.id, role: 'moderator' },
      { userId: testUsers.tertiary.id, role: 'member' },
    ],
  },
};

/**
 * Seed Test Data
 * Creates test users, clips, and channels in the backend
 */
export async function seedTestData(page: Page, baseUrl: string): Promise<void> {
  const apiUrl = baseUrl.replace(/\/$/, '').replace('3000', '8080'); // Convert frontend URL to backend URL

  try {
    // Create test users
    for (const [key, user] of Object.entries(testUsers)) {
      await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          username: user.username,
          password: user.password,
          role: user.role,
        }),
      }).catch(() => {
        // User might already exist
        console.log(`User ${key} already exists or creation failed`);
      });
    }

    // Create test clips
    for (const [key, clip] of Object.entries(testClips)) {
      await fetch(`${apiUrl}/api/v1/clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clip.id,
          title: clip.title,
          url: clip.url,
          hasVideo: clip.hasVideo,
          videoUrl: clip.videoUrl,
        }),
      }).catch(() => {
        // Clip might already exist
        console.log(`Clip ${key} already exists or creation failed`);
      });
    }

    // Create test channels
    for (const [key, channel] of Object.entries(testChannels)) {
      await fetch(`${apiUrl}/api/v1/chat/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: channel.id,
          name: channel.name,
          ownerId: channel.ownerId,
        }),
      }).catch(() => {
        // Channel might already exist
        console.log(`Channel ${key} already exists or creation failed`);
      });

      // Add members to channel
      for (const member of channel.members.slice(1)) {
        await fetch(`${apiUrl}/api/v1/chat/channels/${channel.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: member.userId,
            role: member.role,
          }),
        }).catch(() => {
          // Member might already exist
          console.log(`Member ${member.userId} already in channel ${key}`);
        });
      }
    }

    console.log('✓ Test data seeding complete');
  } catch (error) {
    console.error('Error seeding test data:', error);
  }
}

/**
 * Cleanup Test Data
 * Removes test users, clips, and channels from backend
 */
export async function cleanupTestData(baseUrl: string): Promise<void> {
  const apiUrl = baseUrl.replace(/\/$/, '').replace('3000', '8080');

  try {
    // Delete test channels
    for (const channel of Object.values(testChannels)) {
      await fetch(`${apiUrl}/api/v1/chat/channels/${channel.id}`, {
        method: 'DELETE',
      }).catch(() => {
        // Channel might not exist
        console.log(`Could not delete channel ${channel.id}`);
      });
    }

    // Delete test clips
    for (const clip of Object.values(testClips)) {
      await fetch(`${apiUrl}/api/v1/clips/${clip.id}`, {
        method: 'DELETE',
      }).catch(() => {
        // Clip might not exist
        console.log(`Could not delete clip ${clip.id}`);
      });
    }

    // Delete test users
    for (const user of Object.values(testUsers)) {
      await fetch(`${apiUrl}/api/v1/users/${user.id}`, {
        method: 'DELETE',
      }).catch(() => {
        // User might not exist
        console.log(`Could not delete user ${user.id}`);
      });
    }

    console.log('✓ Test data cleanup complete');
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
}

/**
 * Create Multiple Contexts for Multi-User Tests
 * Creates separate browser contexts for different users
 */
export async function createMultiUserContexts(
  browser: any,
  baseUrl: string,
  users: TestUser[]
): Promise<{ context: any; page: any; user: TestUser }[]> {
  const contexts = [];

  for (const user of users) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(baseUrl);

    // Login as user
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    contexts.push({ context, page, user });
  }

  return contexts;
}
