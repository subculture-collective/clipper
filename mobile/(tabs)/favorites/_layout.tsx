import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function FavoritesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.dark.background },
        headerTintColor: Colors.dark.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    />
  );
}
