/**
 * Success View Component
 * Shows success message after clip submission
 */

import { View, Text, TouchableOpacity } from 'react-native';

interface SuccessViewProps {
    message: string;
    status: 'pending' | 'approved';
    onViewFeed: () => void;
    onSubmitAnother: () => void;
}

export default function SuccessView({
    message,
    status,
    onViewFeed,
    onSubmitAnother,
}: SuccessViewProps) {
    return (
        <View className="flex-1 items-center justify-center p-6">
            {/* Success Icon */}
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                <Text className="text-4xl">✓</Text>
            </View>

            {/* Success Message */}
            <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                Clip Submitted!
            </Text>
            <Text className="text-base text-gray-600 text-center mb-6">
                {message}
            </Text>

            {/* Status Info */}
            <View
                className={`p-4 rounded-lg mb-6 w-full ${
                    status === 'approved'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-blue-50 border border-blue-200'
                }`}
            >
                <Text
                    className={`text-sm font-semibold mb-1 ${
                        status === 'approved' ? 'text-green-900' : 'text-blue-900'
                    }`}
                >
                    {status === 'approved'
                        ? '🎉 Auto-Approved!'
                        : '⏳ Under Review'}
                </Text>
                <Text
                    className={`text-sm ${
                        status === 'approved' ? 'text-green-800' : 'text-blue-800'
                    }`}
                >
                    {status === 'approved'
                        ? 'Your clip is now live and visible to everyone!'
                        : 'Your clip will be reviewed by moderators and will appear in the feed once approved.'}
                </Text>
            </View>

            {/* Action Buttons */}
            <View className="w-full gap-3">
                <TouchableOpacity
                    className="rounded-lg p-4 items-center bg-primary-600"
                    onPress={onViewFeed}
                >
                    <Text className="text-base font-semibold text-white">
                        {status === 'approved'
                            ? 'View in Feed'
                            : 'Back to Feed'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="rounded-lg p-4 items-center bg-gray-200"
                    onPress={onSubmitAnother}
                >
                    <Text className="text-base font-semibold text-gray-700">
                        Submit Another Clip
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
