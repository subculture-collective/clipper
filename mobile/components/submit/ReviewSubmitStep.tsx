/**
 * Step 4: Review and Submit Component
 * Shows a summary of the submission and allows final submission
 */

import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface ReviewSubmitStepProps {
    clipUrl: string;
    customTitle?: string;
    detectedStreamer?: string;
    detectedGame?: string;
    streamerOverride?: string;
    tags: string[];
    isNsfw: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    onBack: () => void;
}

export default function ReviewSubmitStep({
    clipUrl,
    customTitle,
    detectedStreamer,
    detectedGame,
    streamerOverride,
    tags,
    isNsfw,
    isSubmitting,
    onSubmit,
    onBack,
}: ReviewSubmitStepProps) {
    const displayStreamer = streamerOverride || detectedStreamer || 'Unknown';

    return (
        <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
                Review & Submit
            </Text>
            <Text className="text-base text-gray-600 mb-6">
                Review your submission before sending
            </Text>

            <ScrollView className="flex-1 mb-6">
                {/* Clip URL */}
                <View className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <Text className="text-xs text-gray-500 mb-1">
                        CLIP URL
                    </Text>
                    <Text className="text-sm text-gray-900" numberOfLines={2}>
                        {clipUrl}
                    </Text>
                </View>

                {/* Clip Details */}
                <View className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <Text className="text-xs text-gray-500 mb-2">
                        CLIP DETAILS
                    </Text>
                    
                    {customTitle && (
                        <View className="mb-2">
                            <Text className="text-xs text-gray-500">
                                Custom Title
                            </Text>
                            <Text className="text-sm text-gray-900">
                                {customTitle}
                            </Text>
                        </View>
                    )}

                    <View className="mb-2">
                        <Text className="text-xs text-gray-500">Streamer</Text>
                        <Text className="text-sm text-gray-900">
                            {displayStreamer}
                            {streamerOverride && (
                                <Text className="text-xs text-amber-600">
                                    {' '}
                                    (Override)
                                </Text>
                            )}
                        </Text>
                    </View>

                    {detectedGame && (
                        <View>
                            <Text className="text-xs text-gray-500">Game</Text>
                            <Text className="text-sm text-gray-900">
                                {detectedGame}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Tags */}
                {tags.length > 0 && (
                    <View className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <Text className="text-xs text-gray-500 mb-2">TAGS</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {tags.map((tag) => (
                                <View
                                    key={tag}
                                    className="bg-primary-100 px-3 py-1 rounded-full"
                                >
                                    <Text className="text-sm text-primary-700">
                                        {tag}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* NSFW Flag */}
                {isNsfw && (
                    <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <Text className="text-sm font-semibold text-red-900">
                            ⚠️ Marked as NSFW
                        </Text>
                        <Text className="text-xs text-red-700 mt-1">
                            This clip contains mature or sensitive content
                        </Text>
                    </View>
                )}

                {/* Submission Guidelines */}
                <View className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Text className="text-sm font-semibold text-blue-900 mb-2">
                        📋 Before you submit
                    </Text>
                    <Text className="text-sm text-blue-800">
                        • Clips must be from gaming content{'\n'}
                        • No offensive or inappropriate content{'\n'}
                        • Give credit to original creators{'\n'}
                        • Clips will be reviewed before publishing
                    </Text>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
                <TouchableOpacity
                    className="flex-1 rounded-lg p-4 items-center bg-gray-200"
                    onPress={onBack}
                    disabled={isSubmitting}
                >
                    <Text className="text-base font-semibold text-gray-700">
                        Back
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className={`flex-1 rounded-lg p-4 items-center ${
                        isSubmitting ? 'bg-gray-300' : 'bg-primary-600'
                    }`}
                    onPress={onSubmit}
                    disabled={isSubmitting}
                >
                    <Text
                        className={`text-base font-semibold ${
                            isSubmitting ? 'text-gray-500' : 'text-white'
                        }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Clip'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
