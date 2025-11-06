/**
 * Search screen with filters and recent searches
 */

import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { listClips, ListClipsParams } from '@/services/clips';
import ClipListItemCard from '@/components/ClipListItemCard';
import { FilterChip } from '@/components/FilterChip';
import { FilterSheet } from '@/components/FilterSheet';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchScreen() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
    const debouncedQuery = useDebounce(query, 300);

    const { filters, updateFilters, clearFilters, hasActiveFilters } =
        useSearchFilters();
    const {
        recentSearches,
        addRecentSearch,
        removeRecentSearch,
        clearRecentSearches,
    } = useRecentSearches();

    // Build query params from search and filters
    const buildQueryParams = useCallback((): ListClipsParams => {
        const params: ListClipsParams = {
            limit: 20,
        };

        if (debouncedQuery) {
            params.search = debouncedQuery;
        }

        if (filters.creator) {
            // Note: API uses broadcaster_id but we'll search by name
            // In a real implementation, you'd need to resolve name to ID
            params.search = `${params.search || ''} ${filters.creator}`.trim();
        }

        if (filters.game) {
            // Similar to creator, would need game name to ID resolution
            params.search = `${params.search || ''} ${filters.game}`.trim();
        }

        if (filters.tags && filters.tags.length > 0) {
            params.tag = filters.tags[0]; // API supports single tag
        }

        if (filters.dateRange) {
            params.timeframe = filters.dateRange;
        }

        return params;
    }, [debouncedQuery, filters]);

    const queryParams = buildQueryParams();
    const shouldSearch = debouncedQuery.length > 0 || hasActiveFilters();

    const { data, isLoading } = useQuery({
        queryKey: ['search', queryParams],
        queryFn: () => listClips(queryParams),
        enabled: shouldSearch,
    });

    const handleSearch = useCallback(() => {
        if (query.trim()) {
            addRecentSearch(query.trim());
        }
    }, [query, addRecentSearch]);

    const handleRecentSearchPress = useCallback(
        (search: string) => {
            setQuery(search);
            addRecentSearch(search);
        },
        [addRecentSearch]
    );

    const handleClipPress = useCallback(
        (id: string) => {
            router.push(`/clip/${id}`);
        },
        [router]
    );

    const removeFilterChip = useCallback(
        (key: keyof typeof filters) => {
            const updated = { ...filters };
            delete updated[key];
            updateFilters(updated);
        },
        [filters, updateFilters]
    );

    const removeTagChip = useCallback(
        (tag: string) => {
            updateFilters({
                tags: (filters.tags || []).filter(t => t !== tag),
            });
        },
        [filters.tags, updateFilters]
    );

    // Show loading state for searches
    const showLoading = isLoading && shouldSearch;
    const showResults = !isLoading && shouldSearch && data?.data;
    const showEmpty =
        !isLoading && shouldSearch && data?.data && data.data.length === 0;
    const showRecent = !shouldSearch && recentSearches.length > 0;

    return (
        <View className="flex-1 bg-white">
            {/* Search Header */}
            <View className="p-4 border-b border-gray-200">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3">
                    <Ionicons name="search" size={20} color="#6b7280" />
                    <TextInput
                        className="flex-1 p-3 text-base"
                        placeholder="Search clips, creators, games..."
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleSearch}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons
                                name="close-circle"
                                size={20}
                                color="#6b7280"
                            />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Button */}
                <View className="flex-row items-center mt-3">
                    <TouchableOpacity
                        onPress={() => setIsFilterSheetVisible(true)}
                        className="flex-row items-center bg-gray-100 px-4 py-2 rounded-lg"
                    >
                        <Ionicons
                            name="filter"
                            size={18}
                            color={hasActiveFilters() ? '#0ea5e9' : '#6b7280'}
                        />
                        <Text
                            className={`ml-2 text-sm font-medium ${
                                hasActiveFilters()
                                    ? 'text-sky-500'
                                    : 'text-gray-700'
                            }`}
                        >
                            Filters
                        </Text>
                        {hasActiveFilters() && (
                            <View className="ml-1 bg-sky-500 rounded-full w-5 h-5 items-center justify-center">
                                <Text className="text-white text-xs font-bold">
                                    {[
                                        filters.creator,
                                        filters.game,
                                        filters.tags?.length,
                                        filters.dateRange,
                                    ].filter(Boolean).length}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {hasActiveFilters() && (
                        <TouchableOpacity
                            onPress={clearFilters}
                            className="ml-2 px-4 py-2 rounded-lg"
                        >
                            <Text className="text-sm text-sky-500 font-medium">
                                Clear All
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Active Filter Chips */}
                {hasActiveFilters() && (
                    <View className="flex-row flex-wrap mt-3">
                        {filters.creator && (
                            <FilterChip
                                label={`Creator: ${filters.creator}`}
                                onRemove={() => removeFilterChip('creator')}
                                variant="primary"
                            />
                        )}
                        {filters.game && (
                            <FilterChip
                                label={`Game: ${filters.game}`}
                                onRemove={() => removeFilterChip('game')}
                                variant="primary"
                            />
                        )}
                        {filters.tags?.map(tag => (
                            <FilterChip
                                key={tag}
                                label={`Tag: ${tag}`}
                                onRemove={() => removeTagChip(tag)}
                                variant="primary"
                            />
                        ))}
                        {filters.dateRange && (
                            <FilterChip
                                label={`Time: ${filters.dateRange}`}
                                onRemove={() => removeFilterChip('dateRange')}
                                variant="primary"
                            />
                        )}
                    </View>
                )}
            </View>

            {/* Content Area */}
            <View className="flex-1">
                {/* Loading State */}
                {showLoading && (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0ea5e9" />
                        <Text className="text-gray-500 mt-2">Searching...</Text>
                    </View>
                )}

                {/* Results */}
                {showResults && (
                    <FlatList
                        data={data.data}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <ClipListItemCard
                                clip={item}
                                onPress={() => handleClipPress(item.id)}
                            />
                        )}
                        contentContainerStyle={{
                            paddingTop: 12,
                            paddingBottom: 16,
                        }}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Empty State */}
                {showEmpty && (
                    <View className="flex-1 items-center justify-center p-6">
                        <Ionicons
                            name="search-outline"
                            size={64}
                            color="#d1d5db"
                        />
                        <Text className="text-gray-800 font-medium mt-4 mb-2">
                            No results found
                        </Text>
                        <Text className="text-gray-500 text-center">
                            Try adjusting your search or filters
                        </Text>
                    </View>
                )}

                {/* Recent Searches */}
                {showRecent && (
                    <View className="p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-base font-semibold text-gray-900">
                                Recent Searches
                            </Text>
                            <TouchableOpacity onPress={clearRecentSearches}>
                                <Text className="text-sm text-sky-500 font-medium">
                                    Clear
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {recentSearches.map(search => (
                            <View
                                key={search}
                                className="flex-row items-center py-3 border-b border-gray-100"
                            >
                                <TouchableOpacity
                                    onPress={() =>
                                        handleRecentSearchPress(search)
                                    }
                                    className="flex-1 flex-row items-center"
                                >
                                    <Ionicons
                                        name="time-outline"
                                        size={20}
                                        color="#6b7280"
                                    />
                                    <Text className="ml-3 text-base text-gray-900">
                                        {search}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => removeRecentSearch(search)}
                                    hitSlop={{
                                        top: 10,
                                        bottom: 10,
                                        left: 10,
                                        right: 10,
                                    }}
                                >
                                    <Ionicons
                                        name="close"
                                        size={20}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Default State */}
                {!shouldSearch && recentSearches.length === 0 && (
                    <View className="flex-1 items-center justify-center p-6">
                        <Ionicons
                            name="search-outline"
                            size={64}
                            color="#d1d5db"
                        />
                        <Text className="text-gray-800 font-medium mt-4 mb-2">
                            Search for clips
                        </Text>
                        <Text className="text-gray-500 text-center">
                            Find clips by searching or using filters
                        </Text>
                    </View>
                )}
            </View>

            {/* Filter Sheet Modal */}
            <FilterSheet
                visible={isFilterSheetVisible}
                onClose={() => setIsFilterSheetVisible(false)}
                filters={filters}
                onApply={updateFilters}
            />
        </View>
    );
}
