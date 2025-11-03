import { describe, it, expect, beforeEach } from 'vitest';
import { generateCodeVerifier, generateCodeChallenge, generateState, generatePKCEParams } from './pkce';

describe('PKCE', () => {
  beforeEach(() => {
    // Mock crypto.getRandomValues if not available in test environment
    if (!global.crypto) {
      global.crypto = {
        // @ts-expect-error - minimal mock for testing
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        },
        // @ts-expect-error - minimal mock for testing
        subtle: {
          digest: async (algorithm: string, data: BufferSource) => {
            // Simple mock - in real tests would use actual crypto
            const encoder = new TextEncoder();
            const str = new TextDecoder().decode(data);
            const hash = encoder.encode(str + algorithm);
            return hash.buffer;
          },
        },
      };
    }
  });

  describe('generateCodeVerifier', () => {
    it('should generate a code verifier with default length', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.length).toBe(128);
    });

    it('should generate a code verifier with custom length', () => {
      const length = 64;
      const verifier = generateCodeVerifier(length);
      expect(verifier).toBeDefined();
      expect(verifier.length).toBe(length);
    });

    it('should generate only valid characters', () => {
      const verifier = generateCodeVerifier();
      const validChars = /^[A-Za-z0-9\-._~]+$/;
      expect(validChars.test(verifier)).toBe(true);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate a code challenge from verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should generate consistent challenge for same verifier', async () => {
      const verifier = 'test-verifier-string';
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should generate different challenges for different verifiers', async () => {
      const challenge1 = await generateCodeChallenge('verifier1');
      const challenge2 = await generateCodeChallenge('verifier2');
      expect(challenge1).not.toBe(challenge2);
    });

    it('should generate base64url encoded string', async () => {
      const verifier = 'test-verifier';
      const challenge = await generateCodeChallenge(verifier);
      // Base64url should not contain +, /, or = characters
      expect(challenge).not.toMatch(/[+/=]/);
    });
  });

  describe('generateState', () => {
    it('should generate a state parameter', () => {
      const state = generateState();
      expect(state).toBeDefined();
      expect(state.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate hex string', () => {
      const state = generateState();
      const hexRegex = /^[0-9a-f]+$/;
      expect(hexRegex.test(state)).toBe(true);
    });

    it('should generate different states on each call', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('generatePKCEParams', () => {
    it('should generate all PKCE parameters', async () => {
      const params = await generatePKCEParams();
      expect(params).toBeDefined();
      expect(params.codeVerifier).toBeDefined();
      expect(params.codeChallenge).toBeDefined();
      expect(params.state).toBeDefined();
    });

    it('should generate valid parameters', async () => {
      const params = await generatePKCEParams();
      expect(params.codeVerifier.length).toBe(128);
      expect(params.codeChallenge.length).toBeGreaterThan(0);
      expect(params.state.length).toBe(64);
    });

    it('should generate different parameters on each call', async () => {
      const params1 = await generatePKCEParams();
      const params2 = await generatePKCEParams();
      expect(params1.codeVerifier).not.toBe(params2.codeVerifier);
      expect(params1.codeChallenge).not.toBe(params2.codeChallenge);
      expect(params1.state).not.toBe(params2.state);
    });
  });
});
