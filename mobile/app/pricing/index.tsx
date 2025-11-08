/**
 * Pricing Screen - Mobile pricing page with plan comparison
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRO_FEATURES = [
  'Ad-free browsing experience',
  'Advanced search and filtering',
  'Favorite clips sync across devices',
  'Priority support',
  'Early access to new features',
  'Custom collections and playlists',
  'Export your data',
  '5x higher rate limits',
];

export default function PricingScreen() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Track page view
  useEffect(() => {
    // TODO: Add analytics tracking
    console.log('[Paywall Analytics] Pricing page viewed');
  }, []);

  const handleSubscribe = async (period: 'monthly' | 'yearly') => {
    // TODO: Add analytics tracking
    console.log('[Paywall Analytics] Subscribe clicked', { period });

    // For mobile, redirect to web checkout
    // TODO: In future, integrate with in-app purchases (RevenueCat, Stripe mobile SDK)
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

  const handleBillingPeriodChange = (period: 'monthly' | 'yearly') => {
    // TODO: Add analytics tracking
    console.log('[Paywall Analytics] Billing period changed', { period });
    setBillingPeriod(period);
  };

  const monthlyPrice = 9.99;
  const yearlyPrice = 99.99;
  const yearlyMonthlyPrice = (yearlyPrice / 12).toFixed(2);
  const savingsPercent = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Upgrade to Pro',
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
        }}
      />
      
      <ScrollView className="flex-1 bg-gray-900">
        {/* Header */}
        <View className="px-6 pt-8 pb-6">
          <Text className="text-3xl font-bold text-white text-center mb-2">
            Upgrade to Clipper Pro
          </Text>
          <Text className="text-lg text-gray-400 text-center">
            Get the most out of Clipper with exclusive Pro features
          </Text>
        </View>

        {/* Billing period toggle */}
        <View className="px-6 mb-6">
          <View className="bg-gray-800 rounded-lg p-1 flex-row self-center">
            <TouchableOpacity
              onPress={() => handleBillingPeriodChange('monthly')}
              className={`px-6 py-3 rounded-md ${
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
              className={`px-6 py-3 rounded-md flex-row items-center ${
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
              <View className="ml-2 bg-green-500 px-2 py-1 rounded">
                <Text className="text-white text-xs font-bold">
                  Save {savingsPercent}%
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing cards */}
        <View className="px-6 mb-6">
          {/* Free Plan */}
          <View className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-4">
            <View className="mb-4">
              <Text className="text-2xl font-bold text-white mb-1">Free</Text>
              <Text className="text-gray-400">Perfect for casual users</Text>
            </View>
            
            <View className="mb-6">
              <Text className="text-4xl font-bold text-white">
                $0<Text className="text-gray-400 text-lg">/month</Text>
              </Text>
            </View>

            <View className="mb-6">
              <View className="flex-row items-start mb-3">
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text className="text-gray-300 ml-3 flex-1">Browse all clips</Text>
              </View>
              <View className="flex-row items-start mb-3">
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text className="text-gray-300 ml-3 flex-1">Basic search</Text>
              </View>
              <View className="flex-row items-start mb-3">
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text className="text-gray-300 ml-3 flex-1">Vote and comment</Text>
              </View>
              <View className="flex-row items-start">
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text className="text-gray-300 ml-3 flex-1">Create favorites</Text>
              </View>
            </View>

            <TouchableOpacity
              disabled
              className="py-3 px-6 rounded-lg bg-gray-700"
            >
              <Text className="text-gray-400 font-medium text-center">
                Current Plan
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pro Plan */}
          <View className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg p-6 border-2 border-purple-400 relative">
            <View className="absolute top-0 right-0 bg-yellow-400 px-3 py-1 rounded-bl-lg rounded-tr-lg">
              <Text className="text-gray-900 text-xs font-bold">POPULAR</Text>
            </View>

            <View className="mb-4 mt-2">
              <Text className="text-2xl font-bold text-white mb-1">Pro</Text>
              <Text className="text-purple-100">For power users and enthusiasts</Text>
            </View>
            
            <View className="mb-6">
              {billingPeriod === 'monthly' ? (
                <Text className="text-4xl font-bold text-white">
                  ${monthlyPrice}
                  <Text className="text-purple-100 text-lg">/month</Text>
                </Text>
              ) : (
                <View>
                  <Text className="text-4xl font-bold text-white">
                    ${yearlyMonthlyPrice}
                    <Text className="text-purple-100 text-lg">/month</Text>
                  </Text>
                  <Text className="text-sm text-purple-100 mt-1">
                    Billed ${yearlyPrice}/year
                  </Text>
                </View>
              )}
            </View>

            <View className="mb-6">
              {PRO_FEATURES.map((feature, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <Ionicons name="checkmark" size={20} color="#FCD34D" />
                  <Text className="text-white ml-3 flex-1">{feature}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => handleSubscribe(billingPeriod)}
              className="py-4 px-6 rounded-lg bg-white"
            >
              <Text className="text-purple-600 font-bold text-center text-lg">
                Subscribe Now
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ or additional info */}
        <View className="px-6 pb-8">
          <Text className="text-gray-400 mb-2 text-center">
            Cancel anytime. No hidden fees. Secure payment.
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            Have questions?{' '}
            <Text
              className="text-purple-400"
              onPress={() => Linking.openURL('https://clipper.tv/support')}
            >
              Contact support
            </Text>
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
