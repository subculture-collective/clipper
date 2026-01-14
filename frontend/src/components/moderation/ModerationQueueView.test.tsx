import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationQueueView } from './ModerationQueueView';
import * as moderationApi from '../../lib/moderation-api';
import { BrowserRouter } from 'react-router-dom';

// Mock the dependencies
vi.mock('../../lib/moderation-api');
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: true,
    user: { id: 'user-1', username: 'admin' },
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ModerationQueueView', () => {
  const mockItems: moderationApi.ModerationQueueItem[] = [
    {
      id: 'item-1',
      content_type: 'clip',
      content_id: 'clip-1',
      title: 'Test Clip 1',
      status: 'pending',
      flagged_at: '2024-01-01T00:00:00Z',
      flagged_by: 'user-123',
      reason: 'Inappropriate content',
    },
    {
      id: 'item-2',
      content_type: 'clip',
      content_id: 'clip-2',
      title: 'Test Clip 2',
      status: 'pending',
      flagged_at: '2024-01-02T00:00:00Z',
      flagged_by: 'user-456',
      reason: 'Spam',
    },
  ];

  const mockStats: moderationApi.ModerationQueueStats = {
    total_pending: 10,
    total_approved: 50,
    total_rejected: 20,
    pending_clips: 5,
    pending_comments: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(moderationApi.getModerationQueue).mockResolvedValue({
      success: true,
      data: mockItems,
    });
    vi.mocked(moderationApi.getModerationStats).mockResolvedValue({
      success: true,
      data: mockStats,
    });
  });

  describe('Rendering', () => {
    it('renders the component with title and description', async () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      expect(screen.getByText('Clip Moderation')).toBeInTheDocument();
      expect(screen.getByText('Review flagged clips')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    it('loads and displays queue items', async () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      expect(screen.getByText('Test Clip 2')).toBeInTheDocument();
    });

    it('loads stats on mount', async () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(moderationApi.getModerationStats).toHaveBeenCalled();
      });
    });
  });

  describe('Status Filtering', () => {
    it('loads pending items by default', async () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(moderationApi.getModerationQueue).toHaveBeenCalledWith(
          'pending',
          'clip',
          50
        );
      });
    });

    it('filters by approved status when selected', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      // Find and click the approved filter button
      const approvedButton = screen.getByRole('button', { name: /approved/i });
      await user.click(approvedButton);

      await waitFor(() => {
        expect(moderationApi.getModerationQueue).toHaveBeenCalledWith(
          'approved',
          'clip',
          50
        );
      });
    });
  });

  describe('Individual Item Actions', () => {
    it('approves a single item', async () => {
      const user = userEvent.setup();
      vi.mocked(moderationApi.approveQueueItem).mockResolvedValue({
        success: true,
        message: 'Item approved',
      });

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(moderationApi.approveQueueItem).toHaveBeenCalledWith('item-1');
      });
    });

    it('rejects a single item with reason', async () => {
      const user = userEvent.setup();
      vi.mocked(moderationApi.rejectQueueItem).mockResolvedValue({
        success: true,
        message: 'Item rejected',
      });

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Enter rejection reason
      const reasonInput = screen.getByPlaceholderText(/reason/i);
      await user.type(reasonInput, 'This violates our policy');

      // Submit rejection
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(moderationApi.rejectQueueItem).toHaveBeenCalledWith(
          'item-1',
          'This violates our policy'
        );
      });
    });
  });

  describe('Bulk Actions', () => {
    it('selects multiple items', async () => {
      const user = userEvent.setup();
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });

    it('bulk approves selected items', async () => {
      const user = userEvent.setup();
      vi.mocked(moderationApi.bulkModerate).mockResolvedValue({
        success: true,
        processed: 2,
        total: 2,
      });

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      // Select items
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      // Click bulk approve button
      const bulkApproveButton = screen.getByRole('button', { name: /approve selected/i });
      await user.click(bulkApproveButton);

      await waitFor(() => {
        expect(moderationApi.bulkModerate).toHaveBeenCalledWith({
          item_ids: ['item-1', 'item-2'],
          action: 'approve',
        });
      });
    });

    it('bulk rejects selected items', async () => {
      const user = userEvent.setup();
      vi.mocked(moderationApi.bulkModerate).mockResolvedValue({
        success: true,
        processed: 2,
        total: 2,
      });

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      // Select items
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      // Click bulk reject button
      const bulkRejectButton = screen.getByRole('button', { name: /reject selected/i });
      await user.click(bulkRejectButton);

      await waitFor(() => {
        expect(moderationApi.bulkModerate).toHaveBeenCalledWith({
          item_ids: ['item-1', 'item-2'],
          action: 'reject',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when loading fails', async () => {
      vi.mocked(moderationApi.getModerationQueue).mockRejectedValue(
        new Error('Failed to load queue')
      );

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
      });
    });

    it('displays error when approve fails', async () => {
      const user = userEvent.setup();
      vi.mocked(moderationApi.approveQueueItem).mockRejectedValue(
        new Error('Failed to approve')
      );

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Failed to approve/)).toBeInTheDocument();
      });
    });
  });

  describe('Success Messages', () => {
    it('displays success message after approving items', async () => {
      const user = userEvent.setup();
      vi.mocked(moderationApi.approveQueueItem).mockResolvedValue({
        success: true,
        message: 'Item approved',
      });

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Clip 1')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/approved successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no items', async () => {
      vi.mocked(moderationApi.getModerationQueue).mockResolvedValue({
        success: true,
        data: [],
      });

      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No.*pending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', async () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      expect(screen.getByRole('heading', { name: 'Clip Moderation' })).toBeInTheDocument();
    });

    it('uses checkboxes for item selection', async () => {
      renderWithRouter(
        <ModerationQueueView
          contentType="clip"
          title="Clip Moderation"
          description="Review flagged clips"
        />
      );

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);
      });
    });
  });
});
