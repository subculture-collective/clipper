/**
 * E2E Test Setup Hook
 * Runs before all tests to seed test data and configure test environment
 */

import { test as baseTest, expect, Page } from '@playwright/test';
import {
    seedTestData,
    cleanupTestData,
    testUsers,
    testClips,
    testChannels,
} from './test-data';
import { injectConsentPreferences } from '../utils/consent';

/**
 * Global test setup
 * Runs once before all tests start
 */
export async function globalSetup() {
    console.log('\n🎭 E2E Test Suite - Global Setup Starting\n');

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
    const apiUrl = baseUrl.replace('3000', '8080').replace('5173', '8080');

    try {
        // Wait for backend to be ready
        let backendReady = false;
        for (let i = 0; i < 30; i++) {
            try {
                const response = await fetch(`${apiUrl}/api/v1/clips`, {
                    method: 'GET',
                    timeout: 5000,
                });
                if (response.ok) {
                    backendReady = true;
                    console.log('✓ Backend API is ready');
                    break;
                }
            } catch (e) {
                if (i < 29) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }

        if (!backendReady) {
            console.warn('⚠ Backend API not available - tests may fail');
        }

        console.log('✓ E2E Test Suite - Global Setup Complete\n');
    } catch (error) {
        console.error('Global setup error:', error);
    }
}

/**
 * Global test teardown
 * Runs once after all tests complete
 */
export async function globalTeardown() {
    console.log('\n🎭 E2E Test Suite - Global Teardown Starting\n');

    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';

    try {
        await cleanupTestData(baseUrl);
        console.log('✓ E2E Test Suite - Global Teardown Complete\n');
    } catch (error) {
        console.error('Global teardown error:', error);
    }
}

/**
 * Extended test fixture with test data setup
 * Use this instead of the base test to get automatic test data seeding
 */
export const test = baseTest.extend<{
    seedData: () => Promise<void>;
    testUsers: typeof testUsers;
    testClips: typeof testClips;
    testChannels: typeof testChannels;
}>({
    seedData: async ({ page }, provide) => {
        // Inject consent preferences before any navigation
        // This prevents the consent banner from showing during tests
        await injectConsentPreferences(page);

        const baseUrl =
            process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';

        // Seed test data before each test
        await seedTestData(page, baseUrl);

        await provide(async () => {
            // Can be called again if needed during test
            await seedTestData(page, baseUrl);
        });

        // Cleanup after test
        await cleanupTestData(baseUrl);
    },

    testUsers: async (_context, provide) => {
        await provide(testUsers);
    },

    testClips: async (_context, provide) => {
        await provide(testClips);
    },

    testChannels: async (_context, provide) => {
        await provide(testChannels);
    },
});

export { expect };
