import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
  User as UserIcon,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { formatDate } from '@/lib/formatters';

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, hasChevron = true }: { icon: React.ReactNode; label: string; onPress?: () => void; hasChevron?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      {hasChevron && <ChevronRight size={18} color={Colors.dark.textMuted} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <View style={styles.signInContainer}>
          <UserIcon size={64} color={Colors.dark.textMuted} />
          <Text style={styles.signInTitle}>Sign in to Clipper</Text>
          <Text style={styles.signInSubtext}>Vote, bookmark, and submit your favorite clips</Text>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/auth/login' as any)}>
            <Text style={styles.signInBtnText}>Sign in with Twitch</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <UserIcon size={36} color={Colors.dark.textMuted} />
              </View>
            )}
            {user.is_verified && (
              <View style={styles.premiumBadge}>
                <Crown size={12} color={Colors.dark.gold} fill={Colors.dark.gold} />
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{user.display_name}</Text>
          <Text style={styles.username}>@{user.username}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBox
            icon={<ArrowBigUp size={20} color={Colors.dark.upvote} />}
            value={user.karma_points.toLocaleString()}
            label="Karma"
          />
          <StatBox
            icon={<FolderOpen size={20} color={Colors.dark.success} />}
            value={user.follower_count.toString()}
            label="Followers"
          />
          <StatBox
            icon={<Calendar size={20} color={Colors.dark.downvote} />}
            value={formatDate(user.created_at)}
            label="Joined"
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Settings</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<Bell size={18} color={Colors.dark.accent} />}
              label="Notifications"
              onPress={() => router.push('/settings' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Shield size={18} color={Colors.dark.success} />}
              label="Privacy"
              onPress={() => router.push('/settings' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Palette size={18} color={Colors.dark.warning} />}
              label="Appearance"
              onPress={() => router.push('/settings' as any)}
            />
            <View style={styles.menuDivider} />
            <MenuItem
              icon={<Settings size={18} color={Colors.dark.textSecondary} />}
              label="General"
              onPress={() => router.push('/settings' as any)}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuItem
              icon={<LogOut size={18} color={Colors.dark.live} />}
              label="Sign Out"
              hasChevron={false}
              onPress={logout}
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
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  signInTitle: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '700',
  },
  signInSubtext: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  signInBtn: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  avatarPlaceholder: {
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '800',
  },
  username: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 2,
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
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuSectionTitle: {
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
