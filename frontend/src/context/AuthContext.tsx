import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getCurrentUser, logout as logoutApi, initiateOAuth, testLogin } from '../lib/auth-api';
import { isModeratorOrAdmin } from '../lib/roles';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../lib/sentry';
import { resetUser, identifyUser, trackEvent, AuthEvents } from '../lib/telemetry';
import type { User } from '../lib/auth-api';
import type { UserProperties } from '../lib/telemetry';
import { setUnauthorizedHandler } from '../lib/api';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isModeratorOrAdmin: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('[AuthProvider] Initializing...')
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const autoLoginAttemptedRef = useRef(false);
  const unauthorizedHandledRef = useRef(false);

  const applyUserContext = useCallback((currentUser: User) => {
    setUser(currentUser);
    unauthorizedHandledRef.current = false;
    setSentryUser(currentUser.id, currentUser.username);
    const userProperties: UserProperties = {
      user_id: currentUser.id,
      username: currentUser.username,
      is_premium: currentUser.is_premium || false,
      premium_tier: currentUser.premium_tier,
      signup_date: currentUser.created_at,
      is_verified: currentUser.is_verified || false,
    };
    identifyUser(currentUser.id, userProperties);
  }, []);

  const autoLoginEnabled = import.meta.env.VITE_E2E_TEST_LOGIN === 'true';
  const autoLoginUser = import.meta.env.VITE_E2E_TEST_USER || 'user1_e2e';
  const autoLoginUserId = import.meta.env.VITE_E2E_TEST_USER_ID;

  const tryAutoLogin = useCallback(async () => {
    if (!autoLoginEnabled || autoLoginAttemptedRef.current) {
      return null;
    }

    autoLoginAttemptedRef.current = true;
    try {
      console.log('[AuthContext] Attempting test auto-login for E2E...');
      const autoUser = await testLogin({ username: autoLoginUser, user_id: autoLoginUserId });
      applyUserContext(autoUser);
      return autoUser;
    } catch (autoErr) {
      console.warn('[AuthContext] Auto-login failed:', autoErr);
      return null;
    }
  }, [applyUserContext, autoLoginEnabled, autoLoginUser, autoLoginUserId]);

  // Check for existing session on mount
  const checkAuth = useCallback(async () => {
    try {
      console.log('[AuthContext] Starting checkAuth...')
      const currentUser = await getCurrentUser();
      console.log('[AuthContext] Got current user:', currentUser)
      applyUserContext(currentUser);
    } catch (error) {
      // Not authenticated or session expired
      console.log('[AuthContext] No auth or error:', error)
      try {
        const { clearAuthStorage } = await import('../lib/auth-storage');
        await clearAuthStorage();
      } catch (e) {
        console.warn('[AuthContext] clearAuthStorage during checkAuth failed:', e);
      }
      const autoLoggedInUser = await tryAutoLogin();
      if (!autoLoggedInUser) {
        setUser(null);
        clearSentryUser();
        resetUser();
      }
    } finally {
      console.log('[AuthContext] Setting isLoading to false')
      setIsLoading(false);
    }
  }, [applyUserContext, tryAutoLogin]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleUnauthorized = useCallback(async () => {
    if (unauthorizedHandledRef.current) {
      return;
    }

    unauthorizedHandledRef.current = true;
    try {
      const { clearAuthStorage } = await import('../lib/auth-storage');
      await clearAuthStorage();
    } catch (e) {
      console.warn('[AuthContext] clearAuthStorage during unauthorized failed:', e);
    }
    setUser(null);
    clearSentryUser();
    resetUser();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void handleUnauthorized();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [handleUnauthorized]);

  // Initiate OAuth login flow with PKCE
  const login = async () => {
    await initiateOAuth();
  };

  // Logout user
  const logout = async () => {
    try {
      // Track logout event before resetting user
      const pagePath = typeof window !== 'undefined' ? window.location.pathname : undefined;
      trackEvent(AuthEvents.LOGOUT, {
        page_path: pagePath,
      });

      await logoutApi();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear any persisted auth/session tokens in this browser context
      try {
        const { clearAuthStorage } = await import('../lib/auth-storage');
        await clearAuthStorage();
      } catch (e) {
        // Non-fatal: ensure logout continues even if storage cleanup fails
        console.warn('[AuthContext] clearAuthStorage failed:', e);
      }
      setUser(null);
      clearSentryUser();
      resetUser();
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      applyUserContext(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
      clearSentryUser();
      resetUser();
    }
  };

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin';
  const isModerator = user?.role === 'moderator';
  const isModeratorOrAdminFlag = isModeratorOrAdmin(user?.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isModerator,
        isModeratorOrAdmin: isModeratorOrAdminFlag,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export the hook in a separate export to satisfy react-refresh
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export User type for convenience
export type { User };
