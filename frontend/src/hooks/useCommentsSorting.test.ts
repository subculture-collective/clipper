import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useComments } from './useComments';
import * as commentApi from '@/lib/comment-api';
import type { Comment, CommentFeedResponse, CommentSortOption } from '@/types/comment';

// Mock the comment API
vi.mock('@/lib/comment-api');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'comment-1',
  clip_id: 'clip-1',
  user_id: 'user-1',
  username: 'testuser',
  user_avatar: 'https://example.com/avatar.png',
  user_karma: 1234,
  user_role: 'user',
  parent_comment_id: null,
  content: 'Test comment',
  vote_score: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_deleted: false,
  is_removed: false,
  reply_count: 0,
  depth: 0,
  child_count: 0,
  user_vote: null,
  replies: [],
  ...overrides,
});

describe('useComments - Sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sort option: best', () => {
    it('should fetch comments with best sort', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1', vote_score: 10 }),
        createMockComment({ id: 'comment-2', vote_score: 5 }),
        createMockComment({ id: 'comment-3', vote_score: 8 }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 3,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useComments('clip-1', 'best'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(commentApi.fetchComments).toHaveBeenCalledWith(expect.objectContaining({
        clipId: 'clip-1',
        sort: 'best',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      }));

      expect(result.current.data?.pages[0].comments).toHaveLength(3);
    });
  });

  describe('Sort option: top', () => {
    it('should fetch comments with top sort', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1', vote_score: 100 }),
        createMockComment({ id: 'comment-2', vote_score: 50 }),
        createMockComment({ id: 'comment-3', vote_score: 25 }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 3,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useComments('clip-1', 'top'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(commentApi.fetchComments).toHaveBeenCalledWith(expect.objectContaining({
        clipId: 'clip-1',
        sort: 'top',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      }));

      // Verify comments are returned (backend handles sorting)
      expect(result.current.data?.pages[0].comments).toHaveLength(3);
      expect(result.current.data?.pages[0].comments[0].id).toBe('comment-1');
    });
  });

  describe('Sort option: new', () => {
    it('should fetch comments with new sort', async () => {
      const mockComments = [
        createMockComment({
          id: 'comment-1',
          created_at: '2024-01-03T00:00:00Z',
        }),
        createMockComment({
          id: 'comment-2',
          created_at: '2024-01-02T00:00:00Z',
        }),
        createMockComment({
          id: 'comment-3',
          created_at: '2024-01-01T00:00:00Z',
        }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 3,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useComments('clip-1', 'new'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(commentApi.fetchComments).toHaveBeenCalledWith(expect.objectContaining({
        clipId: 'clip-1',
        sort: 'new',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      }));

      expect(result.current.data?.pages[0].comments).toHaveLength(3);
    });
  });

  describe('Sort option: old', () => {
    it('should fetch comments with old sort', async () => {
      const mockComments = [
        createMockComment({
          id: 'comment-1',
          created_at: '2024-01-01T00:00:00Z',
        }),
        createMockComment({
          id: 'comment-2',
          created_at: '2024-01-02T00:00:00Z',
        }),
        createMockComment({
          id: 'comment-3',
          created_at: '2024-01-03T00:00:00Z',
        }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 3,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useComments('clip-1', 'old'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(commentApi.fetchComments).toHaveBeenCalledWith(expect.objectContaining({
        clipId: 'clip-1',
        sort: 'old',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      }));

      expect(result.current.data?.pages[0].comments).toHaveLength(3);
    });
  });

  describe('Sort option: controversial', () => {
    it('should fetch comments with controversial sort', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1', vote_score: 1 }),
        createMockComment({ id: 'comment-2', vote_score: 2 }),
        createMockComment({ id: 'comment-3', vote_score: 0 }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 3,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useComments('clip-1', 'controversial'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(commentApi.fetchComments).toHaveBeenCalledWith(expect.objectContaining({
        clipId: 'clip-1',
        sort: 'controversial',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      }));

      expect(result.current.data?.pages[0].comments).toHaveLength(3);
    });
  });

  describe('Sort switching behavior', () => {
    it('should refetch comments when sort changes', async () => {
      const bestResponse: CommentFeedResponse = {
        comments: [
          createMockComment({ id: 'comment-1', vote_score: 10 }),
          createMockComment({ id: 'comment-2', vote_score: 5 }),
        ],
        total: 2,
        page: 1,
        limit: 10,
        has_more: false,
      };

      const newResponse: CommentFeedResponse = {
        comments: [
          createMockComment({
            id: 'comment-3',
            created_at: '2024-01-03T00:00:00Z',
          }),
          createMockComment({
            id: 'comment-4',
            created_at: '2024-01-02T00:00:00Z',
          }),
        ],
        total: 2,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments)
        .mockResolvedValueOnce(bestResponse)
        .mockResolvedValueOnce(newResponse);

      const { result, rerender } = renderHook(
        ({ sort }: { sort: CommentSortOption }) => useComments('clip-1', sort),
        {
          wrapper: createWrapper(),
          initialProps: { sort: 'best' as CommentSortOption },
        }
      );

      // Wait for initial fetch with 'best' sort
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.pages[0].comments[0].id).toBe('comment-1');

      // Change sort to 'new'
      rerender({ sort: 'new' });

      // Wait for refetch with 'new' sort
      await waitFor(() => {
        return (
          result.current.isSuccess &&
          result.current.data?.pages[0].comments[0].id === 'comment-3'
        );
      });

      expect(commentApi.fetchComments).toHaveBeenCalledTimes(2);
      expect(commentApi.fetchComments).toHaveBeenNthCalledWith(1, {
        clipId: 'clip-1',
        sort: 'best',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      });
      expect(commentApi.fetchComments).toHaveBeenNthCalledWith(2, {
        clipId: 'clip-1',
        sort: 'new',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      });
    });

    it('should maintain separate cache for different sort options', async () => {
      const bestResponse: CommentFeedResponse = {
        comments: [createMockComment({ id: 'comment-1' })],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      const topResponse: CommentFeedResponse = {
        comments: [createMockComment({ id: 'comment-2' })],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments)
        .mockResolvedValueOnce(bestResponse)
        .mockResolvedValueOnce(topResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      // Fetch with 'best' sort
      const { result: bestResult } = renderHook(() => useComments('clip-1', 'best'), {
        wrapper,
      });

      await waitFor(() => expect(bestResult.current.isSuccess).toBe(true));

      // Fetch with 'top' sort
      const { result: topResult } = renderHook(() => useComments('clip-1', 'top'), {
        wrapper,
      });

      await waitFor(() => expect(topResult.current.isSuccess).toBe(true));

      // Both queries should have been called
      expect(commentApi.fetchComments).toHaveBeenCalledTimes(2);

      // Verify separate cache entries exist
      const bestCache = queryClient.getQueryData(['comments', 'clip-1', 'best', 'with-replies']);
      const topCache = queryClient.getQueryData(['comments', 'clip-1', 'top', 'with-replies']);

      expect(bestCache).toBeDefined();
      expect(topCache).toBeDefined();
      expect(bestCache).not.toEqual(topCache);
    });
  });

  describe('Default sort behavior', () => {
    it('should use "best" as default sort when not specified', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [createMockComment()],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useComments('clip-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(commentApi.fetchComments).toHaveBeenCalledWith(expect.objectContaining({
        clipId: 'clip-1',
        sort: 'best',
        pageParam: 1,
        limit: 10,
        includeReplies: true,
      }));
    });
  });

  describe('Pagination with different sort options', () => {
    it('should paginate correctly with sort option', async () => {
      const page1Response: CommentFeedResponse = {
        comments: [createMockComment({ id: 'comment-1' })],
        total: 2,
        page: 1,
        limit: 1,
        has_more: true,
      };

      const page2Response: CommentFeedResponse = {
        comments: [createMockComment({ id: 'comment-2' })],
        total: 2,
        page: 2,
        limit: 1,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments)
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      const { result } = renderHook(() => useComments('clip-1', 'top'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.hasNextPage).toBe(true);

      // Fetch next page
      result.current.fetchNextPage();

      await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));

      expect(commentApi.fetchComments).toHaveBeenCalledTimes(2);
      expect(commentApi.fetchComments).toHaveBeenNthCalledWith(2, {
        clipId: 'clip-1',
        sort: 'top',
        pageParam: 2,
        limit: 10,
        includeReplies: true,
      });
    });
  });
});
