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

  describe('Clip Operations', () => {
    it('should store and retrieve a clip', async () => {
      const clip: Clip = {
        id: 'clip-1',
        title: 'Test Clip',
        slug: 'test-clip',
        twitch_clip_id: 'twitch-123',
        thumbnail_url: 'https://example.com/thumb.jpg',
        embed_url: 'https://example.com/embed',
        broadcaster_id: 'broadcaster-1',
        broadcaster_name: 'TestBroadcaster',
        broadcaster_display_name: 'Test Broadcaster',
        creator_id: 'creator-1',
        creator_name: 'TestCreator',
        game_id: 'game-1',
        game_name: 'Test Game',
        language: 'en',
        duration: 30,
        view_count: 100,
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        vote_count: 10,
        comment_count: 5,
        is_nsfw: false,
        user_vote: 0,
        is_favorited: false,
      };

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
        {
          id: 'clip-1',
          title: 'Clip 1',
          slug: 'clip-1',
          twitch_clip_id: 'twitch-1',
          thumbnail_url: '',
          embed_url: '',
          broadcaster_id: 'b1',
          broadcaster_name: 'B1',
          broadcaster_display_name: 'B1',
          creator_id: 'c1',
          creator_name: 'C1',
          game_id: 'g1',
          game_name: 'G1',
          language: 'en',
          duration: 30,
          view_count: 0,
          created_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          vote_count: 0,
          comment_count: 0,
          is_nsfw: false,
          user_vote: 0,
          is_favorited: false,
        },
        {
          id: 'clip-2',
          title: 'Clip 2',
          slug: 'clip-2',
          twitch_clip_id: 'twitch-2',
          thumbnail_url: '',
          embed_url: '',
          broadcaster_id: 'b2',
          broadcaster_name: 'B2',
          broadcaster_display_name: 'B2',
          creator_id: 'c2',
          creator_name: 'C2',
          game_id: 'g2',
          game_name: 'G2',
          language: 'en',
          duration: 30,
          view_count: 0,
          created_at: new Date().toISOString(),
          submitted_at: new Date().toISOString(),
          vote_count: 0,
          comment_count: 0,
          is_nsfw: false,
          user_vote: 0,
          is_favorited: false,
        },
      ];

      await cache.setClips(clips);
      
      const clip1 = await cache.getClip('clip-1');
      const clip2 = await cache.getClip('clip-2');

      expect(clip1?.title).toBe('Clip 1');
      expect(clip2?.title).toBe('Clip 2');
    });

    it('should delete a clip', async () => {
      const clip: Clip = {
        id: 'clip-1',
        title: 'Test Clip',
        slug: 'test-clip',
        twitch_clip_id: 'twitch-123',
        thumbnail_url: '',
        embed_url: '',
        broadcaster_id: 'b1',
        broadcaster_name: 'B1',
        broadcaster_display_name: 'B1',
        creator_id: 'c1',
        creator_name: 'C1',
        game_id: 'g1',
        game_name: 'G1',
        language: 'en',
        duration: 30,
        view_count: 0,
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        vote_count: 0,
        comment_count: 0,
        is_nsfw: false,
        user_vote: 0,
        is_favorited: false,
      };

      await cache.setClip(clip);
      await cache.deleteClip('clip-1');
      
      const retrieved = await cache.getClip('clip-1');
      expect(retrieved).toBeNull();
    });

    it('should expire clips after TTL', async () => {
      const clip: Clip = {
        id: 'clip-1',
        title: 'Test Clip',
        slug: 'test-clip',
        twitch_clip_id: 'twitch-123',
        thumbnail_url: '',
        embed_url: '',
        broadcaster_id: 'b1',
        broadcaster_name: 'B1',
        broadcaster_display_name: 'B1',
        creator_id: 'c1',
        creator_name: 'C1',
        game_id: 'g1',
        game_name: 'G1',
        language: 'en',
        duration: 30,
        view_count: 0,
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        vote_count: 0,
        comment_count: 0,
        is_nsfw: false,
        user_vote: 0,
        is_favorited: false,
      };

      // Set with very short TTL
      await cache.setClip(clip, 10); // 10ms
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const retrieved = await cache.getClip('clip-1');
      expect(retrieved).toBeNull();
    });
  });

  describe('Comment Operations', () => {
    it('should store and retrieve a comment', async () => {
      const comment: Comment = {
        id: 'comment-1',
        clip_id: 'clip-1',
        content: 'Test comment',
        author_id: 'user-1',
        author_username: 'testuser',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vote_count: 5,
        user_vote: 0,
        parent_id: null,
        is_deleted: false,
        is_edited: false,
      };

      await cache.setComment(comment);
      const retrieved = await cache.getComment('comment-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('comment-1');
      expect(retrieved?.content).toBe('Test comment');
    });

    it('should retrieve comments by clip ID', async () => {
      const comments: Comment[] = [
        {
          id: 'comment-1',
          clip_id: 'clip-1',
          content: 'Comment 1',
          author_id: 'user-1',
          author_username: 'user1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vote_count: 0,
          user_vote: 0,
          parent_id: null,
          is_deleted: false,
          is_edited: false,
        },
        {
          id: 'comment-2',
          clip_id: 'clip-1',
          content: 'Comment 2',
          author_id: 'user-2',
          author_username: 'user2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vote_count: 0,
          user_vote: 0,
          parent_id: null,
          is_deleted: false,
          is_edited: false,
        },
        {
          id: 'comment-3',
          clip_id: 'clip-2',
          content: 'Comment 3',
          author_id: 'user-3',
          author_username: 'user3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          vote_count: 0,
          user_vote: 0,
          parent_id: null,
          is_deleted: false,
          is_edited: false,
        },
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
      const clip: Clip = {
        id: 'clip-1',
        title: 'Test',
        slug: 'test',
        twitch_clip_id: 'twitch-1',
        thumbnail_url: '',
        embed_url: '',
        broadcaster_id: 'b1',
        broadcaster_name: 'B1',
        broadcaster_display_name: 'B1',
        creator_id: 'c1',
        creator_name: 'C1',
        game_id: 'g1',
        game_name: 'G1',
        language: 'en',
        duration: 30,
        view_count: 0,
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        vote_count: 0,
        comment_count: 0,
        is_nsfw: false,
        user_vote: 0,
        is_favorited: false,
      };

      const comment: Comment = {
        id: 'comment-1',
        clip_id: 'clip-1',
        content: 'Test',
        author_id: 'user-1',
        author_username: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        vote_count: 0,
        user_vote: 0,
        parent_id: null,
        is_deleted: false,
        is_edited: false,
      };

      await cache.setClip(clip);
      await cache.setComment(comment);

      const stats = await cache.getStats();
      expect(stats.clips).toBe(1);
      expect(stats.comments).toBe(1);
    });

    it('should clear all data', async () => {
      const clip: Clip = {
        id: 'clip-1',
        title: 'Test',
        slug: 'test',
        twitch_clip_id: 'twitch-1',
        thumbnail_url: '',
        embed_url: '',
        broadcaster_id: 'b1',
        broadcaster_name: 'B1',
        broadcaster_display_name: 'B1',
        creator_id: 'c1',
        creator_name: 'C1',
        game_id: 'g1',
        game_name: 'G1',
        language: 'en',
        duration: 30,
        view_count: 0,
        created_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        vote_count: 0,
        comment_count: 0,
        is_nsfw: false,
        user_vote: 0,
        is_favorited: false,
      };

      await cache.setClip(clip);
      await cache.clear();

      const stats = await cache.getStats();
      expect(stats.clips).toBe(0);
    });
  });
});
