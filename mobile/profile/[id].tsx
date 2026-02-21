import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowBigUp,
  Calendar,
  UserPlus,
  UserMinus,
  User as UserIcon,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { LoadingState } from '@/components/EmptyState';
import ClipCard from '@/components/ClipCard';
import { usersApi, clipsApi } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/formatters';
import { useAuth } from '@/providers/AuthProvider';
import type { Clip } from '@/types';

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: clipsData, refetch, isRefetching } = useQuery({
    queryKey: ['user-clips', id],
    queryFn: () => usersApi.getFavorites(id!),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: () => usersApi.follow(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => usersApi.unfollow(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user', id] }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ clipId, direction }: { clipId: string; direction: 'up' | 'down' }) =>
      clipsApi.vote(clipId, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-clips', id] }),
  });

  const favoriteMutation = useMutation({
    mutationFn: (clipId: string) => clipsApi.favorite(clipId),
  });

  if (isLoading) return <LoadingState />;

  if (!profile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'User' }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>User not found</Text>
        </View>
      </View>
    );
  }

  const isOwnProfile = currentUser?.id === profile.id;

  const renderHeader = () => (
    <View>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <UserIcon size={36} color={Colors.dark.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        {!isOwnProfile && (
          <Pressable
            style={styles.followBtn}
            onPress={() => followMutation.mutate()}
          >
            <UserPlus size={16} color="#fff" />
            <Text style={styles.followBtnText}>Follow</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatBox
          icon={<ArrowBigUp size={18} color={Colors.dark.upvote} />}
          value={formatNumber(profile.karma_points)}
          label="Karma"
        />
        <StatBox
          icon={<UserIcon size={18} color={Colors.dark.accent} />}
          value={formatNumber(profile.follower_count)}
          label="Followers"
        />
        <StatBox
          icon={<Calendar size={18} color={Colors.dark.downvote} />}
          value={formatDate(profile.created_at)}
          label="Joined"
        />
      </View>

      <Text style={styles.sectionTitle}>Clips</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: profile.display_name }} />
      <FlatList
        data={clipsData?.data ?? []}
        renderItem={({ item }) => (
          <ClipCard
            clip={item}
            onVote={(clipId, dir) => voteMutation.mutate({ clipId, direction: dir })}
            onFavorite={(clipId) => favoriteMutation.mutate(clipId)}
          />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.dark.accent} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  list: {
    paddingBottom: 20,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.dark.accent,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
  },
  username: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  bio: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  followBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
});
