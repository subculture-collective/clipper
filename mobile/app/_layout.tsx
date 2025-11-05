/**
 * Root layout for the app
 * Handles global providers and navigation
 */

import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
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
                </Stack>
            </QueryClientProvider>
        </AuthProvider>
    );
}
