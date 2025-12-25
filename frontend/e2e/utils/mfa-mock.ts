import { Page, Route } from '@playwright/test';

/**
 * MFA (Multi-Factor Authentication) Mock Utilities
 * 
 * Provides comprehensive mocking for MFA flows:
 * - TOTP enrollment and setup
 * - TOTP challenge verification
 * - Recovery code generation and usage
 * - MFA enable/disable flows
 * 
 * @example
 * ```typescript
 * import { mockMFAEnrollment, mockMFAChallenge } from '@utils/mfa-mock';
 * 
 * // Mock MFA enrollment
 * const { secret, qrCode } = await mockMFAEnrollment(page);
 * 
 * // Mock MFA challenge
 * await mockMFAChallenge(page, { shouldSucceed: true });
 * ```
 */

export interface MFASecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFATOTPCode {
  code: string;
  timestamp: number;
}

/**
 * Generate mock TOTP secret
 */
export function generateMockTOTPSecret(): string {
  // Generate a base32-encoded secret (typical for TOTP)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

/**
 * Generate mock recovery codes
 */
export function generateMockRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character recovery code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Generate mock TOTP code
 * 
 * In real implementation, this would use TOTP algorithm with the secret.
 * For testing, we generate predictable codes regardless of secret.
 * 
 * @param _secret - TOTP secret (reserved for future use)
 */
export function generateMockTOTPCode(_secret?: string): MFATOTPCode {
  return {
    code: '123456', // Standard test code
    timestamp: Date.now(),
  };
}

/**
 * Mock MFA enrollment flow
 * 
 * Simulates TOTP setup and QR code generation
 * 
 * @param page - Playwright Page object
 * @param options - Enrollment options
 */
export async function mockMFAEnrollment(
  page: Page,
  options: {
    secret?: string;
    backupCodeCount?: number;
  } = {}
): Promise<MFASecret> {
  const secret = options.secret || generateMockTOTPSecret();
  const backupCodes = generateMockRecoveryCodes(options.backupCodeCount ?? 10);
  const qrCodeUrl = `otpauth://totp/Clipper:testuser?secret=${secret}&issuer=Clipper`;

  // Mock MFA enrollment endpoint
  await page.route('**/api/v1/mfa/enroll', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        secret,
        qrCodeUrl,
        backupCodes,
      }),
    });
  });

  return { secret, qrCodeUrl, backupCodes };
}

/**
 * Mock MFA enrollment verification
 * 
 * Simulates verifying TOTP code during enrollment
 * 
 * @param page - Playwright Page object
 * @param options - Verification options
 */
export async function mockMFAEnrollmentVerification(
  page: Page,
  options: {
    shouldSucceed?: boolean;
    expectedCode?: string;
  } = {}
): Promise<void> {
  const { shouldSucceed = true, expectedCode = '123456' } = options;

  await page.route('**/api/v1/mfa/enroll/verify', async (route: Route) => {
    const postData = route.request().postDataJSON();
    const code = postData?.code;

    if (shouldSucceed && code === expectedCode) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          mfaEnabled: true,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid verification code',
        }),
      });
    }
  });
}

/**
 * Mock MFA challenge (login verification)
 * 
 * Simulates TOTP verification during login
 * 
 * @param page - Playwright Page object
 * @param options - Challenge options
 */
export async function mockMFAChallenge(
  page: Page,
  options: {
    shouldSucceed?: boolean;
    expectedCode?: string;
    remainingAttempts?: number;
  } = {}
): Promise<void> {
  const { shouldSucceed = true, expectedCode = '123456', remainingAttempts = 3 } = options;

  await page.route('**/api/v1/mfa/verify', async (route: Route) => {
    const postData = route.request().postDataJSON();
    const code = postData?.code;

    if (shouldSucceed && code === expectedCode) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: true,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid MFA code',
          remainingAttempts: remainingAttempts - 1,
        }),
      });
    }
  });
}

/**
 * Mock recovery code usage
 * 
 * Simulates using a recovery code instead of TOTP
 * 
 * @param page - Playwright Page object
 * @param options - Recovery code options
 */
export async function mockMFARecoveryCode(
  page: Page,
  options: {
    shouldSucceed?: boolean;
    validCodes?: string[];
    remainingCodes?: number;
  } = {}
): Promise<void> {
  const { 
    shouldSucceed = true, 
    validCodes = ['TESTCODE'], 
    remainingCodes = 9 
  } = options;

  await page.route('**/api/v1/mfa/recovery', async (route: Route) => {
    const postData = route.request().postDataJSON();
    const code = postData?.code;

    if (shouldSucceed && validCodes.includes(code)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: true,
          remainingCodes,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Invalid recovery code',
        }),
      });
    }
  });
}

/**
 * Mock MFA disable flow
 * 
 * Simulates disabling MFA for account
 * 
 * @param page - Playwright Page object
 * @param options - Disable options
 */
export async function mockMFADisable(
  page: Page,
  options: {
    requirePassword?: boolean;
    requireCode?: boolean;
    shouldSucceed?: boolean;
  } = {}
): Promise<void> {
  const { requirePassword = true, requireCode = true, shouldSucceed = true } = options;

  await page.route('**/api/v1/mfa/disable', async (route: Route) => {
    const postData = route.request().postDataJSON();

    if (shouldSucceed) {
      if (requirePassword && !postData?.password) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Password required to disable MFA',
          }),
        });
        return;
      }

      if (requireCode && !postData?.code) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'MFA code required to disable MFA',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          mfaEnabled: false,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to disable MFA',
        }),
      });
    }
  });
}

/**
 * Mock MFA status check
 * 
 * Returns current MFA status for user
 * 
 * @param page - Playwright Page object
 * @param isEnabled - Whether MFA is enabled
 */
export async function mockMFAStatus(
  page: Page,
  isEnabled: boolean = false
): Promise<void> {
  await page.route('**/api/v1/mfa/status', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        mfaEnabled: isEnabled,
        backupCodesRemaining: isEnabled ? 10 : 0,
      }),
    });
  });
}

/**
 * Mock recovery code regeneration
 * 
 * Simulates generating new recovery codes
 * 
 * @param page - Playwright Page object
 * @param options - Regeneration options
 */
export async function mockMFARegenerateRecoveryCodes(
  page: Page,
  options: {
    codeCount?: number;
    requireCode?: boolean;
    shouldSucceed?: boolean;
  } = {}
): Promise<string[]> {
  const { codeCount = 10, requireCode = true, shouldSucceed = true } = options;
  const newCodes = generateMockRecoveryCodes(codeCount);

  await page.route('**/api/v1/mfa/recovery/regenerate', async (route: Route) => {
    const postData = route.request().postDataJSON();

    if (shouldSucceed) {
      if (requireCode && !postData?.code) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'MFA code required to regenerate recovery codes',
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          backupCodes: newCodes,
        }),
      });
    } else {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to regenerate recovery codes',
        }),
      });
    }
  });

  return newCodes;
}

/**
 * Mock MFA account lockout
 * 
 * Simulates account being locked after too many failed attempts
 * 
 * @param page - Playwright Page object
 * @param lockoutMinutes - Minutes until unlock
 */
export async function mockMFALockout(
  page: Page,
  lockoutMinutes: number = 60
): Promise<void> {
  await page.route('**/api/v1/mfa/verify', async (route: Route) => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Too many failed attempts',
        lockedUntil: new Date(Date.now() + lockoutMinutes * 60000).toISOString(),
      }),
    });
  });
}

/**
 * Clear all MFA mocks
 * 
 * @param page - Playwright Page object
 */
export async function clearMFAMocks(page: Page): Promise<void> {
  await page.unroute('**/api/v1/mfa/enroll');
  await page.unroute('**/api/v1/mfa/enroll/verify');
  await page.unroute('**/api/v1/mfa/verify');
  await page.unroute('**/api/v1/mfa/recovery');
  await page.unroute('**/api/v1/mfa/disable');
  await page.unroute('**/api/v1/mfa/status');
  await page.unroute('**/api/v1/mfa/recovery/regenerate');
}
