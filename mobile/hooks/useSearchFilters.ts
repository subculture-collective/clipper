/**
 * Hook for managing search filters with session persistence
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SearchFilters = {
    creator?: string;
    game?: string;
    tags?: string[];
    dateRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
};

const FILTERS_KEY = 'search_filters';

export function useSearchFilters() {
    const [filters, setFilters] = useState<SearchFilters>({});
    const [isLoading, setIsLoading] = useState(true);

    // Load filters from storage on mount
    useEffect(() => {
        loadFilters();
    }, []);

    const loadFilters = async () => {
        try {
            const stored = await AsyncStorage.getItem(FILTERS_KEY);
            if (stored) {
                setFilters(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Failed to load filters:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateFilters = useCallback(
        async (newFilters: Partial<SearchFilters>) => {
            const updated = { ...filters, ...newFilters };
            setFilters(updated);
            try {
                await AsyncStorage.setItem(FILTERS_KEY, JSON.stringify(updated));
            } catch (error) {
                console.error('Failed to save filters:', error);
            }
        },
        [filters]
    );

    const clearFilters = useCallback(async () => {
        setFilters({});
        try {
            await AsyncStorage.removeItem(FILTERS_KEY);
        } catch (error) {
            console.error('Failed to clear filters:', error);
        }
    }, []);

    const hasActiveFilters = useCallback(() => {
        return !!(
            filters.creator ||
            filters.game ||
            (filters.tags && filters.tags.length > 0) ||
            filters.dateRange
        );
    }, [filters]);

    return {
        filters,
        updateFilters,
        clearFilters,
        hasActiveFilters,
        isLoading,
    };
}
