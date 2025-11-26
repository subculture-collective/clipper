/**
 * Error View Component
 * Shows error message and allows retry
 */

import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface ErrorViewProps {
    title: string;
    message: string;
    errorDetails?: string;
    canRetry: boolean;
    onRetry: () => void;
    onCancel: () => void;
}

export default function ErrorView({
    title,
    message,
    errorDetails,
    canRetry,
    onRetry,
    onCancel,
}: ErrorViewProps) {
    return (
        <View className="flex-1 p-6">
            <ScrollView className="flex-1">
                {/* Error Icon */}
                <View className="items-center mb-6">
                    <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4">
                        <Text className="text-4xl">✕</Text>
                    </View>

                    {/* Error Message */}
                    <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                        {title}
                    </Text>
                    <Text className="text-base text-gray-600 text-center mb-6">
                        {message}
                    </Text>
                </View>

                {/* Error Details */}
                {errorDetails && (
                    <View className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                        <Text className="text-sm font-semibold text-red-900 mb-2">
                            Error Details
                        </Text>
                        <Text className="text-sm text-red-800">
                            {errorDetails}
                        </Text>
                    </View>
                )}

                {/* Common Issues */}
                <View className="p-4 bg-gray-50 rounded-lg mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                        Common Issues
                    </Text>
                    <Text className="text-sm text-gray-600">
                        • Check your internet connection{'\n'}
                        • Make sure the clip URL is valid{'\n'}
                        • Verify you meet the karma requirements{'\n'}
                        • Check if you&apos;ve reached submission limits
                    </Text>
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View className="gap-3">
                {canRetry && (
                    <TouchableOpacity
                        className="rounded-lg p-4 items-center bg-primary-600"
                        onPress={onRetry}
                    >
                        <Text className="text-base font-semibold text-white">
                            Try Again
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    className="rounded-lg p-4 items-center bg-gray-200"
                    onPress={onCancel}
                >
                    <Text className="text-base font-semibold text-gray-700">
                        {canRetry ? 'Cancel' : 'Go Back'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
