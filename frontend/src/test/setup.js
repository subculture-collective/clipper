import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';
// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers());
// Clean up after all tests are done
afterAll(() => server.close());
// Cleanup after each test
afterEach(() => {
    cleanup();
});
// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { }, // deprecated
        removeListener: () => { }, // deprecated
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => { },
    }),
});
// Mock IntersectionObserver
class MockIntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    constructor() { }
    observe() { }
    unobserve() { }
    disconnect() { }
    takeRecords() {
        return [];
    }
}
global.IntersectionObserver =
    MockIntersectionObserver;
