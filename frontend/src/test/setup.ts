import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './mocks/server';
import 'fake-indexeddb/auto';

// Node.js 22+ introduces built-in localStorage/sessionStorage globals that require
// --localstorage-file to function. These broken globals shadow jsdom's working
// implementations. Provide a proper in-memory Storage polyfill.
function createStorage(): Storage {
    let store: Record<string, string> = {};
    return {
        getItem(key: string): string | null {
            return key in store ? store[key] : null;
        },
        setItem(key: string, value: string): void {
            store[key] = String(value);
        },
        removeItem(key: string): void {
            delete store[key];
        },
        clear(): void {
            store = {};
        },
        key(index: number): string | null {
            const keys = Object.keys(store);
            return keys[index] ?? null;
        },
        get length(): number {
            return Object.keys(store).length;
        },
    };
}

if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    const ls = createStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: ls, writable: true, configurable: true });
}
if (typeof sessionStorage === 'undefined' || typeof sessionStorage.getItem !== 'function') {
    const ss = createStorage();
    Object.defineProperty(globalThis, 'sessionStorage', { value: ss, writable: true, configurable: true });
    Object.defineProperty(window, 'sessionStorage', { value: ss, writable: true, configurable: true });
}

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

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
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {}, // deprecated
        removeListener: () => {}, // deprecated
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
    }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor() {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
}

globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof globalThis.IntersectionObserver;

// Mock ResizeObserver for chart components
class MockResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

globalThis.ResizeObserver =
    MockResizeObserver as unknown as typeof globalThis.ResizeObserver;
