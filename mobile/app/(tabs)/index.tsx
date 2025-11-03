import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { Clip } from '@clipper/shared';
import { clipService } from '@/services/clipService';

export default function FeedScreen() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClips();
  }, []);

  const loadClips = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clipService.getClips({ sort: 'hot', limit: 20 });
      setClips(response.clips);
    } catch (err) {
      setError('Failed to load clips');
      console.error('Error loading clips:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderClip = ({ item }: { item: Clip }) => (
    <View style={styles.clipCard}>
      <Text style={styles.clipTitle}>{item.title}</Text>
      <Text style={styles.clipInfo}>
        {item.broadcaster_name} • {item.view_count} views
      </Text>
      <Text style={styles.clipStats}>
        ↑ {item.upvote_count || 0} • 💬 {item.comment_count} • ⭐ {item.favorite_count}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={clips}
        renderItem={renderClip}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
  },
  clipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  clipInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  clipStats: {
    fontSize: 14,
    color: '#94a3b8',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
});
