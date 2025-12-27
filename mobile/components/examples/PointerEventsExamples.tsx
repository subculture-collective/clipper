/**
 * Example component demonstrating correct pointer events usage
 * This file serves as a reference implementation for React Native 0.81+
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

/**
 * Example 1: Disabled state with proper pointerEvents
 */
export const DisabledButtonExample = () => {
  const [isDisabled, setIsDisabled] = useState(false);

  return (
    <TouchableOpacity
      style={{
        padding: 16,
        backgroundColor: isDisabled ? '#ccc' : '#2563eb',
        borderRadius: 8,
        // ✅ Correct: pointerEvents in style
        pointerEvents: isDisabled ? 'none' : 'auto',
      }}
      onPress={() => setIsDisabled(!isDisabled)}
    >
      <Text style={{ color: 'white', textAlign: 'center' }}>
        {isDisabled ? 'Disabled' : 'Tap to Toggle'}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * Example 2: Loading overlay that blocks interaction
 */
export const LoadingOverlayExample = ({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        // ✅ Correct: blocks all background interaction
        pointerEvents: 'auto',
      }}
    >
      <ActivityIndicator size="large" color="#fff" />
      <Text style={{ color: 'white', marginTop: 16 }}>Loading...</Text>
    </View>
  );
};

/**
 * Example 3: Card with nested interactive elements
 */
export const InteractiveCardExample = () => {
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 8,
        // ✅ Correct: container doesn't block child interactions
        pointerEvents: 'box-none',
      }}
    >
      <TouchableOpacity onPress={() => console.log('Title pressed')}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Card Title</Text>
      </TouchableOpacity>
    </View>
  );
};

// ❌ WRONG - Never use pointerEvents as a prop
// <View pointerEvents="none">
//   <Text>This is deprecated!</Text>
// </View>

// ✅ CORRECT - Always use in style
// <View style={{ pointerEvents: 'none' }}>
//   <Text>This is correct!</Text>
// </View>
