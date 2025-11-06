/**
 * Step 1: URL Input Component
 * Allows users to paste a Twitch clip URL
 */

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';

interface UrlInputStepProps {
    initialUrl: string;
    onNext: (url: string) => void;
}

export default function UrlInputStep({ initialUrl, onNext }: UrlInputStepProps) {
    const [clipUrl, setClipUrl] = useState(initialUrl);

    const validateUrl = (url: string): boolean => {
        // Validate Twitch clip URL format
        const twitchClipRegex =
            /^https?:\/\/(www\.)?(clips\.twitch\.tv\/[a-zA-Z0-9_-]+|twitch\.tv\/[a-zA-Z0-9_-]+\/clip\/[a-zA-Z0-9_-]+)$/;
        return twitchClipRegex.test(url);
    };

    const handleNext = () => {
        const trimmedUrl = clipUrl.trim();

        if (!trimmedUrl) {
            Alert.alert('Error', 'Please enter a clip URL');
            return;
        }

        if (!validateUrl(trimmedUrl)) {
            Alert.alert(
                'Invalid URL',
                'Please enter a valid Twitch clip URL. Examples:\n' +
                    '• https://clips.twitch.tv/ClipSlug\n' +
                    '• https://www.twitch.tv/streamer/clip/ClipSlug'
            );
            return;
        }

        // URL validation is synchronous, proceed immediately
        onNext(trimmedUrl);
    };

    return (
        <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
                Paste Clip URL
            </Text>
            <Text className="text-base text-gray-600 mb-6">
                Enter the URL of the Twitch clip you want to submit
            </Text>

            <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Clip URL
                </Text>
                <TextInput
                    className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                    placeholder="https://clips.twitch.tv/..."
                    value={clipUrl}
                    onChangeText={setClipUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    multiline
                    numberOfLines={2}
                />
                <Text className="text-xs text-gray-500 mt-1">
                    Paste a link from Twitch clips
                </Text>
            </View>

            <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <Text className="text-sm font-semibold text-blue-900 mb-2">
                    💡 How to get a clip URL
                </Text>
                <Text className="text-sm text-blue-800">
                    1. Find a clip on Twitch{'\n'}
                    2. Click the Share button{'\n'}
                    3. Copy the URL{'\n'}
                    4. Paste it here
                </Text>
            </View>

            <TouchableOpacity
                className={`rounded-lg p-4 items-center ${
                    !clipUrl.trim() ? 'bg-gray-300' : 'bg-primary-600'
                }`}
                onPress={handleNext}
                disabled={!clipUrl.trim()}
            >
                <Text
                    className={`text-base font-semibold ${
                        !clipUrl.trim() ? 'text-gray-500' : 'text-white'
                    }`}
                >
                    Next
                </Text>
            </TouchableOpacity>
        </View>
    );
}
