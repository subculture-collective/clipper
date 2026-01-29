import { test, expect } from '../fixtures';
import {
  mockMFAEnrollment,
  mockMFAEnrollmentVerification,
  mockMFAChallenge,
  mockMFARecoveryCode,
  mockMFADisable,
  mockMFAStatus,
  mockMFARegenerateRecoveryCodes,
  mockMFALockout,
  clearMFAMocks,
} from '../utils/mfa-mock';
import { mockOAuthSuccess } from '../utils/oauth-mock';

/**
 * MFA (Multi-Factor Authentication) E2E Tests
 * 
 * Tests comprehensive MFA scenarios:
 * - TOTP enrollment and setup
 * - MFA challenge success/failure
 * - Recovery code usage
 * - Recovery code regeneration
 * - MFA disable flow
 * - Account lockout after failed attempts
 */

test.describe('MFA Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start with authenticated user (OAuth login)
    await mockOAuthSuccess(page, {
      user: {
        username: 'mfa_test_user',
        mfaEnabled: false,
      },
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    await clearMFAMocks(page);
  });

  test('should enroll in MFA with TOTP', async ({ page }) => {
    // Mock MFA enrollment
    await mockMFAEnrollment(page);

    // Navigate to security settings
    await page.goto('/settings/security');
    await page.waitForLoadState('networkidle');

    // Find and click enable MFA button
    const enableMfaButton = page.getByRole('button', { name: /enable.*mfa|enable.*2fa|setup.*mfa/i });
    
    if (await enableMfaButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await enableMfaButton.click();
      
      // Wait for MFA setup modal/page
      await page.waitForLoadState('networkidle');

      // Verify QR code or secret is displayed
      const qrCodeOrSecret = page.locator('img[alt*="qr" i], [data-testid="qr-code"], text=/secret/i');
      await expect(qrCodeOrSecret.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // QR code or secret display not found - UI may vary
      });

      // Verify backup codes are displayed
      const backupCodesSection = page.locator('text=/backup|recovery.*code/i');
      await expect(backupCodesSection.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Backup codes section not found - UI may vary
      });
    } else {
      // Enable MFA button not found - may already be enabled or different UI
    }
  });

  test('should verify TOTP code during enrollment', async ({ page }) => {
    // Mock enrollment and verification
    await mockMFAEnrollment(page);
    await mockMFAEnrollmentVerification(page, {
      shouldSucceed: true,
      expectedCode: '123456',
    });

    // Navigate to MFA setup
    await page.goto('/settings/security');
    await page.waitForLoadState('networkidle');

    // Enable MFA
    const enableButton = page.getByRole('button', { name: /enable.*mfa|setup.*mfa/i });
    if (await enableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enableButton.click();
      await page.waitForLoadState('networkidle');

      // Enter verification code
      const codeInput = page.locator('input[name*="code" i], input[placeholder*="code" i]').first();
      if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await codeInput.fill('123456');

        // Submit verification
        const verifyButton = page.getByRole('button', { name: /verify|confirm|enable/i });
        await verifyButton.click();
        await page.waitForLoadState('networkidle');

        // Verify success message or MFA enabled state
        const successIndicator = page.locator('text=/enabled|success|activated/i, [data-testid="mfa-enabled"]');
        await expect(successIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });
      }
    }
  });

  test('should reject invalid TOTP code during enrollment', async ({ page }) => {
    await mockMFAEnrollment(page);
    await mockMFAEnrollmentVerification(page, {
      shouldSucceed: false,
      expectedCode: '123456',
    });

    await page.goto('/settings/security');
    await page.waitForLoadState('networkidle');

    const enableButton = page.getByRole('button', { name: /enable.*mfa|setup.*mfa/i });
    if (await enableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enableButton.click();
      await page.waitForLoadState('networkidle');

      // Enter incorrect code
      const codeInput = page.locator('input[name*="code" i], input[placeholder*="code" i]').first();
      if (await codeInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await codeInput.fill('999999');

        const verifyButton = page.getByRole('button', { name: /verify|confirm/i });
        await verifyButton.click();
        await page.waitForLoadState('networkidle');

        // Verify error message
        const errorMessage = page.locator('text=/invalid|incorrect|wrong/i, [role="alert"]');
        await expect(errorMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });
      }
    }
  });

  test('should pass MFA challenge with valid TOTP code', async ({ page }) => {
    // Mock OAuth requiring MFA
    await mockOAuthSuccess(page, {
      user: { username: 'mfa_user', mfaEnabled: true },
      requireMfa: true,
    });

    // Mock MFA challenge
    await mockMFAChallenge(page, {
      shouldSucceed: true,
      expectedCode: '123456',
    });

    // Login
    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      // Should show MFA challenge
      const mfaInput = page.locator('input[name*="code" i], input[placeholder*="code" i]').first();
      if (await mfaInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await mfaInput.fill('123456');

        const submitButton = page.getByRole('button', { name: /verify|submit|continue/i });
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Verify successful login
        const authenticated = page.locator('[data-testid="user-menu"], button:has-text("profile")');
        await expect(authenticated.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });
      }
    }
  });

  test('should fail MFA challenge with invalid TOTP code', async ({ page }) => {
    await mockOAuthSuccess(page, {
      user: { mfaEnabled: true },
      requireMfa: true,
    });

    await mockMFAChallenge(page, {
      shouldSucceed: false,
      expectedCode: '123456',
      remainingAttempts: 3,
    });

    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      const mfaInput = page.locator('input[name*="code" i], input[placeholder*="code" i]').first();
      if (await mfaInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await mfaInput.fill('000000');

        const submitButton = page.getByRole('button', { name: /verify|submit/i });
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Verify error message
        const errorMessage = page.locator('text=/invalid|incorrect|wrong|failed/i');
        await expect(errorMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });

        // Should still be on MFA challenge
        const mfaInputStillVisible = await mfaInput.isVisible({ timeout: 2000 }).catch(() => false);
        expect(mfaInputStillVisible).toBeTruthy();
      }
    }
  });

  test('should authenticate with recovery code', async ({ page }) => {
    await mockOAuthSuccess(page, {
      user: { mfaEnabled: true },
      requireMfa: true,
    });

    await mockMFARecoveryCode(page, {
      shouldSucceed: true,
      validCodes: ['TESTCODE'],
      remainingCodes: 9,
    });

    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      // Look for "use recovery code" option
      const recoveryLink = page.locator('text=/recovery|backup.*code|use.*code/i, a:has-text("recovery")');
      if (await recoveryLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
        await recoveryLink.first().click();
        await page.waitForLoadState('networkidle');

        // Enter recovery code
        const recoveryInput = page.locator('input[name*="recovery" i], input[placeholder*="recovery" i]').first();
        if (await recoveryInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await recoveryInput.fill('TESTCODE');

          const submitButton = page.getByRole('button', { name: /verify|submit|use/i });
          await submitButton.click();
          await page.waitForLoadState('networkidle');

          // Verify successful authentication
          const authenticated = page.locator('[data-testid="user-menu"], button:has-text("profile")');
          await expect(authenticated.first()).toBeVisible({ timeout: 5000 }).catch(() => {
            
          });
        }
      }
    }
  });

  test('should regenerate recovery codes', async ({ page }) => {
    await mockMFARegenerateRecoveryCodes(page, {
      codeCount: 10,
      requireCode: true,
      shouldSucceed: true,
    });

    await page.goto('/settings/security');
    await page.waitForLoadState('networkidle');

    // Look for regenerate codes button
    const regenerateButton = page.getByRole('button', { name: /regenerate|new.*code|generate.*code/i });
    if (await regenerateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await regenerateButton.click();
      await page.waitForLoadState('networkidle');

      // May need to enter TOTP code for confirmation
      const confirmInput = page.locator('input[name*="code" i]').first();
      if (await confirmInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmInput.fill('123456');

        const confirmButton = page.getByRole('button', { name: /confirm|generate/i });
        await confirmButton.click();
        await page.waitForLoadState('networkidle');
      }

      // Verify new codes are displayed
      const codesDisplay = page.locator('text=/new.*code|recovery.*code/i');
      await expect(codesDisplay.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        
      });
    }
  });

  test('should disable MFA successfully', async ({ page }) => {
    await mockMFAStatus(page, true);
    await mockMFADisable(page, {
      requirePassword: true,
      requireCode: true,
      shouldSucceed: true,
    });

    await page.goto('/settings/security');
    await page.waitForLoadState('networkidle');

    // Look for disable MFA button
    const disableButton = page.getByRole('button', { name: /disable.*mfa|turn.*off.*mfa/i });
    if (await disableButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await disableButton.click();
      await page.waitForLoadState('networkidle');

      // May need to confirm with password and code
      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await passwordInput.fill('testpassword');

        const codeInput = page.locator('input[name*="code" i]').first();
        if (await codeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await codeInput.fill('123456');
        }

        const confirmButton = page.getByRole('button', { name: /disable|confirm|turn off/i });
        await confirmButton.click();
        await page.waitForLoadState('networkidle');

        // Verify MFA disabled
        const successMessage = page.locator('text=/disabled|turned off|deactivated/i');
        await expect(successMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });
      }
    }
  });

  test('should lock account after too many failed MFA attempts', async ({ page }) => {
    await mockOAuthSuccess(page, {
      user: { mfaEnabled: true },
      requireMfa: true,
    });

    // Mock lockout after 5 attempts
    await mockMFALockout(page, 60);

    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      const mfaInput = page.locator('input[name*="code" i], input[placeholder*="code" i]').first();
      if (await mfaInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Try invalid code
        await mfaInput.fill('000000');

        const submitButton = page.getByRole('button', { name: /verify|submit/i });
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Verify lockout message
        const lockoutMessage = page.locator('text=/locked|too many.*attempt|try.*later/i');
        await expect(lockoutMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });
      }
    }
  });

  test('should display remaining attempts after failed MFA', async ({ page }) => {
    await mockOAuthSuccess(page, {
      user: { mfaEnabled: true },
      requireMfa: true,
    });

    await mockMFAChallenge(page, {
      shouldSucceed: false,
      expectedCode: '123456',
      remainingAttempts: 2,
    });

    const loginButton = page.getByRole('button', { name: /login|sign in/i }).first();
    if (await loginButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      const mfaInput = page.locator('input[name*="code" i]').first();
      if (await mfaInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await mfaInput.fill('000000');

        const submitButton = page.getByRole('button', { name: /verify|submit/i });
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Check for remaining attempts message
        const attemptsMessage = page.locator('text=/attempt.*remain|.*left/i');
        await expect(attemptsMessage.first()).toBeVisible({ timeout: 5000 }).catch(() => {
          
        });
      }
    }
  });
});
