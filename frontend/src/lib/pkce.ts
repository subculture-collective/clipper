/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

/**
 * Generate a cryptographically secure random string for code verifier
 * @param length Length of the verifier (43-128 characters)
 */
export function generateCodeVerifier(length: number = 128): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[randomValues[i] % charset.length];
  }
  
  return result;
}

/**
 * Generate code challenge from code verifier using SHA-256
 * @param codeVerifier The code verifier string
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert hash to base64url
  return base64UrlEncode(hash);
}

/**
 * Base64URL encode (without padding)
 * @param buffer ArrayBuffer to encode
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * PKCE parameters for OAuth flow
 */
export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Generate all PKCE parameters needed for OAuth flow
 */
export async function generatePKCEParams(): Promise<PKCEParams> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  return {
    codeVerifier,
    codeChallenge,
    state,
  };
}
