/**
 * Step 2: Metadata Override Component
 * Shows detected streamer/game and allows manual override
 */

import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';

interface MetadataOverrideStepProps {
    clipUrl: string;
    detectedStreamer?: string;
    detectedGame?: string;
    isLoading?: boolean;
    customTitle: string;
    streamerOverride: string;
    onCustomTitleChange: (title: string) => void;
    onStreamerOverrideChange: (streamer: string) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function MetadataOverrideStep({
    detectedStreamer,
    detectedGame,
    isLoading = false,
    customTitle,
    streamerOverride,
    onCustomTitleChange,
    onStreamerOverrideChange,
    onNext,
    onBack,
}: MetadataOverrideStepProps) {
    return (
        <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
                Clip Details
            </Text>
            <Text className="text-base text-gray-600 mb-6">
                Verify and customize the clip information
            </Text>

            {isLoading ? (
                <View className="py-8 items-center">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="text-gray-600 mt-4">
                        Fetching clip details...
                    </Text>
                </View>
            ) : (
                <>
                    {/* Detected Information */}
                    <View className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <Text className="text-sm font-semibold text-gray-700 mb-3">
                            Auto-Detected Information
                        </Text>
                        <View className="mb-2">
                            <Text className="text-xs text-gray-500">
                                Streamer
                            </Text>
                            <Text className="text-base text-gray-900">
                                {detectedStreamer || 'Unknown'}
                            </Text>
                        </View>
                        <View>
                            <Text className="text-xs text-gray-500">Game</Text>
                            <Text className="text-base text-gray-900">
                                {detectedGame || 'Unknown'}
                            </Text>
                        </View>
                    </View>

                    {/* Custom Title */}
                    <View className="mb-4">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Custom Title (Optional)
                        </Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                            placeholder="Leave empty to use original title"
                            value={customTitle}
                            onChangeText={onCustomTitleChange}
                            multiline
                            numberOfLines={2}
                            maxLength={200}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            {customTitle.length}/200 characters
                        </Text>
                    </View>

                    {/* Streamer Override */}
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Streamer Override (Optional)
                        </Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                            placeholder={
                                detectedStreamer ||
                                'Enter streamer name to override'
                            }
                            value={streamerOverride}
                            onChangeText={onStreamerOverrideChange}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            Only change if the detected streamer is incorrect
                        </Text>
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
                </>
            )}
        </View>
    );
}
