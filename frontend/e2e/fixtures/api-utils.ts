/**
 * API Test Utilities
 * Helper functions for API calls in E2E tests
 */

import { Page, APIRequestContext, expect } from '@playwright/test';

/**
 * Get the API URL from the test environment
 */
export function getApiUrl(baseUrl?: string): string {
    const url =
        baseUrl || process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
    return url
        .replace(/\/$/, '')
        .replace('5173', '8080')
        .replace('3000', '8080')
        .replace('3001', '8080');
}

/**
 * Make an authenticated API request
 * Automatically uses auth token from page storage if available
 */
export async function apiRequest(
    page: Page,
    endpoint: string,
    options: any = {},
): Promise<Response> {
    const apiUrl = getApiUrl();
    const fullUrl = `${apiUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    // Get auth token from page if available
    const authToken = await page.evaluate(() =>
        localStorage.getItem('auth_token'),
    );

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await page.request.fetch(fullUrl, {
        ...options,
        headers,
    });

    return response;
}

/**
 * Make an authenticated API request and parse JSON response
 */
export async function apiRequestJson(
    page: Page,
    endpoint: string,
    options: any = {},
): Promise<any> {
    const response = await apiRequest(page, endpoint, options);

    if (!response.ok()) {
        const text = await response.text();
        throw new Error(`API request failed: ${response.status()} ${text}`);
    }

    try {
        return await response.json();
    } catch (e) {
        return null;
    }
}

/**
 * Create a test user via API
 */
export async function createTestUser(
    page: Page,
    userData: Partial<{
        email: string;
        username: string;
        password: string;
        role: string;
    }> = {},
): Promise<any> {
    const testUser = {
        email: userData.email || `test-${Date.now()}@example.com`,
        username: userData.username || `testuser${Date.now()}`,
        password: userData.password || 'TestPassword123!',
        role: userData.role || 'user',
    };

    return apiRequestJson(page, '/api/v1/auth/register', {
        method: 'POST',
        data: testUser,
    });
}

/**
 * Authenticate as a specific user
 */
export async function authenticateAsUser(
    page: Page,
    email: string,
    password: string,
): Promise<string | null> {
    const response = await apiRequest(page, '/api/v1/auth/login', {
        method: 'POST',
        data: { email, password },
    });

    if (!response.ok()) {
        return null;
    }

    const data = await response.json();
    const token = data.token || data.authToken;

    if (token) {
        // Store in page storage
        await page.evaluate(t => localStorage.setItem('auth_token', t), token);
    }

    return token || null;
}

/**
 * Create a test clip via API
 */
export async function createTestClip(
    page: Page,
    clipData: Partial<{
        title: string;
        url: string;
        channelId: string;
        hasVideo: boolean;
        videoUrl: string;
    }> = {},
): Promise<any> {
    const testClip = {
        title: clipData.title || `Test Clip ${Date.now()}`,
        url:
            clipData.url ||
            `https://twitch.tv/test_channel/clip/clip${Date.now()}`,
        channelId: clipData.channelId,
        hasVideo: clipData.hasVideo ?? true,
        videoUrl: clipData.videoUrl,
    };

    return apiRequestJson(page, '/api/v1/clips', {
        method: 'POST',
        data: testClip,
    });
}

/**
 * Create a test channel via API
 */
export async function createTestChannel(
    page: Page,
    channelData: Partial<{
        name: string;
        ownerId: string;
        description: string;
    }> = {},
): Promise<any> {
    const testChannel = {
        name: channelData.name || `Test Channel ${Date.now()}`,
        ownerId: channelData.ownerId,
        description: channelData.description || 'Test channel for E2E tests',
    };

    return apiRequestJson(page, '/api/v1/chat/channels', {
        method: 'POST',
        data: testChannel,
    });
}

/**
 * Add a member to a channel via API
 */
export async function addChannelMember(
    page: Page,
    channelId: string,
    userId: string,
    role: string = 'member',
): Promise<any> {
    return apiRequestJson(page, `/api/v1/chat/channels/${channelId}/members`, {
        method: 'POST',
        data: { userId, role },
    });
}

/**
 * Get channel details via API
 */
export async function getChannel(page: Page, channelId: string): Promise<any> {
    return apiRequestJson(page, `/api/v1/chat/channels/${channelId}`);
}

/**
 * Delete a channel via API
 */
export async function deleteChannel(
    page: Page,
    channelId: string,
): Promise<Response> {
    return apiRequest(page, `/api/v1/chat/channels/${channelId}`, {
        method: 'DELETE',
    });
}

/**
 * Create a test comment via API
 */
export async function createTestComment(
    page: Page,
    clipId: string,
    text: string,
): Promise<any> {
    return apiRequestJson(page, `/api/v1/clips/${clipId}/comments`, {
        method: 'POST',
        data: { text },
    });
}

/**
 * Get clip details via API
 */
export async function getClip(page: Page, clipId: string): Promise<any> {
    return apiRequestJson(page, `/api/v1/clips/${clipId}`);
}

/**
 * Get current user info from page
 */
export async function getCurrentUser(page: Page): Promise<any> {
    return page.evaluate(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    });
}

/**
 * Wait for an element to appear and have content
 */
export async function waitForContentToLoad(
    page: Page,
    selector: string,
    maxWaitTime: number = 10000,
): Promise<boolean> {
    try {
        await page
            .locator(selector)
            .first()
            .waitFor({ state: 'visible', timeout: maxWaitTime });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Assert API response status
 */
export async function expectApiSuccess(response: Response): Promise<void> {
    expect(response.status()).toBeLessThan(400);
}

/**
 * Assert API response error status
 */
export async function expectApiError(
    response: Response,
    expectedStatus?: number,
): Promise<void> {
    expect(response.status()).toBeGreaterThanOrEqual(400);
    if (expectedStatus) {
        expect(response.status()).toBe(expectedStatus);
    }
}
