import React, { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (username: string, password: string) => {
    setLoading(true);
    // TODO: Implement actual authentication logic
    // This is a placeholder for now
    // Normally would send { username, password } to API
    console.log('Login attempt for:', username, password ? '(password provided)' : '');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock user data
    setUser({
      id: '1',
      username,
      email: `${username}@example.com`,
      role: 'user',
    });
    setLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  const isAuthenticated = user !== null;
  const isAdmin = user?.role === 'admin' || user?.role === 'moderator';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        loading,
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
