/**
 * Consent Modal - Mobile app consent dialog
 * 
 * Displays on first app launch to obtain user consent for tracking
 * GDPR/CCPA compliant with clear options and explanations
 */

import { View, Text, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useState } from 'react';
import { useConsent } from '../contexts/ConsentContext';

export function ConsentModal() {
    const {
        showConsentModal,
        updateConsent,
        acceptAll,
        rejectAll,
    } = useConsent();

    const [showDetails, setShowDetails] = useState(false);
    const [localPreferences, setLocalPreferences] = useState({
        functional: false,
        analytics: false,
        advertising: false,
    });

    if (!showConsentModal) {
        return null;
    }

    const handleSavePreferences = () => {
        updateConsent(localPreferences);
    };

    return (
        <Modal
            visible={showConsentModal}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <View className="flex-1 bg-white dark:bg-gray-900">
                {!showDetails ? (
                    // Simple view
                    <ScrollView className="flex-1 p-6">
                        <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Privacy & Cookie Preferences
                        </Text>
                        <Text className="text-base text-gray-700 dark:text-gray-300 mb-6">
                            We use cookies and similar technologies to personalize your experience, 
                            analyze app usage, and improve our service. You can customize your 
                            preferences or accept/reject all.
                        </Text>

                        <View className="space-y-3">
                            <TouchableOpacity
                                onPress={() => acceptAll()}
                                className="bg-blue-600 rounded-lg p-4"
                            >
                                <Text className="text-white text-center text-lg font-semibold">
                                    Accept All
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => rejectAll()}
                                className="bg-gray-200 dark:bg-gray-700 rounded-lg p-4"
                            >
                                <Text className="text-gray-900 dark:text-white text-center text-lg font-semibold">
                                    Reject All Optional
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowDetails(true)}
                                className="border border-gray-300 dark:border-gray-600 rounded-lg p-4"
                            >
                                <Text className="text-gray-900 dark:text-white text-center text-lg font-semibold">
                                    Customize Settings
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-6 text-center">
                            By continuing to use clpr, you agree to our Privacy Policy
                        </Text>
                    </ScrollView>
                ) : (
                    // Detailed view
                    <View className="flex-1">
                        <View className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                                    Customize Preferences
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowDetails(false)}
                                >
                                    <Text className="text-blue-600 text-base">Back</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView className="flex-1 p-6">
                            {/* Essential - Always enabled */}
                            <View className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Essential
                                    </Text>
                                    <View className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded">
                                        <Text className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                                            Always Active
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                    Required for the app to function properly. Includes authentication, 
                                    security features, and your saved preferences.
                                </Text>
                            </View>

                            {/* Functional */}
                            <View className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Functional
                                    </Text>
                                    <Switch
                                        value={localPreferences.functional}
                                        onValueChange={(value) =>
                                            setLocalPreferences((prev) => ({
                                                ...prev,
                                                functional: value,
                                            }))
                                        }
                                    />
                                </View>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                    Remember your preferences like language and theme settings to 
                                    enhance your experience.
                                </Text>
                            </View>

                            {/* Analytics */}
                            <View className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Analytics
                                    </Text>
                                    <Switch
                                        value={localPreferences.analytics}
                                        onValueChange={(value) =>
                                            setLocalPreferences((prev) => ({
                                                ...prev,
                                                analytics: value,
                                            }))
                                        }
                                    />
                                </View>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                    Help us understand how you use the app so we can improve it. 
                                    This includes feature usage and error tracking.
                                </Text>
                            </View>

                            {/* Advertising */}
                            <View className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Advertising
                                    </Text>
                                    <Switch
                                        value={localPreferences.advertising}
                                        onValueChange={(value) =>
                                            setLocalPreferences((prev) => ({
                                                ...prev,
                                                advertising: value,
                                            }))
                                        }
                                    />
                                </View>
                                <Text className="text-sm text-gray-600 dark:text-gray-400">
                                    Allow us to show ads tailored to your interests. Without this, 
                                    you'll see contextual ads instead.
                                </Text>
                            </View>
                        </ScrollView>

                        <View className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <TouchableOpacity
                                onPress={handleSavePreferences}
                                className="bg-blue-600 rounded-lg p-4"
                            >
                                <Text className="text-white text-center text-lg font-semibold">
                                    Save Preferences
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}
