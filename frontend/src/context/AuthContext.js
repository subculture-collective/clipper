import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react';
import { jsx as _jsx } from 'react/jsx-runtime';
import {
    getCurrentUser,
    initiateOAuth,
    logout as logoutApi,
} from '../lib/auth-api';
import { isModeratorOrAdmin } from '../lib/roles';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    // Check for existing session on mount
    const checkAuth = useCallback(async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch {
            // Not authenticated or session expired
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
    // Initiate OAuth login flow
    const login = () => {
        initiateOAuth();
    };
    // Logout user
    const logout = async () => {
        try {
            await logoutApi();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
        }
    };
    // Refresh user data
    const refreshUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to refresh user:', error);
            setUser(null);
        }
    };
    const isAuthenticated = user !== null;
    const isAdmin = user?.role === 'admin';
    const isModerator = user?.role === 'moderator';
    const isModeratorOrAdminFlag = isModeratorOrAdmin(user?.role);
    return _jsx(AuthContext.Provider, {
        value: {
            user,
            isAuthenticated,
            isAdmin,
            isModerator,
            isModeratorOrAdmin: isModeratorOrAdminFlag,
            isLoading,
            login,
            logout,
            refreshUser,
        },
        children: children,
    });
}
// Export the hook in a separate export to satisfy react-refresh
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
