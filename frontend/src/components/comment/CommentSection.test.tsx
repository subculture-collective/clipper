import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentSection } from './CommentSection';
import * as commentApi from '@/lib/comment-api';
import type { Comment, CommentFeedResponse } from '@/types/comment';

// Mock the API and auth hooks
vi.mock('@/lib/comment-api');
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual('@/hooks');
  return {
    ...actual,
    useIsAuthenticated: vi.fn(() => false),
    useToast: vi.fn(() => ({
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
  };
});

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'comment-1',
  clip_id: 'clip-1',
  user_id: 'user-1',
  username: 'testuser',
  user_avatar: 'https://example.com/avatar.png',
  user_karma: 1234,
  user_role: 'user',
  parent_id: null,
  content: 'Test comment',
  vote_score: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_deleted: false,
  is_removed: false,
  depth: 0,
  child_count: 0,
  user_vote: null,
  replies: [],
  ...overrides,
});

const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('CommentSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading and error states', () => {
    it('should show loading spinner while fetching comments', () => {
      vi.mocked(commentApi.fetchComments).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithClient(<CommentSection clipId="clip-1" />);

      expect(screen.getByText(/Comments \(0\)/i)).toBeInTheDocument();
      // Loading spinner should be present
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should show error message when fetch fails', async () => {
      const error = new Error('Failed to load comments');
      vi.mocked(commentApi.fetchComments).mockRejectedValue(error);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading comments/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no comments exist', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
        expect(screen.getByText(/Be the first to comment!/i)).toBeInTheDocument();
      });
    });

    it('should show "Add Comment" button in empty state', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        const buttons = screen.getAllByText(/Add Comment/i);
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Comments display', () => {
    it('should render comments when they exist', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1', content: 'First comment' }),
        createMockComment({ id: 'comment-2', content: 'Second comment' }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 2,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/First comment/i)).toBeInTheDocument();
        expect(screen.getByText(/Second comment/i)).toBeInTheDocument();
      });
    });

    it('should show correct comment count', async () => {
      const mockComments = [
        createMockComment({ id: 'comment-1' }),
        createMockComment({ id: 'comment-2' }),
        createMockComment({ id: 'comment-3' }),
      ];

      const mockResponse: CommentFeedResponse = {
        comments: mockComments,
        total: 3,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Comments \(3\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sort functionality', () => {
    it('should render sort dropdown with all options', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        const sortSelect = screen.getByLabelText(/Sort by:/i);
        expect(sortSelect).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText(/Sort by:/i) as HTMLSelectElement;
      const options = Array.from(sortSelect.options).map((opt) => opt.value);

      expect(options).toContain('best');
      expect(options).toContain('top');
      expect(options).toContain('new');
      expect(options).toContain('old');
      expect(options).toContain('controversial');
    });

    it('should default to "best" sort', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        const sortSelect = screen.getByLabelText(/Sort by:/i) as HTMLSelectElement;
        expect(sortSelect.value).toBe('best');
      });
    });

    it('should refetch comments when sort changes', async () => {
      const user = userEvent.setup();

      const mockResponse: CommentFeedResponse = {
        comments: [createMockComment()],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Sort by:/i)).toBeInTheDocument();
      });

      // Should have been called once with 'best' sort
      expect(commentApi.fetchComments).toHaveBeenCalledWith({
        clipId: 'clip-1',
        sort: 'best',
        pageParam: 1,
        limit: 10,
      });

      const sortSelect = screen.getByLabelText(/Sort by:/i);
      await user.selectOptions(sortSelect, 'new');

      // Should be called again with 'new' sort
      await waitFor(() => {
        expect(commentApi.fetchComments).toHaveBeenCalledWith({
          clipId: 'clip-1',
          sort: 'new',
          pageParam: 1,
          limit: 10,
        });
      });
    });
  });

  describe('Add comment interaction', () => {
    it('should show comment form when "Add Comment" button is clicked', async () => {
      const user = userEvent.setup();

      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        const buttons = screen.getAllByText(/Add Comment/i);
        expect(buttons.length).toBeGreaterThan(0);
      });

      const addButton = screen.getAllByText(/Add Comment/i)[0];
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/What are your thoughts?/i)).toBeInTheDocument();
      });
    });

    it('should hide form when cancel is clicked', async () => {
      const user = userEvent.setup();

      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        const buttons = screen.getAllByText(/Add Comment/i);
        expect(buttons.length).toBeGreaterThan(0);
      });

      // Click "Add Comment" to show form
      const addButton = screen.getAllByText(/Add Comment/i)[0];
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/What are your thoughts?/i)).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByText(/Cancel/i);
      await user.click(cancelButton);

      // Form should be hidden
      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/What are your thoughts?/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should show "Load More" button when hasNextPage is true', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [createMockComment()],
        total: 20,
        page: 1,
        limit: 10,
        has_more: true,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Load More Comments/i)).toBeInTheDocument();
      });
    });

    it('should not show "Load More" button when hasNextPage is false', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [createMockComment()],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Test comment/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/Load More Comments/i)).not.toBeInTheDocument();
    });

    it('should load next page when "Load More" is clicked', async () => {
      const user = userEvent.setup();

      const page1Response: CommentFeedResponse = {
        comments: [createMockComment({ id: 'comment-1', content: 'First comment' })],
        total: 2,
        page: 1,
        limit: 1,
        has_more: true,
      };

      const page2Response: CommentFeedResponse = {
        comments: [createMockComment({ id: 'comment-2', content: 'Second comment' })],
        total: 2,
        page: 2,
        limit: 1,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments)
        .mockResolvedValueOnce(page1Response)
        .mockResolvedValueOnce(page2Response);

      renderWithClient(<CommentSection clipId="clip-1" />);

      await waitFor(() => {
        expect(screen.getByText(/First comment/i)).toBeInTheDocument();
      });

      const loadMoreButton = screen.getByText(/Load More Comments/i);
      await user.click(loadMoreButton);

      await waitFor(() => {
        expect(screen.getByText(/Second comment/i)).toBeInTheDocument();
      });

      // Both comments should now be visible
      expect(screen.getByText(/First comment/i)).toBeInTheDocument();
      expect(screen.getByText(/Second comment/i)).toBeInTheDocument();
    });
  });

  describe('Props handling', () => {
    it('should pass currentUserId to CommentItem components', async () => {
      // Use a recent timestamp so Edit button appears (within 15-minute window)
      const recentTime = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
      const mockResponse: CommentFeedResponse = {
        comments: [createMockComment({ user_id: 'user-1', created_at: recentTime })],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" currentUserId="user-1" />);

      await waitFor(() => {
        expect(screen.getByText(/Test comment/i)).toBeInTheDocument();
      });

      // Edit and Delete buttons should be visible for own comment (within edit window)
      expect(screen.getByText(/Edit/i)).toBeInTheDocument();
      expect(screen.getByText(/Delete/i)).toBeInTheDocument();
    });

    it('should pass isAdmin to CommentItem components', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [createMockComment({ user_id: 'user-2' })],
        total: 1,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      renderWithClient(<CommentSection clipId="clip-1" currentUserId="user-1" isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Test comment/i)).toBeInTheDocument();
      });

      // Delete button should be visible for admin even if not own comment
      expect(screen.getByText(/Delete/i)).toBeInTheDocument();
    });

    it('should apply custom className', async () => {
      const mockResponse: CommentFeedResponse = {
        comments: [],
        total: 0,
        page: 1,
        limit: 10,
        has_more: false,
      };

      vi.mocked(commentApi.fetchComments).mockResolvedValue(mockResponse);

      const { container } = renderWithClient(
        <CommentSection clipId="clip-1" className="custom-class" />
      );

      await waitFor(() => {
        expect(screen.getByText(/Comments \(0\)/i)).toBeInTheDocument();
      });

      const commentSection = container.querySelector('.custom-class');
      expect(commentSection).toBeInTheDocument();
    });
  });
});
