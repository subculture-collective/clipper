import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import {
  Crown,
  ArrowBigUp,
  Film,
  FolderOpen,
  Calendar,
  Settings,
  ChevronRight,
  LogOut,
  Bell,
  Shield,
  Palette,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { MOCK_USER } from '@/mocks/clips';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, hasChevron = true }: { icon: React.ReactNode; label: string; hasChevron?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      {hasChevron && <ChevronRight size={18} color={Colors.dark.textMuted} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const user = MOCK_USER;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            {user.isPremium && (
              <View style={styles.premiumBadge}>
                <Crown size={12} color={Colors.dark.gold} fill={Colors.dark.gold} />
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{user.displayName}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.isPremium && (
            <View style={styles.premiumTag}>
              <Crown size={12} color={Colors.dark.gold} />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <StatBox
            icon={<ArrowBigUp size={20} color={Colors.dark.upvote} />}
            value={user.karma.toLocaleString()}
            label="Karma"
          />
          <StatBox
            icon={<Film size={20} color={Colors.dark.accent} />}
            value={user.clipsSubmitted.toString()}
            label="Clips"
          />
          <StatBox
            icon={<FolderOpen size={20} color={Colors.dark.success} />}
            value={user.collectionsCount.toString()}
            label="Collections"
          />
          <StatBox
            icon={<Calendar size={20} color={Colors.dark.downvote} />}
            value={formatDate(user.joinedAt)}
            label="Joined"
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuItem icon={<Bell size={18} color={Colors.dark.accent} />} label="Notifications" />
            <View style={styles.menuDivider} />
            <MenuItem icon={<Shield size={18} color={Colors.dark.success} />} label="Privacy" />
            <View style={styles.menuDivider} />
            <MenuItem icon={<Palette size={18} color={Colors.dark.warning} />} label="Appearance" />
            <View style={styles.menuDivider} />
            <MenuItem icon={<Settings size={18} color={Colors.dark.textSecondary} />} label="General" />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<LogOut size={18} color={Colors.dark.live} />}
              label="Sign Out"
              hasChevron={false}
            />
          </View>
        </View>

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
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: Colors.dark.accent,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.dark.surface,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.dark.gold,
  },
  displayName: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  username: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  premiumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  premiumText: {
    color: Colors.dark.gold,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800' as const,
  },
  statLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
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
    fontWeight: '500' as const,
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
    marginTop: 24,
  },
});
