/**
 * Submit clip screen
 * Allows users to submit a new clip via URL
 */

import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';

export default function SubmitScreen() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [clipUrl, setClipUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!clipUrl.trim()) {
            Alert.alert('Error', 'Please enter a clip URL');
            return;
        }

        if (!isAuthenticated) {
            Alert.alert(
                'Login Required',
                'You must be logged in to submit clips',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Login',
                        onPress: () => router.push('/auth/login'),
                    },
                ]
            );
            return;
        }

        setIsSubmitting(true);
        try {
            // TODO: Implement clip submission API call
            Alert.alert(
                'Success',
                'Your clip has been submitted for review!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to submit clip. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView className="flex-1 bg-white">
                <View className="p-4">
                    <Text className="text-2xl font-bold text-gray-900 mb-2">
                        Submit a Clip
                    </Text>
                    <Text className="text-base text-gray-600 mb-6">
                        Share your favorite gaming moments with the community
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
                            editable={!isSubmitting}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            Paste a link from Twitch, YouTube, or other
                            supported platforms
                        </Text>
                    </View>

                    <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <Text className="text-sm font-semibold text-blue-900 mb-2">
                            📋 Submission Guidelines
                        </Text>
                        <Text className="text-sm text-blue-800">
                            • Clips must be from gaming content{'\n'}
                            • No offensive or inappropriate content{'\n'}
                            • Give credit to original creators{'\n'}
                            • Clips will be reviewed before publishing
                        </Text>
                    </View>

                    <TouchableOpacity
                        className={`rounded-lg p-4 items-center ${
                            isSubmitting || !clipUrl.trim()
                                ? 'bg-gray-300'
                                : 'bg-primary-600'
                        }`}
                        onPress={handleSubmit}
                        disabled={isSubmitting || !clipUrl.trim()}
                    >
                        <Text
                            className={`text-base font-semibold ${
                                isSubmitting || !clipUrl.trim()
                                    ? 'text-gray-500'
                                    : 'text-white'
                            }`}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Clip'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
