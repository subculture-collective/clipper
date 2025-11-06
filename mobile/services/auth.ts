/**
 * Auth service - Handles OAuth PKCE flow with Twitch
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import { api } from '../lib/api';
import { TWITCH_CLIENT_ID } from '../constants/config';
import type { User } from '../contexts/AuthContext';

// Complete the auth session properly
WebBrowser.maybeCompleteAuthSession();

const TWITCH_AUTHORIZATION_ENDPOINT = 'https://id.twitch.tv/oauth2/authorize';

// Use for discovery
const discovery = {
    authorizationEndpoint: TWITCH_AUTHORIZATION_ENDPOINT,
};

type AuthCallbackResponse = {
    message: string;
};

type RefreshResponse = {
    message: string;
};

type CurrentUserResponse = {
    id: string;
    twitch_user_id: string;
    username: string;
    display_name: string;
    email?: string;
    profile_image_url?: string;
    role: string;
    is_banned: boolean;
    reputation_score: number;
    created_at: string;
};

/**
 * Convert byte array to base64url string (React Native compatible)
 */
function bytesToBase64Url(bytes: Uint8Array): string {
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let result = '';
    let i = 0;

    while (i < bytes.length) {
        const a = bytes[i++];
        const b = i < bytes.length ? bytes[i++] : 0;
        const c = i < bytes.length ? bytes[i++] : 0;

        const bitmap = (a << 16) | (b << 8) | c;

        result += base64Chars.charAt((bitmap >> 18) & 63);
        result += base64Chars.charAt((bitmap >> 12) & 63);
        result += i - 2 < bytes.length ? base64Chars.charAt((bitmap >> 6) & 63) : '';
        result += i - 1 < bytes.length ? base64Chars.charAt(bitmap & 63) : '';
    }

    return result;
}

/**
 * Generate PKCE code verifier and challenge
 */
async function generatePKCE() {
    // Generate random code verifier (43-128 characters, base64url)
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const codeVerifier = bytesToBase64Url(randomBytes);

    const codeChallengeMethod = 'S256';

    // Generate code challenge from verifier
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Make URL-safe base64
    const codeChallenge = digest
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    return {
        codeVerifier,
        codeChallenge,
        codeChallengeMethod,
    };
}

/**
 * Initiate OAuth PKCE flow
 */
export async function initiateOAuthFlow() {
    const redirectUri = makeRedirectUri({ scheme: 'clipper' });
    const { codeVerifier, codeChallenge, codeChallengeMethod } = await generatePKCE();

    // Generate random state for CSRF protection (use crypto for state)
    const stateBytes = await Crypto.getRandomBytesAsync(32);
    const state = bytesToBase64Url(stateBytes);

    // Create auth request
    const authRequest = new AuthSession.AuthRequest({
        clientId: TWITCH_CLIENT_ID,
        redirectUri,
        scopes: ['user:read:email'],
        state,
        usePKCE: true,
        codeChallenge,
        codeChallengeMethod: codeChallengeMethod as AuthSession.CodeChallengeMethod,
    });

    // Prompt for authentication
    const result = await authRequest.promptAsync(discovery);

    if (result.type === 'success') {
        const { code, state: returnedState } = result.params;

        // Verify state matches
        if (returnedState !== state) {
            throw new Error('State mismatch - possible CSRF attack');
        }

        return {
            code,
            state: returnedState,
            codeVerifier,
        };
    } else if (result.type === 'error') {
        throw new Error(result.params.error_description || 'Authentication failed');
    } else {
        throw new Error('Authentication cancelled');
    }
}

/**
 * Exchange authorization code for tokens via backend
 */
export async function exchangeCodeForTokens(
    code: string,
    state: string,
    codeVerifier: string
): Promise<void> {
    const response = await api.post<AuthCallbackResponse>(
        '/auth/twitch/callback',
        {
            code,
            state,
            code_verifier: codeVerifier,
        }
    );

    if (!response.data.message) {
        throw new Error('Invalid response from server');
    }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
    const response = await api.get<CurrentUserResponse>('/auth/me');
    return response.data;
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(): Promise<void> {
    const response = await api.post<RefreshResponse>('/auth/refresh');

    if (!response.data.message) {
        throw new Error('Failed to refresh token');
    }
}

/**
 * Logout and revoke tokens
 */
export async function logoutUser(): Promise<void> {
    await api.post('/auth/logout');
}
