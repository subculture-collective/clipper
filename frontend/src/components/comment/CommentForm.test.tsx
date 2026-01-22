import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommentForm } from './CommentForm';

// Mock the hooks
vi.mock('@/hooks', () => ({
  useCreateComment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useUpdateComment: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  })),
}));

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

describe('CommentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Character limit', () => {
    it('should enforce 5000 character maximum', async () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i });
      
      // Textarea should have maxLength attribute set to 5000
      expect(textarea).toHaveAttribute('maxLength', '5000');
    });

    it('should display character count', async () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      // Initially shows 5000 remaining
      expect(screen.getByText(/5000 characters remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/0\/5000/i)).toBeInTheDocument();
    });

    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i });
      await user.type(textarea, 'Hello World');

      await waitFor(() => {
        expect(screen.getByText(/4989 characters remaining/i)).toBeInTheDocument();
        expect(screen.getByText(/11\/5000/i)).toBeInTheDocument();
      });
    });

    it('should show 0 characters remaining at limit', async () => {
      const user = userEvent.setup();
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i }) as HTMLTextAreaElement;
      
      // Type exactly 5000 characters using paste instead of individual typing
      const maxText = 'a'.repeat(5000);
      await user.click(textarea);
      await user.paste(maxText);

      await waitFor(() => {
        expect(screen.getByText(/0 characters remaining/i)).toBeInTheDocument();
        expect(screen.getByText(/5000\/5000/i)).toBeInTheDocument();
      });
    });

    it('should not allow typing beyond 5000 characters', async () => {
      const user = userEvent.setup();
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i }) as HTMLTextAreaElement;
      
      // Attempt to paste more than 5000 characters
      const overLimit = 'a'.repeat(5001);
      await user.click(textarea);
      await user.paste(overLimit);

      await waitFor(() => {
        // Should be truncated to exactly 5000 characters
        expect(textarea.value).toHaveLength(5000);
        expect(screen.getByText(/0 characters remaining/i)).toBeInTheDocument();
      });
    });
  });

  describe('Placeholder text', () => {
    it('should show default placeholder for new comment', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      expect(screen.getByPlaceholderText(/Write a comment.../i)).toBeInTheDocument();
    });

    it('should show custom placeholder when provided', () => {
      renderWithClient(<CommentForm clipId="clip-1" placeholder="Share your thoughts..." />);

      expect(screen.getByPlaceholderText(/Share your thoughts.../i)).toBeInTheDocument();
    });

    it('should show reply placeholder for replies', () => {
      renderWithClient(
        <CommentForm clipId="clip-1" parentId="parent-1" parentUsername="testuser" />
      );

      expect(screen.getByPlaceholderText(/Reply to @testuser.../i)).toBeInTheDocument();
    });
  });

  describe('Submit button state', () => {
    it('should disable submit button when textarea is empty', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      const submitButton = screen.getByRole('button', { name: /Comment/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when textarea has content', async () => {
      const user = userEvent.setup();
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i });
      const submitButton = screen.getByRole('button', { name: /Comment/i });

      await user.type(textarea, 'Test comment');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should disable submit button when only whitespace is entered', async () => {
      const user = userEvent.setup();
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i });
      const submitButton = screen.getByRole('button', { name: /Comment/i });

      // Initially disabled
      expect(submitButton).toBeDisabled();

      // Type whitespace
      await user.type(textarea, '   ');

      // Should still be disabled after typing whitespace
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Focus management', () => {
    it('should focus textarea on mount', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i });
      expect(textarea).toHaveFocus();
    });
  });

  describe('Markdown support', () => {
    it('should show markdown support hint', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      expect(screen.getByText(/Markdown supported/i)).toBeInTheDocument();
    });

    it('should have preview toggle buttons', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      expect(screen.getByRole('button', { name: /Write/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Preview/i })).toBeInTheDocument();
    });

    it('should switch to preview mode when preview button is clicked', async () => {
      const user = userEvent.setup();
      renderWithClient(<CommentForm clipId="clip-1" />);

      const textarea = screen.getByRole('textbox', { name: /Comment content/i });
      await user.type(textarea, '**Bold text**');

      const previewButton = screen.getByRole('button', { name: /Preview/i });
      await user.click(previewButton);

      await waitFor(() => {
        // Textarea should be hidden in preview mode
        expect(textarea).not.toBeVisible();
      });
    });
  });

  describe('Button labels', () => {
    it('should show "Comment" button for new comments', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      expect(screen.getByRole('button', { name: /^Comment$/i })).toBeInTheDocument();
    });

    it('should show "Reply" button for replies', () => {
      renderWithClient(<CommentForm clipId="clip-1" parentId="parent-1" />);

      expect(screen.getByRole('button', { name: /Reply/i })).toBeInTheDocument();
    });

    it('should show "Update" button when editing', () => {
      renderWithClient(<CommentForm clipId="clip-1" editCommentId="comment-1" />);

      expect(screen.getByRole('button', { name: /Update/i })).toBeInTheDocument();
    });
  });

  describe('Cancel functionality', () => {
    it('should show cancel button when onCancel is provided', () => {
      const onCancel = vi.fn();
      renderWithClient(<CommentForm clipId="clip-1" onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should show cancel button when editing', () => {
      renderWithClient(<CommentForm clipId="clip-1" editCommentId="comment-1" />);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should not show cancel button for new comments without onCancel', () => {
      renderWithClient(<CommentForm clipId="clip-1" />);

      expect(screen.queryByRole('button', { name: /Cancel/i })).not.toBeInTheDocument();
    });
  });
});
