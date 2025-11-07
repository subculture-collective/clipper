/**
 * Hook for managing recent search queries with AsyncStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function useRecentSearches() {
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load recent searches on mount
    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        try {
            const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setRecentSearches(Array.isArray(parsed) ? parsed : []);
                } catch (parseError) {
                    console.error('Failed to parse recent searches:', parseError);
                    // Clear corrupted data
                    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                }
            }
        } catch (error) {
            console.error('Failed to load recent searches:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addRecentSearch = useCallback(
        async (query: string) => {
            if (!query.trim()) return;

            const trimmed = query.trim();
            
            setRecentSearches(prev => {
                // Remove existing occurrence and add to front
                const updated = [
                    trimmed,
                    ...prev.filter(s => s !== trimmed),
                ].slice(0, MAX_RECENT_SEARCHES);

                // Persist to AsyncStorage
                AsyncStorage.setItem(
                    RECENT_SEARCHES_KEY,
                    JSON.stringify(updated)
                ).catch(error => {
                    console.error('Failed to save recent search:', error);
                });

                return updated;
            });
        },
        []
    );

    const removeRecentSearch = useCallback(
        async (query: string) => {
            setRecentSearches(prev => {
                const updated = prev.filter(s => s !== query);
                
                // Persist to AsyncStorage
                AsyncStorage.setItem(
                    RECENT_SEARCHES_KEY,
                    JSON.stringify(updated)
                ).catch(error => {
                    console.error('Failed to remove recent search:', error);
                });

                return updated;
            });
        },
        []
    );

    const clearRecentSearches = useCallback(async () => {
        setRecentSearches([]);
        try {
            await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (error) {
            console.error('Failed to clear recent searches:', error);
        }
    }, []);

    return {
        recentSearches,
        addRecentSearch,
        removeRecentSearch,
        clearRecentSearches,
        isLoading,
    };
}
