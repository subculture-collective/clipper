/**
 * Step 3: Tags and NSFW Component
 * Allows users to add tags and mark content as NSFW
 */

import { View, Text, TextInput, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';

interface TagsNsfwStepProps {
    tags: string[];
    isNsfw: boolean;
    onTagsChange: (tags: string[]) => void;
    onNsfwChange: (isNsfw: boolean) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function TagsNsfwStep({
    tags,
    isNsfw,
    onTagsChange,
    onNsfwChange,
    onNext,
    onBack,
}: TagsNsfwStepProps) {
    const [tagInput, setTagInput] = useState('');

    const handleAddTag = () => {
        const trimmedTag = tagInput.trim().toLowerCase();
        if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
            onTagsChange([...tags, trimmedTag]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        onTagsChange(tags.filter((tag) => tag !== tagToRemove));
    };

    const suggestedTags = [
        'highlight',
        'funny',
        'clutch',
        'fails',
        'gameplay',
        'montage',
        'tutorial',
        'speedrun',
    ];

    const handleSuggestedTag = (tag: string) => {
        if (!tags.includes(tag) && tags.length < 5) {
            onTagsChange([...tags, tag]);
        }
    };

    return (
        <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
                Tags & Content Rating
            </Text>
            <Text className="text-base text-gray-600 mb-6">
                Add tags to help others discover your clip
            </Text>

            {/* Tags Section */}
            <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Tags (Optional, max 5)
                </Text>
                
                {/* Tag Input */}
                <View className="flex-row gap-2 mb-3">
                    <TextInput
                        className="flex-1 border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                        placeholder="Enter a tag"
                        value={tagInput}
                        onChangeText={setTagInput}
                        onSubmitEditing={handleAddTag}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={20}
                    />
                    <TouchableOpacity
                        className={`px-4 rounded-lg items-center justify-center ${
                            tagInput.trim() && tags.length < 5
                                ? 'bg-primary-600'
                                : 'bg-gray-300'
                        }`}
                        onPress={handleAddTag}
                        disabled={!tagInput.trim() || tags.length >= 5}
                    >
                        <Text
                            className={`text-base font-semibold ${
                                tagInput.trim() && tags.length < 5
                                    ? 'text-white'
                                    : 'text-gray-500'
                            }`}
                        >
                            Add
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Current Tags */}
                {tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                            <TouchableOpacity
                                key={tag}
                                className="flex-row items-center bg-primary-100 px-3 py-2 rounded-full"
                                onPress={() => handleRemoveTag(tag)}
                            >
                                <Text className="text-sm text-primary-700 mr-1">
                                    {tag}
                                </Text>
                                <Text className="text-sm text-primary-700">
                                    ✕
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Suggested Tags */}
                <View>
                    <Text className="text-xs text-gray-500 mb-2">
                        Suggested tags:
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {suggestedTags
                            .filter((tag) => !tags.includes(tag))
                            .map((tag) => (
                                <TouchableOpacity
                                    key={tag}
                                    className="bg-gray-100 px-3 py-2 rounded-full"
                                    onPress={() => handleSuggestedTag(tag)}
                                    disabled={tags.length >= 5}
                                >
                                    <Text className="text-sm text-gray-700">
                                        + {tag}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                    </View>
                </View>
            </View>

            {/* NSFW Toggle */}
            <View className="mb-6 p-4 bg-gray-50 rounded-lg flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-1">
                        Mark as NSFW
                    </Text>
                    <Text className="text-xs text-gray-500">
                        Enable if this clip contains mature or sensitive content
                    </Text>
                </View>
                <Switch
                    value={isNsfw}
                    onValueChange={onNsfwChange}
                    trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                    thumbColor={isNsfw ? '#2563eb' : '#f3f4f6'}
                />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
                <TouchableOpacity
                    className="flex-1 rounded-lg p-4 items-center bg-gray-200"
                    onPress={onBack}
                >
                    <Text className="text-base font-semibold text-gray-700">
                        Back
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 rounded-lg p-4 items-center bg-primary-600"
                    onPress={onNext}
                >
                    <Text className="text-base font-semibold text-white">
                        Next
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
