/**
 * Tests for Offline Cache
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OfflineCache } from './offline-cache';
import type { Clip } from '@/types/clip';
import type { Comment } from '@/types/comment';

describe('OfflineCache', () => {
  let cache: OfflineCache;

  beforeEach(async () => {
    // Create a new cache instance for each test with unique DB name
    cache = new OfflineCache({ 
      dbName: `test-cache-${Date.now()}`,
      defaultTTL: 1000 * 60 * 60, // 1 hour
    });
    await cache.init();
  });

  afterEach(async () => {
    // Clean up after each test
    await cache.clear();
    await cache.close();
  });

  // Helper to create test clip
  const createTestClip = (id: string, title: string): Clip => ({
    id,
    title,
    twitch_clip_id: `twitch-${id}`,
    twitch_clip_url: `https://twitch.tv/clip/${id}`,
    embed_url: `https://clips.twitch.tv/embed?clip=${id}`,
    creator_name: 'TestCreator',
    creator_id: 'creator-1',
    broadcaster_name: 'TestBroadcaster',
    broadcaster_id: 'broadcaster-1',
    game_id: 'game-1',
    game_name: 'Test Game',
    language: 'en',
    thumbnail_url: 'https://example.com/thumb.jpg',
    duration: 30,
    view_count: 100,
    created_at: new Date().toISOString(),
    imported_at: new Date().toISOString(),
    vote_score: 10,
    comment_count: 5,
    favorite_count: 3,
    is_featured: false,
    is_nsfw: false,
    is_removed: false,
    user_vote: null,
    is_favorited: false,
  });

  describe('Clip Operations', () => {
    it('should store and retrieve a clip', async () => {
      const clip = createTestClip('clip-1', 'Test Clip');

      await cache.setClip(clip);
      const retrieved = await cache.getClip('clip-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('clip-1');
      expect(retrieved?.title).toBe('Test Clip');
    });

    it('should return null for non-existent clip', async () => {
      const retrieved = await cache.getClip('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should store multiple clips', async () => {
      const clips: Clip[] = [
        createTestClip('clip-1', 'Clip 1'),
        createTestClip('clip-2', 'Clip 2'),
      ];

      await cache.setClips(clips);
      
      const clip1 = await cache.getClip('clip-1');
      const clip2 = await cache.getClip('clip-2');

      expect(clip1?.title).toBe('Clip 1');
      expect(clip2?.title).toBe('Clip 2');
    });

    it('should delete a clip', async () => {
      const clip = createTestClip('clip-1', 'Test Clip');

      await cache.setClip(clip);
      await cache.deleteClip('clip-1');
      
      const retrieved = await cache.getClip('clip-1');
      expect(retrieved).toBeNull();
    });

    it('should expire clips after TTL', async () => {
      const clip = createTestClip('clip-1', 'Test Clip');

      // Set with very short TTL
      await cache.setClip(clip, 10); // 10ms
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const retrieved = await cache.getClip('clip-1');
      expect(retrieved).toBeNull();
    });
  });

  // Helper to create test comment
  const createTestComment = (id: string, clipId: string, content: string): Comment => ({
    id,
    clip_id: clipId,
    user_id: 'user-1',
    username: 'testuser',
    content,
    parent_comment_id: null,
    vote_score: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
    is_removed: false,
    reply_count: 0,
    depth: 0,
    child_count: 0,
    user_vote: null,
  });

  describe('Comment Operations', () => {
    it('should store and retrieve a comment', async () => {
      const comment = createTestComment('comment-1', 'clip-1', 'Test comment');

      await cache.setComment(comment);
      const retrieved = await cache.getComment('comment-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('comment-1');
      expect(retrieved?.content).toBe('Test comment');
    });

    it('should retrieve comments by clip ID', async () => {
      const comments: Comment[] = [
        createTestComment('comment-1', 'clip-1', 'Comment 1'),
        createTestComment('comment-2', 'clip-1', 'Comment 2'),
        createTestComment('comment-3', 'clip-2', 'Comment 3'),
      ];

      await cache.setComments(comments);
      
      const clip1Comments = await cache.getCommentsByClipId('clip-1');
      expect(clip1Comments).toHaveLength(2);
      expect(clip1Comments.map(c => c.id)).toContain('comment-1');
      expect(clip1Comments.map(c => c.id)).toContain('comment-2');
    });
  });

  describe('Metadata Operations', () => {
    it('should store and retrieve metadata', async () => {
      await cache.setMetadata('test-key', { value: 'test-value' });
      const retrieved = await cache.getMetadata<{ value: string }>('test-key');

      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe('test-value');
    });

    it('should return null for non-existent metadata', async () => {
      const retrieved = await cache.getMetadata('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Utility Operations', () => {
    it('should get cache stats', async () => {
      const clip = createTestClip('clip-1', 'Test');
      const comment = createTestComment('comment-1', 'clip-1', 'Test');

      await cache.setClip(clip);
      await cache.setComment(comment);

      const stats = await cache.getStats();
      expect(stats.clips).toBe(1);
      expect(stats.comments).toBe(1);
    });

    it('should clear all data', async () => {
      const clip = createTestClip('clip-1', 'Test');

      await cache.setClip(clip);
      await cache.clear();

      const stats = await cache.getStats();
      expect(stats.clips).toBe(0);
    });
  });
});
