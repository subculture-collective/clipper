/**
 * Root layout for the app
 * Handles global providers and navigation
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
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

// Deep linking is handled automatically by Expo Router v6 via file-based routing.
// The scheme in app.json ('clipper') and Associated Domains/Intent Filters
// enable deep linking without manual linking configuration.

export default function RootLayout() {
    useEffect(() => {
        // Hide splash screen after app is ready
        SplashScreen.hideAsync();
    }, []);

    return (
        <AuthProvider>
            <NotificationProvider>
                <QueryClientProvider client={queryClient}>
                    <StatusBar style='auto' />
                    <Stack>
                        <Stack.Screen
                            name='(tabs)'
                            options={{ headerShown: false }}
                        />
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
            </NotificationProvider>
        </AuthProvider>
    );
}
