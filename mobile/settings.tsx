import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Trash2,
  Download,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

function MenuItem({ icon, label, onPress, danger = false }: { icon: React.ReactNode; label: string; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={[styles.menuItemLabel, danger && styles.dangerLabel]}>{label}</Text>
      </View>
      <ChevronRight size={18} color={Colors.dark.textMuted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuCard}>
            <MenuItem icon={<Bell size={18} color={Colors.dark.accent} />} label="Notifications" />
            <View style={styles.menuDivider} />
            <MenuItem icon={<Palette size={18} color={Colors.dark.warning} />} label="Appearance" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.menuCard}>
            <MenuItem icon={<Shield size={18} color={Colors.dark.success} />} label="Privacy" />
          </View>
        </View>

        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.menuCard}>
              <MenuItem icon={<Download size={18} color={Colors.dark.textSecondary} />} label="Export Data" />
              <View style={styles.menuDivider} />
              <MenuItem icon={<Trash2 size={18} color={Colors.dark.live} />} label="Delete Account" danger />
            </View>
          </View>
        )}

        <Text style={styles.version}>Clipper v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  menuItemPressed: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '500',
  },
  dangerLabel: {
    color: Colors.dark.live,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginLeft: 44,
  },
  version: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
