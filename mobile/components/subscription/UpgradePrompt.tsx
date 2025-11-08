/**
 * UpgradePrompt Component - React Native component for displaying upgrade prompts
 */

import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';

export interface UpgradePromptProps {
  /** Name of the feature being gated */
  featureName?: string;
  /** Custom message to display */
  message?: string;
  /** Custom CTA text (default: "Upgrade to Pro") */
  ctaText?: string;
  /** Custom route to pricing page (default: "/pricing") */
  pricingRoute?: string;
}

/**
 * Component that displays an upgrade prompt for premium features
 */
export function UpgradePrompt({
  featureName = 'This feature',
  message,
  ctaText = 'Upgrade to Pro',
  pricingRoute = '/pricing',
}: UpgradePromptProps): React.ReactElement {
  const router = useRouter();
  const defaultMessage = `${featureName} requires an active Pro subscription`;

  const handleUpgrade = () => {
    // Try to navigate to in-app pricing page first
    try {
      router.push(pricingRoute as Href);
    } catch {
      // Fallback to web pricing page
      Linking.openURL('https://clipper.tv/pricing');
    }
  };

  return (
    <View className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 m-4">
      <View className="mb-4 items-center">
        <Ionicons 
          name="lock-closed" 
          size={48} 
          className="text-purple-600 dark:text-purple-400"
        />
      </View>
      
      <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
        Pro Feature
      </Text>
      
      <Text className="text-gray-600 dark:text-gray-400 mb-4 text-center">
        {message || defaultMessage}
      </Text>
      
      <TouchableOpacity
        onPress={handleUpgrade}
        className="flex-row items-center justify-center px-6 py-3 bg-purple-600 active:bg-purple-700 rounded-lg"
      >
        <Ionicons 
          name="sparkles" 
          size={20} 
          color="white"
          className="mr-2"
        />
        <Text className="text-white font-medium ml-2">
          {ctaText}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
