/**
 * Hook to require authentication for a screen
 * Redirects to login if not authenticated
 */

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export function useRequireAuth() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        if (isLoading) {
            return;
        }

        const inAuthGroup = segments[0] === 'auth';

        if (!isAuthenticated && !inAuthGroup) {
            // Redirect to login if not authenticated
            router.replace('/auth/login');
        }
    }, [isAuthenticated, isLoading, segments, router]);

    return { isAuthenticated, isLoading };
}
