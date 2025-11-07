/**
 * Auth Context - Manages authentication state and provides auth methods
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

export type User = {
    id: string;
    twitch_user_id: string;
    username: string;
    display_name: string;
    email?: string;
    profile_image_url?: string;
    bio?: string;
    role: string;
    is_banned: boolean;
    reputation_score: number;
    created_at: string;
};

type AuthState = {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
};

type AuthContextType = AuthState & {
    setAuthTokens: (accessToken: string, refreshToken: string) => Promise<void>;
    setUser: (user: User) => void;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null>;
    getRefreshToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Load user data from secure store on mount
    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const [accessToken, userData] = await Promise.all([
                SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
                SecureStore.getItemAsync(USER_KEY),
            ]);

            if (accessToken && userData) {
                const user = JSON.parse(userData);
                setState({
                    user,
                    isLoading: false,
                    isAuthenticated: true,
                });
            } else {
                setState({
                    user: null,
                    isLoading: false,
                    isAuthenticated: false,
                });
            }
        } catch (error) {
            console.error('Failed to load user data:', error);
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
            });
        }
    };

    const setAuthTokens = async (
        accessToken: string,
        refreshToken: string
    ) => {
        try {
            await Promise.all([
                SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
                SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
            ]);
        } catch (error) {
            console.error('Failed to store tokens:', error);
            throw error;
        }
    };

    const setUser = (user: User) => {
        // Update state immediately for better UX
        setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
        }));
        
        // Store in secure storage asynchronously
        SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(error => {
            console.error('Failed to store user data:', error);
            // Revert state if storage fails
            setState(prev => ({
                ...prev,
                user: null,
                isAuthenticated: false,
            }));
        });
    };

    const getAccessToken = async (): Promise<string | null> => {
        try {
            return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get access token:', error);
            return null;
        }
    };

    const getRefreshToken = async (): Promise<string | null> => {
        try {
            return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        } catch (error) {
            console.error('Failed to get refresh token:', error);
            return null;
        }
    };

    const logout = async () => {
        try {
            await Promise.all([
                SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
                SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
                SecureStore.deleteItemAsync(USER_KEY),
            ]);
            setState({
                user: null,
                isLoading: false,
                isAuthenticated: false,
            });
        } catch (error) {
            console.error('Failed to clear auth data:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                setAuthTokens,
                setUser,
                logout,
                getAccessToken,
                getRefreshToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
