/**
 * Root layout for the app
 * Handles global providers and navigation
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
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

export default function RootLayout() {
    useEffect(() => {
        // Hide splash screen after app is ready
        SplashScreen.hideAsync();
    }, []);

    return (
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
            </Stack>
        </QueryClientProvider>
    );
}
