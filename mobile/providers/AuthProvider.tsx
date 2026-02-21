import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '@/types';
import { authApi, clearTokens } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setIsLoading(false));
  }, [fetchUser]);

  const login = useCallback(async (accessToken: string, refreshToken: string) => {
    const { setTokens } = await import('@/lib/api');
    await setTokens(accessToken, refreshToken);
    await fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best effort — clear tokens regardless
    }
    await clearTokens();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
