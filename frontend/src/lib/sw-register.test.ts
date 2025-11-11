import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker, unregisterServiceWorker, isPWAInstalled, canInstallPWA } from './sw-register';

describe('sw-register', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original navigator and window
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  describe('registerServiceWorker', () => {
    it('should skip registration in development mode', async () => {
      // In test/dev mode, it should return null
      const result = await registerServiceWorker();
      expect(result).toBeNull();
    });

    it('should return null when service workers are not supported', async () => {
      // Mock environment as production
      vi.stubEnv('DEV', false);

      // Mock navigator without serviceWorker
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(result).toBeNull();

      vi.unstubAllEnvs();
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should return false when service workers are not supported', async () => {
      // Mock navigator without serviceWorker
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await unregisterServiceWorker();
      expect(result).toBe(false);
    });
  });

  describe('isPWAInstalled', () => {
    it('should return false when not in standalone mode', () => {
      // Mock window.matchMedia
      Object.defineProperty(globalThis.window, 'matchMedia', {
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        writable: true,
        configurable: true,
      });

      const result = isPWAInstalled();
      expect(result).toBe(false);
    });

    it('should return true when in standalone mode', () => {
      // Mock window.matchMedia to return standalone mode
      Object.defineProperty(globalThis.window, 'matchMedia', {
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
        writable: true,
        configurable: true,
      });

      const result = isPWAInstalled();
      expect(result).toBe(true);
    });
  });

  describe('canInstallPWA', () => {
    it('should return false when BeforeInstallPromptEvent is not available', () => {
      const result = canInstallPWA();
      expect(result).toBe(false);
    });

    it('should return true when BeforeInstallPromptEvent is available', () => {
      // Mock BeforeInstallPromptEvent
      Object.defineProperty(globalThis.window, 'BeforeInstallPromptEvent', {
        value: class {},
        writable: true,
        configurable: true,
      });

      const result = canInstallPWA();
      expect(result).toBe(true);
    });
  });
});
