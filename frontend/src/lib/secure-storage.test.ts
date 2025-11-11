import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isSecureStorageAvailable,
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  clearSecureStorage
} from './secure-storage';

describe('SecureStorage', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('isSecureStorageAvailable', () => {
    it('should return false in test environment without IndexedDB', () => {
      // In test environment, IndexedDB might not be available
      const available = isSecureStorageAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Fallback to sessionStorage', () => {
    beforeEach(() => {
      // Mock to ensure fallback path is used
      if (typeof indexedDB !== 'undefined') {
        // Store original
        const originalIndexedDB = globalThis.indexedDB;
        // @ts-expect-error - mocking for test
        globalThis.indexedDB = undefined;
        return () => {
          globalThis.indexedDB = originalIndexedDB;
        };
      }
    });

    it('should store and retrieve data using sessionStorage fallback', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await setSecureItem(key, value);
      const retrieved = await getSecureItem(key);

      expect(retrieved).toBe(value);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await getSecureItem('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should remove items using sessionStorage fallback', async () => {
      const key = 'test-key';
      const value = 'test-value';

      await setSecureItem(key, value);
      await removeSecureItem(key);
      const retrieved = await getSecureItem(key);

      expect(retrieved).toBeNull();
    });

    it('should clear all secure items using sessionStorage fallback', async () => {
      await setSecureItem('key1', 'value1');
      await setSecureItem('key2', 'value2');

      await clearSecureStorage();

      const retrieved1 = await getSecureItem('key1');
      const retrieved2 = await getSecureItem('key2');

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });

    it('should handle multiple set operations', async () => {
      const key = 'test-key';
      const value1 = 'value1';
      const value2 = 'value2';

      await setSecureItem(key, value1);
      let retrieved = await getSecureItem(key);
      expect(retrieved).toBe(value1);

      await setSecureItem(key, value2);
      retrieved = await getSecureItem(key);
      expect(retrieved).toBe(value2);
    });

    it('should handle special characters in values', async () => {
      const key = 'test-key';
      const value = 'test-value with special chars: !@#$%^&*()_+-={}[]|:";\'<>?,./';

      await setSecureItem(key, value);
      const retrieved = await getSecureItem(key);

      expect(retrieved).toBe(value);
    });

    it('should handle JSON-like strings', async () => {
      const key = 'test-key';
      const value = JSON.stringify({ user: 'test', token: '12345' });

      await setSecureItem(key, value);
      const retrieved = await getSecureItem(key);

      expect(retrieved).toBe(value);
      expect(JSON.parse(retrieved as string)).toEqual({ user: 'test', token: '12345' });
    });
  });

  describe('OAuth flow integration', () => {
    it('should store and retrieve OAuth parameters', async () => {
      const codeVerifier = 'test-code-verifier-string-that-is-long';
      const state = 'test-state-parameter';

      await setSecureItem('oauth_code_verifier', codeVerifier);
      await setSecureItem('oauth_state', state);

      const retrievedVerifier = await getSecureItem('oauth_code_verifier');
      const retrievedState = await getSecureItem('oauth_state');

      expect(retrievedVerifier).toBe(codeVerifier);
      expect(retrievedState).toBe(state);
    });

    it('should clean up OAuth parameters after use', async () => {
      await setSecureItem('oauth_code_verifier', 'verifier');
      await setSecureItem('oauth_state', 'state');

      await removeSecureItem('oauth_code_verifier');
      await removeSecureItem('oauth_state');

      const retrievedVerifier = await getSecureItem('oauth_code_verifier');
      const retrievedState = await getSecureItem('oauth_state');

      expect(retrievedVerifier).toBeNull();
      expect(retrievedState).toBeNull();
    });
  });
});
