import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyText}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtext}>{subtitle}</Text>}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.dark.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.dark.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.dark.background,
  },
});
