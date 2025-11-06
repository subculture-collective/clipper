/**
 * FilterSheet - Modal for selecting search filters
 */

import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchFilters } from '@/hooks/useSearchFilters';
import { useState, useEffect } from 'react';

type FilterSheetProps = {
    visible: boolean;
    onClose: () => void;
    filters: SearchFilters;
    onApply: (filters: SearchFilters) => void;
};

const DATE_RANGES = [
    { value: 'hour', label: 'Last Hour' },
    { value: 'day', label: 'Last 24 Hours' },
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'year', label: 'Last Year' },
    { value: 'all', label: 'All Time' },
] as const;

export function FilterSheet({
    visible,
    onClose,
    filters,
    onApply,
}: FilterSheetProps) {
    const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
    const [tagInput, setTagInput] = useState('');

    // Sync local filters when modal opens or filters prop changes
    useEffect(() => {
        if (visible) {
            setLocalFilters(filters);
        }
    }, [visible, filters]);

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleClear = () => {
        setLocalFilters({});
        setTagInput('');
    };

    const handleAddTag = () => {
        if (tagInput.trim()) {
            const currentTags = localFilters.tags || [];
            if (!currentTags.includes(tagInput.trim())) {
                setLocalFilters({
                    ...localFilters,
                    tags: [...currentTags, tagInput.trim()],
                });
            }
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setLocalFilters({
            ...localFilters,
            tags: (localFilters.tags || []).filter(t => t !== tag),
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50">
                <View className="flex-1 mt-20 bg-white rounded-t-3xl">
                    {/* Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                        <Text className="text-xl font-semibold text-gray-900">
                            Filters
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 p-4">
                        {/* Creator Filter */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Creator
                            </Text>
                            <TextInput
                                className="bg-gray-100 p-3 rounded-lg text-base"
                                placeholder="Enter creator name..."
                                value={localFilters.creator || ''}
                                onChangeText={text =>
                                    setLocalFilters({
                                        ...localFilters,
                                        creator: text,
                                    })
                                }
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Game Filter */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Game
                            </Text>
                            <TextInput
                                className="bg-gray-100 p-3 rounded-lg text-base"
                                placeholder="Enter game name..."
                                value={localFilters.game || ''}
                                onChangeText={text =>
                                    setLocalFilters({
                                        ...localFilters,
                                        game: text,
                                    })
                                }
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Tags Filter */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Tags
                            </Text>
                            <View className="flex-row mb-2">
                                <TextInput
                                    className="flex-1 bg-gray-100 p-3 rounded-lg text-base mr-2"
                                    placeholder="Add tag..."
                                    value={tagInput}
                                    onChangeText={setTagInput}
                                    onSubmitEditing={handleAddTag}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    onPress={handleAddTag}
                                    className="bg-sky-500 px-4 rounded-lg items-center justify-center"
                                >
                                    <Ionicons
                                        name="add"
                                        size={24}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            </View>
                            <View className="flex-row flex-wrap">
                                {(localFilters.tags || []).map(tag => (
                                    <View
                                        key={tag}
                                        className="bg-sky-100 px-3 py-1.5 rounded-full mr-2 mb-2 flex-row items-center"
                                    >
                                        <Text className="text-sm text-sky-700 mr-1">
                                            {tag}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleRemoveTag(tag)}
                                        >
                                            <Ionicons
                                                name="close-circle"
                                                size={16}
                                                color="#0369a1"
                                            />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Date Range Filter */}
                        <View className="mb-6">
                            <Text className="text-sm font-semibold text-gray-700 mb-2">
                                Date Range
                            </Text>
                            <View className="flex-row flex-wrap">
                                {DATE_RANGES.map(range => {
                                    const isSelected =
                                        localFilters.dateRange === range.value;
                                    return (
                                        <TouchableOpacity
                                            key={range.value}
                                            onPress={() =>
                                                setLocalFilters({
                                                    ...localFilters,
                                                    dateRange: range.value,
                                                })
                                            }
                                            className={`px-4 py-2 rounded-lg mr-2 mb-2 ${
                                                isSelected
                                                    ? 'bg-sky-500'
                                                    : 'bg-gray-100'
                                            }`}
                                        >
                                            <Text
                                                className={`text-sm ${
                                                    isSelected
                                                        ? 'text-white font-medium'
                                                        : 'text-gray-700'
                                                }`}
                                            >
                                                {range.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>

                    {/* Footer */}
                    <View className="p-4 border-t border-gray-200 flex-row gap-2">
                        <TouchableOpacity
                            onPress={handleClear}
                            className="flex-1 bg-gray-100 py-3 rounded-lg items-center justify-center"
                        >
                            <Text className="text-gray-700 font-semibold">
                                Clear All
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleApply}
                            className="flex-1 bg-sky-500 py-3 rounded-lg items-center justify-center"
                        >
                            <Text className="text-white font-semibold">
                                Apply Filters
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
