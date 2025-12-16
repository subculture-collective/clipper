import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useCommentVote } from './useComments';
import * as commentApi from '@/lib/comment-api';
import type { Comment, CommentFeedResponse } from '@/types/comment';

// Mock the comment API
vi.mock('@/lib/comment-api');

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

describe('useCommentVote - Optimistic Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Optimistic upvote', () => {
    it('should optimistically add upvote when user has not voted', async () => {
      const mockComment = createMockComment({ vote_score: 5, user_vote: null });
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      // Pre-populate cache with comment
      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Trigger upvote
      result.current.mutate({ comment_id: 'comment-1', vote_type: 1 });

      // Check optimistic update
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].vote_score).toBe(6);
        expect(cacheData?.pages[0].comments[0].user_vote).toBe(1);
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should optimistically remove upvote when user has already upvoted', async () => {
      const mockComment = createMockComment({ vote_score: 6, user_vote: 1 });
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      // Pre-populate cache with upvoted comment
      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Trigger upvote again to remove it
      result.current.mutate({ comment_id: 'comment-1', vote_type: 1 });

      // Check optimistic update
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].vote_score).toBe(5);
        expect(cacheData?.pages[0].comments[0].user_vote).toBe(null);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should optimistically change downvote to upvote', async () => {
      const mockComment = createMockComment({ vote_score: 4, user_vote: -1 });
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      // Pre-populate cache with downvoted comment
      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Change from downvote to upvote
      result.current.mutate({ comment_id: 'comment-1', vote_type: 1 });

      // Check optimistic update (4 - (-1) + 1 = 6)
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].vote_score).toBe(6);
        expect(cacheData?.pages[0].comments[0].user_vote).toBe(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('Optimistic downvote', () => {
    it('should optimistically add downvote when user has not voted', async () => {
      const mockComment = createMockComment({ vote_score: 5, user_vote: null });
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Trigger downvote
      result.current.mutate({ comment_id: 'comment-1', vote_type: -1 });

      // Check optimistic update
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].vote_score).toBe(4);
        expect(cacheData?.pages[0].comments[0].user_vote).toBe(-1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should optimistically remove downvote when user has already downvoted', async () => {
      const mockComment = createMockComment({ vote_score: 4, user_vote: -1 });
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Trigger downvote again to remove it
      result.current.mutate({ comment_id: 'comment-1', vote_type: -1 });

      // Check optimistic update
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].vote_score).toBe(5);
        expect(cacheData?.pages[0].comments[0].user_vote).toBe(null);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should optimistically change upvote to downvote', async () => {
      const mockComment = createMockComment({ vote_score: 6, user_vote: 1 });
      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Change from upvote to downvote
      result.current.mutate({ comment_id: 'comment-1', vote_type: -1 });

      // Check optimistic update (6 - 1 + (-1) = 4)
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].vote_score).toBe(4);
        expect(cacheData?.pages[0].comments[0].user_vote).toBe(-1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('Nested replies optimistic updates', () => {
    it('should optimistically update nested reply votes', async () => {
      const mockReply = createMockComment({
        id: 'comment-2',
        parent_comment_id: 'comment-1',
        vote_score: 3,
        user_vote: null,
        depth: 1,
      });

      const mockComment = createMockComment({
        vote_score: 5,
        user_vote: null,
        reply_count: 1,
        child_count: 1,
        replies: [mockReply],
      });

      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Upvote the nested reply
      result.current.mutate({ comment_id: 'comment-2', vote_type: 1 });

      // Check optimistic update on nested reply
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(cacheData?.pages[0].comments[0].replies![0].vote_score).toBe(4);
        expect(cacheData?.pages[0].comments[0].replies![0].user_vote).toBe(1);
        // Parent should remain unchanged
        expect(cacheData?.pages[0].comments[0].vote_score).toBe(5);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should optimistically update deeply nested replies', async () => {
      const mockReply3 = createMockComment({
        id: 'comment-3',
        parent_comment_id: 'comment-2',
        vote_score: 2,
        user_vote: null,
        depth: 2,
        replies: [],
      });

      const mockReply2 = createMockComment({
        id: 'comment-2',
        parent_comment_id: 'comment-1',
        vote_score: 3,
        user_vote: null,
        depth: 1,
        reply_count: 1,
        child_count: 1,
        replies: [mockReply3],
      });

      const mockComment = createMockComment({
        vote_score: 5,
        user_vote: null,
        reply_count: 2,
        child_count: 2,
        replies: [mockReply2],
      });

      const successResponse = { message: 'Vote recorded successfully' };
      vi.mocked(commentApi.voteOnComment).mockResolvedValue(successResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Upvote the deeply nested reply
      result.current.mutate({ comment_id: 'comment-3', vote_type: 1 });

      // Check optimistic update on deeply nested reply
      await waitFor(() => {
        const cacheData = queryClient.getQueryData<{
          pages: CommentFeedResponse[];
        }>(['comments', 'clip-1', 'best']);

        expect(
          cacheData?.pages[0].comments[0].replies![0].replies![0].vote_score
        ).toBe(3);
        expect(
          cacheData?.pages[0].comments[0].replies![0].replies![0].user_vote
        ).toBe(1);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('Error handling', () => {
    it('should revert optimistic update on error', async () => {
      const mockComment = createMockComment({ vote_score: 5, user_vote: null });
      const error = new Error('Vote failed');
      vi.mocked(commentApi.voteOnComment).mockRejectedValue(error);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const mockResponse: CommentFeedResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      queryClient.setQueryData(['comments', 'clip-1', 'best'], {
        pages: [mockResponse],
        pageParams: [1],
      });

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

      const { result } = renderHook(() => useCommentVote(), { wrapper });

      // Trigger upvote that will fail
      result.current.mutate({ comment_id: 'comment-1', vote_type: 1 });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Check that vote was reverted
      const cacheData = queryClient.getQueryData<{
        pages: CommentFeedResponse[];
      }>(['comments', 'clip-1', 'best']);

      expect(cacheData?.pages[0].comments[0].vote_score).toBe(5);
      expect(cacheData?.pages[0].comments[0].user_vote).toBe(null);
    });
  });
});
