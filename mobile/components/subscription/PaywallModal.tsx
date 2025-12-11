/**
 * PaywallModal Component - React Native modal for displaying paywall with pricing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  PRICING, 
  PRO_FEATURES_MOBILE, 
  calculateYearlyMonthlyPrice, 
  calculateSavingsPercent 
} from '../../lib/constants/pricing';

export interface PaywallModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Feature name that triggered the paywall */
  featureName?: string;
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Callback when upgrade is initiated */
  onUpgradeClick?: () => void;
}

/**
 * Modal component that displays paywall with plan comparison
 * 
 * @example
 * ```tsx
 * const [showPaywall, setShowPaywall] = useState(false);
 * 
 * <PaywallModal
 *   visible={showPaywall}
 *   onClose={() => setShowPaywall(false)}
 *   featureName="Collections"
 * />
 * ```
 */
export function PaywallModal({
  visible,
  onClose,
  featureName,
  title,
  description,
  onUpgradeClick,
}: PaywallModalProps): React.ReactElement {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  // Track analytics when modal is shown
  useEffect(() => {
    if (visible) {
      // TODO: Add analytics tracking for mobile
      console.log('[Paywall Analytics] Modal viewed', { feature: featureName });
    }
  }, [visible, featureName]);

  const handleSubscribe = async (period: 'monthly' | 'yearly') => {
    if (onUpgradeClick) {
      onUpgradeClick();
    }

    // TODO: Add analytics tracking
    console.log('[Paywall Analytics] Upgrade clicked', { period, feature: featureName });

    // For mobile, redirect to web checkout
    // In future, integrate with in-app purchases (RevenueCat, Stripe mobile SDK, etc.)
    const webCheckoutUrl = `https://clipper.tv/pricing?plan=${period}`;
    
    try {
      const supported = await Linking.canOpenURL(webCheckoutUrl);
      if (supported) {
        await Linking.openURL(webCheckoutUrl);
      } else {
        Alert.alert('Error', 'Unable to open checkout page');
      }
    } catch (error) {
      console.error('Failed to open checkout:', error);
      Alert.alert('Error', 'Failed to start checkout. Please try again.');
    }
  };

  const handleClose = () => {
    // TODO: Add analytics tracking
    console.log('[Paywall Analytics] Modal dismissed', { feature: featureName });
    onClose();
  };

  const handleBillingPeriodChange = (period: 'monthly' | 'yearly') => {
    // TODO: Add analytics tracking
    console.log('[Paywall Analytics] Billing period changed', { period, feature: featureName });
    setBillingPeriod(period);
  };

  const monthlyPrice = PRICING.monthly;
  const yearlyPrice = PRICING.yearly;
  const yearlyMonthlyPrice = calculateYearlyMonthlyPrice(yearlyPrice);
  const savingsPercent = calculateSavingsPercent(monthlyPrice, yearlyPrice);

  const modalTitle = title || `${featureName ? `${featureName} is` : 'This feature is'} a Pro Feature`;
  const modalDescription = description || 'Upgrade to clpr Pro to unlock this feature and many more.';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/70">
        <TouchableOpacity 
          className="flex-1" 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View className="bg-gray-900 rounded-t-3xl max-h-[90%]">
          {/* Header */}
          <View className="p-6 border-b border-gray-800">
            <TouchableOpacity
              onPress={handleClose}
              className="absolute top-4 right-4 z-10"
              accessibilityLabel="Close paywall modal"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <View className="items-center mb-4">
              <Ionicons name="sparkles" size={64} color="#A855F7" />
            </View>

            <Text className="text-2xl font-bold text-white text-center mb-2">
              {modalTitle}
            </Text>
            <Text className="text-gray-400 text-center">
              {modalDescription}
            </Text>
          </View>

          <ScrollView className="px-6 py-4">
            {/* Billing toggle */}
            <View className="flex-row justify-center mb-6">
              <View className="bg-gray-800 rounded-lg p-1 flex-row">
                <TouchableOpacity
                  onPress={() => handleBillingPeriodChange('monthly')}
                  className={`px-6 py-2 rounded-md ${
                    billingPeriod === 'monthly' ? 'bg-purple-600' : ''
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      billingPeriod === 'monthly' ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleBillingPeriodChange('yearly')}
                  className={`px-6 py-2 rounded-md flex-row items-center ${
                    billingPeriod === 'yearly' ? 'bg-purple-600' : ''
                  }`}
                >
                  <Text
                    className={`font-medium ${
                      billingPeriod === 'yearly' ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    Yearly
                  </Text>
                  <View className="ml-2 bg-green-500 px-2 py-0.5 rounded">
                    <Text className="text-white text-xs font-bold">
                      Save {savingsPercent}%
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Plan comparison */}
            <View className="space-y-4 mb-6">
              {/* Free Plan */}
              <View className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <Text className="text-lg font-bold text-white mb-1">Free</Text>
                <Text className="text-gray-400 text-sm mb-4">Your current plan</Text>
                <View className="mb-4">
                  <Text className="text-3xl font-bold text-white">
                    $0<Text className="text-gray-400 text-base">/month</Text>
                  </Text>
                </View>
                <View className="space-y-2">
                  <Text className="text-gray-400 text-sm">✓ Browse all clips</Text>
                  <Text className="text-gray-400 text-sm">✓ Basic search</Text>
                  <Text className="text-gray-400 text-sm">✓ Vote & comment</Text>
                  <Text className="text-gray-400 text-sm">✓ 50 favorites</Text>
                  <Text className="text-gray-400 text-sm">✗ Advanced features</Text>
                </View>
              </View>

              {/* Pro Plan */}
              <View className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg p-4 border-2 border-purple-400">
                <View className="absolute top-0 right-0 bg-yellow-400 px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  <Text className="text-gray-900 text-xs font-bold">RECOMMENDED</Text>
                </View>
                <Text className="text-lg font-bold text-white mb-1 mt-4">Pro</Text>
                <Text className="text-purple-100 text-sm mb-4">Everything you need</Text>
                <View className="mb-4">
                  {billingPeriod === 'monthly' ? (
                    <Text className="text-3xl font-bold text-white">
                      ${monthlyPrice}
                      <Text className="text-purple-100 text-base">/month</Text>
                    </Text>
                  ) : (
                    <>
                      <Text className="text-3xl font-bold text-white">
                        ${yearlyMonthlyPrice}
                        <Text className="text-purple-100 text-base">/month</Text>
                      </Text>
                      <Text className="text-sm text-purple-100 mt-1">
                        Billed ${yearlyPrice}/year
                      </Text>
                    </>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleSubscribe(billingPeriod)}
                  className="bg-white rounded-lg py-3 px-6 mb-4"
                >
                  <Text className="text-purple-600 font-bold text-center">
                    Upgrade to Pro
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Features grid */}
            <View className="mb-6">
              <Text className="text-lg font-semibold text-white mb-4 text-center">
                Everything in Pro
              </Text>
              <View className="flex-row flex-wrap">
                {PRO_FEATURES_MOBILE.map((feature, index) => (
                  <View
                    key={index}
                    className="w-1/2 p-2"
                  >
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={feature.icon} 
                        size={16} 
                        color="#A855F7" 
                      />
                      <Text className="text-gray-300 text-sm ml-2">
                        {feature.text}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer */}
            <View className="items-center pb-6 pt-4 border-t border-gray-800">
              <Text className="text-sm text-gray-400 text-center mb-2">
                Cancel anytime • No hidden fees • Secure payment
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
