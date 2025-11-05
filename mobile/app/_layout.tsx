/**
 * Root layout for the app
 * Handles global providers and navigation
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import '../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 2,
        },
    },
});

// Deep linking configuration
// Note: Expo Router v6 handles deep linking automatically via file-based routing
// This configuration is documented here for reference and can be used
// if manual linking configuration is needed in the future
export const linking = {
    prefixes: [
        'clipper://',
        'https://clipper.onnwee.me',
        'https://*.clipper.onnwee.me',
    ],
    config: {
        screens: {
            '(tabs)': {
                screens: {
                    index: '',
                    search: 'search',
                    favorites: 'favorites',
                    profile: 'profile',
                },
            },
            'clip/[id]': 'clip/:id',
            'profile/[id]': 'profile/:id',
            'submit/index': 'submit',
            'auth/login': 'auth/login',
            'settings/index': 'settings',
        },
    },
};

export default function RootLayout() {
    useEffect(() => {
        // Hide splash screen after app is ready
        SplashScreen.hideAsync();
    }, []);

    return (
        <AuthProvider>
            <QueryClientProvider client={queryClient}>
                <StatusBar style='auto' />
                <Stack>
                    <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
                    <Stack.Screen
                        name='auth/login'
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name='clip/[id]'
                        options={{
                            presentation: 'modal',
                            title: 'Clip Details',
                        }}
                    />
                    <Stack.Screen
                        name='settings/index'
                        options={{ title: 'Settings' }}
                    />
                    <Stack.Screen
                        name='submit/index'
                        options={{
                            presentation: 'modal',
                            title: 'Submit Clip',
                        }}
                    />
                    <Stack.Screen
                        name='profile/[id]'
                        options={{
                            presentation: 'modal',
                            title: 'User Profile',
                        }}
                    />
                </Stack>
            </QueryClientProvider>
        </AuthProvider>
    );
}
