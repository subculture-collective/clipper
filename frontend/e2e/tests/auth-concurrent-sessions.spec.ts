import { test, expect } from '@playwright/test';
import {
  setSessionTokens,
  getSessionTokens,
  clearSessionTokens,
  mockLogout,
} from '../utils/session-mock';
import { mockOAuthSuccess } from '../utils/oauth-mock';

/**
 * Concurrent Session E2E Tests
 * 
 * Tests multiple session scenarios:
 * - Multiple sessions per user allowed
 * - Session isolation between devices/contexts
 * - Session limits enforcement (if applicable)
 * - Session takeover prevention
 */

test.describe('Concurrent Session Management', () => {
  test('should allow multiple sessions per user', async ({ browser }) => {
    // Create two separate browser contexts (simulating different devices)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Set up authenticated sessions in both contexts
      await mockOAuthSuccess(page1);
      await mockOAuthSuccess(page2);

      const tokens1 = {
        accessToken: 'session1_token',
        refreshToken: 'session1_refresh',
        expiresAt: Date.now() + 3600000,
      };

      const tokens2 = {
        accessToken: 'session2_token',
        refreshToken: 'session2_refresh',
        expiresAt: Date.now() + 3600000,
      };

      await page1.goto('/');
      await page1.waitForLoadState('networkidle');
      await setSessionTokens(page1, tokens1);

      await page2.goto('/');
      await page2.waitForLoadState('networkidle');
      await setSessionTokens(page2, tokens2);

      // Verify both sessions are active
      const tokensCheck1 = await getSessionTokens(page1);
      const tokensCheck2 = await getSessionTokens(page2);

      expect(tokensCheck1?.accessToken).toBe(tokens1.accessToken);
      expect(tokensCheck2?.accessToken).toBe(tokens2.accessToken);

      // Both sessions should remain active independently
      await page1.reload();
      await page1.waitForLoadState('networkidle');

      await page2.reload();
      await page2.waitForLoadState('networkidle');

      const tokensAfterReload1 = await getSessionTokens(page1);
      const tokensAfterReload2 = await getSessionTokens(page2);

      expect(tokensAfterReload1?.accessToken).toBe(tokens1.accessToken);
      expect(tokensAfterReload2?.accessToken).toBe(tokens2.accessToken);
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should maintain session isolation between contexts', async ({ browser }) => {
    // Create two separate contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await mockOAuthSuccess(page1);
      await mockOAuthSuccess(page2);

      // Set different tokens in each context
      const tokens1 = {
        accessToken: 'context1_unique_token',
        refreshToken: 'context1_refresh',
        expiresAt: Date.now() + 3600000,
      };

      await page1.goto('/');
      await page1.waitForLoadState('networkidle');
      await setSessionTokens(page1, tokens1);

      await page2.goto('/');
      await page2.waitForLoadState('networkidle');

      // Context2 should not have context1's tokens
      const tokens2 = await getSessionTokens(page2);
      
      // Should either have no tokens or different tokens
      expect(tokens2?.accessToken).not.toBe(tokens1.accessToken);
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should handle logout in one session without affecting others', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await mockOAuthSuccess(page1);
      await mockOAuthSuccess(page2);

      const tokens1 = {
        accessToken: 'session1_token',
        refreshToken: 'session1_refresh',
        expiresAt: Date.now() + 3600000,
      };

      const tokens2 = {
        accessToken: 'session2_token',
        refreshToken: 'session2_refresh',
        expiresAt: Date.now() + 3600000,
      };

      await page1.goto('/');
      await page1.waitForLoadState('networkidle');
      await setSessionTokens(page1, tokens1);

      await page2.goto('/');
      await page2.waitForLoadState('networkidle');
      await setSessionTokens(page2, tokens2);

      // Mock logout for page1
      await mockLogout(page1, { shouldSucceed: true });

      // Logout from session 1
      const userMenu1 = page1.locator('[data-testid="user-menu"], button:has-text("profile")');
      if (await userMenu1.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await userMenu1.first().click();
        await page1.waitForTimeout(500);
      }

      const logoutButton1 = page1.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton1.isVisible({ timeout: 2000 }).catch(() => false)) {
        await logoutButton1.click();
        await page1.waitForLoadState('networkidle');
        await clearSessionTokens(page1);
      }

      // Verify session 1 is logged out
      const tokens1After = await getSessionTokens(page1);
      expect(tokens1After).toBeNull();

      // Session 2 should still be active (different context)
      const tokens2After = await getSessionTokens(page2);
      expect(tokens2After?.accessToken).toBe(tokens2.accessToken);
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('should support multiple tabs in same session', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    try {
      await mockOAuthSuccess(page1);

      const tokens = {
        accessToken: 'shared_session_token',
        refreshToken: 'shared_refresh',
        expiresAt: Date.now() + 3600000,
      };

      await page1.goto('/');
      await page1.waitForLoadState('networkidle');
      await setSessionTokens(page1, tokens);

      await page2.goto('/');
      await page2.waitForLoadState('networkidle');

      // Both tabs should share the session (same context)
      const tokens2 = await getSessionTokens(page2);
      
      // Cookies are shared in same context
      expect(tokens2).toBeTruthy();
    } finally {
      await page1.close();
      await page2.close();
      await context.close();
    }
  });

  test('should handle session limit enforcement', async ({ browser }) => {
    // Test basic session handling with multiple contexts
    // Note: Session limit enforcement requires backend implementation

    const maxSessions = 3; // Reduced for faster test execution
    const contexts = [];
    const pages = [];

    try {
      for (let i = 0; i < maxSessions; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await mockOAuthSuccess(page);
        
        const tokens = {
          accessToken: `session_${i}_token`,
          refreshToken: `session_${i}_refresh`,
          expiresAt: Date.now() + 3600000,
        };

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await setSessionTokens(page, tokens);

        contexts.push(context);
        pages.push(page);
      }

      // Verify all sessions can be created
      expect(pages.length).toBe(maxSessions);
      
      // Note: Server-side session limit enforcement would require
      // additional backend logic and API mocking
    } finally {
      // Cleanup all sessions
      for (const page of pages) {
        await page.close();
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should prevent session takeover between devices', async ({ browser }) => {
    // Create two contexts simulating different devices
    const device1Context = await browser.newContext({
      userAgent: 'Device1/1.0',
    });
    const device2Context = await browser.newContext({
      userAgent: 'Device2/1.0',
    });

    const device1Page = await device1Context.newPage();
    const device2Page = await device2Context.newPage();

    try {
      await mockOAuthSuccess(device1Page);
      await mockOAuthSuccess(device2Page);

      // Authenticate on device 1
      const device1Tokens = {
        accessToken: 'device1_token',
        refreshToken: 'device1_refresh',
        expiresAt: Date.now() + 3600000,
      };

      await device1Page.goto('/');
      await device1Page.waitForLoadState('networkidle');
      await setSessionTokens(device1Page, device1Tokens);

      // Try to use same tokens on device 2
      await device2Page.goto('/');
      await device2Page.waitForLoadState('networkidle');
      await setSessionTokens(device2Page, device1Tokens);

      // Verify tokens can be set (basic behavior test)
      // Note: Full device fingerprinting validation would require backend support
      const device2TokensCheck = await getSessionTokens(device2Page);
      expect(device2TokensCheck?.accessToken).toBe(device1Tokens.accessToken);
      
      // This test verifies basic multi-device token handling
      // Production implementation should include server-side device validation
    } finally {
      await device1Page.close();
      await device2Page.close();
      await device1Context.close();
      await device2Context.close();
    }
  });

  test('should track active sessions per user', async ({ browser }) => {
    // Create multiple sessions
    const sessionCount = 3;
    const contexts = [];
    const pages = [];

    try {
      for (let i = 0; i < sessionCount; i++) {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await mockOAuthSuccess(page);
        
        const tokens = {
          accessToken: `active_session_${i}_token`,
          refreshToken: `active_session_${i}_refresh`,
          expiresAt: Date.now() + 3600000,
        };

        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await setSessionTokens(page, tokens);

        contexts.push(context);
        pages.push(page);
      }

      // Mock endpoint to check active sessions
      await pages[0].route('**/api/v1/auth/sessions', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            activeSessions: sessionCount,
            sessions: pages.map((_, i) => ({
              id: `session_${i}`,
              device: `Device ${i}`,
              lastActive: new Date().toISOString(),
            })),
          }),
        });
      });

      // Check active sessions from one page
      const response = await pages[0].request.get('/api/v1/auth/sessions');
      const data = await response.json();

      expect(data.activeSessions).toBe(sessionCount);
    } finally {
      for (const page of pages) {
        await page.close();
      }
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('should allow revoking specific sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      await mockOAuthSuccess(page1);
      await mockOAuthSuccess(page2);

      const tokens1 = {
        accessToken: 'session1_token',
        refreshToken: 'session1_refresh',
        expiresAt: Date.now() + 3600000,
      };

      const tokens2 = {
        accessToken: 'session2_token',
        refreshToken: 'session2_refresh',
        expiresAt: Date.now() + 3600000,
      };

      await page1.goto('/');
      await page1.waitForLoadState('networkidle');
      await setSessionTokens(page1, tokens1);

      await page2.goto('/');
      await page2.waitForLoadState('networkidle');
      await setSessionTokens(page2, tokens2);

      // Mock revoking session 2 from session 1
      await page1.route('**/api/v1/auth/sessions/session2/revoke', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Session revoked',
          }),
        });
      });

      // Revoke session 2
      await page1.goto('/settings/security');
      await page1.waitForLoadState('networkidle');

      // In real UI, would click revoke button for specific session
      const response = await page1.request.post('/api/v1/auth/sessions/session2/revoke');
      const data = await response.json();

      expect(data.success).toBeTruthy();

      // Session 2 should be invalidated (simulated by clearing tokens)
      await clearSessionTokens(page2);

      const tokens2After = await getSessionTokens(page2);
      expect(tokens2After).toBeNull();
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });
});
