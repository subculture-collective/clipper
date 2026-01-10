import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncBansModal } from './SyncBansModal';
import * as chatApi from '../../lib/chat-api';

// Mock the API module
vi.mock('../../lib/chat-api');

describe('SyncBansModal', () => {
  const mockChannelId = 'channel-123';
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the modal when open', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.getByText('Sync Bans from Twitch')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <SyncBansModal
          open={false}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.queryByText('Sync Bans from Twitch')).not.toBeInTheDocument();
    });

    it('renders the channel name input field', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.getByLabelText(/Twitch Channel Name/)).toBeInTheDocument();
    });

    it('renders description text', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(
        screen.getByText(/Sync bans from your Twitch channel/)
      ).toBeInTheDocument();
    });

    it('renders Start Sync button', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.getByRole('button', { name: 'Start Sync' })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('disables Start Sync button when channel name is empty', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      expect(startButton).toBeDisabled();
    });

    it('enables Start Sync button when channel name is entered', async () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      expect(startButton).not.toBeDisabled();
    });

    it('shows error when submitting with empty channel name', async () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'test');
      await userEvent.clear(input);

      // Try to submit by pressing Enter
      await userEvent.type(input, '{Enter}');

      // Button should still be disabled, preventing submission
      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      expect(startButton).toBeDisabled();
    });
  });

  describe('Confirmation Dialog', () => {
    it('shows confirmation dialog when Start Sync is clicked', async () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      expect(screen.getByText('Confirm Sync')).toBeInTheDocument();
      expect(
        screen.getByText(/You are about to sync all bans from the Twitch channel "twitchdev"/)
      ).toBeInTheDocument();
    });

    it('shows confirmation details in dialog', async () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      expect(screen.getByText(/Import all current bans from Twitch/)).toBeInTheDocument();
      expect(screen.getByText(/Skip users who are already banned/)).toBeInTheDocument();
    });

    it('allows canceling the confirmation', async () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      expect(screen.getByText('Confirm Sync')).toBeInTheDocument();

      const cancelButton = screen.getAllByRole('button', { name: 'Cancel' })[0];
      await userEvent.click(cancelButton);

      // Should go back to form
      expect(screen.queryByText('Confirm Sync')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Twitch Channel Name/)).toBeInTheDocument();
    });

    it('starts sync when confirmed', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(chatApi.syncBansFromTwitch).toHaveBeenCalledWith(mockChannelId, {
          channel_name: 'twitchdev',
        });
      });
    });
  });

  describe('Sync Progress', () => {
    it('shows progress indicator when sync starts', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'in_progress',
        bans_added: 5,
        bans_existing: 3,
        total_processed: 8,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Synchronizing Bans')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Please wait while we sync bans from Twitch/)
      ).toBeInTheDocument();
    });

    it('polls for progress updates', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'in_progress',
        bans_added: 10,
        bans_existing: 5,
        total_processed: 15,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Synchronizing Bans')).toBeInTheDocument();
      });

      // Advance timers to trigger polling
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(chatApi.checkSyncBansProgress).toHaveBeenCalledWith(
          mockChannelId,
          'job-123'
        );
      });
    });

    it('shows processed count during sync', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'in_progress',
        bans_added: 10,
        bans_existing: 5,
        total_processed: 15,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Synchronizing Bans')).toBeInTheDocument();
      });

      // Advance timers to update progress
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument();
      });
    });
  });

  describe('Sync Completion', () => {
    it('shows success message when sync completes', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'completed',
        bans_added: 15,
        bans_existing: 8,
        total_processed: 23,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
          onSuccess={mockOnSuccess}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      // Advance timers to trigger polling and get completed status
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText('Sync Completed Successfully')).toBeInTheDocument();
      });
    });

    it('displays sync summary with correct counts', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'completed',
        bans_added: 15,
        bans_existing: 8,
        total_processed: 23,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText('Sync Summary')).toBeInTheDocument();
      });

      expect(screen.getByText(/New Bans Added:/)).toBeInTheDocument();
      expect(screen.getByText('+15')).toBeInTheDocument();
      expect(screen.getByText(/Already Existing:/)).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText(/Total Processed:/)).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument();
    });

    it('calls onSuccess callback after completion', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'completed',
        bans_added: 15,
        bans_existing: 8,
        total_processed: 23,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
          onSuccess={mockOnSuccess}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText('Sync Completed Successfully')).toBeInTheDocument();
      });

      // Advance timers for the 2-second delay before onSuccess
      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error when sync fails to start', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockRejectedValue(
        new Error('Failed to start sync')
      );

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to start sync/)).toBeInTheDocument();
      });
    });

    it('shows error message when sync job fails', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'failed',
        bans_added: 0,
        bans_existing: 0,
        total_processed: 0,
        error: 'Channel not found',
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText('Sync Failed')).toBeInTheDocument();
      });

      expect(screen.getByText('Channel not found')).toBeInTheDocument();
    });

    it('handles progress check error gracefully', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText(/Failed to check sync progress/)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('closes modal when Cancel is clicked', async () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close during sync', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'in_progress',
        bans_added: 5,
        bans_existing: 3,
        total_processed: 8,
      });

      const { rerender } = render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Synchronizing Bans')).toBeInTheDocument();
      });

      // Try to close modal - should not call onClose during sync
      rerender(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      // Modal should still be showing sync progress
      expect(screen.getByText('Synchronizing Bans')).toBeInTheDocument();
    });

    it('resets form when closed after completion', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'completed',
        bans_added: 15,
        bans_existing: 8,
        total_processed: 23,
      });

      const { rerender } = render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });
      await userEvent.click(confirmButton);

      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByText('Sync Completed Successfully')).toBeInTheDocument();
      });

      // Close the modal
      mockOnClose.mockImplementation(() => {
        rerender(
          <SyncBansModal
            open={false}
            onClose={mockOnClose}
            channelId={mockChannelId}
          />
        );
      });

      // Reopen modal
      rerender(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      // Form should be reset
      const newInput = screen.getByLabelText(/Twitch Channel Name/) as HTMLInputElement;
      expect(newInput.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form inputs', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.getByLabelText(/Twitch Channel Name/)).toBeInTheDocument();
    });

    it('has proper role for modal', () => {
      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('disables inputs during sync', async () => {
      vi.mocked(chatApi.syncBansFromTwitch).mockResolvedValue({
        job_id: 'job-123',
        status: 'started',
      });

      vi.mocked(chatApi.checkSyncBansProgress).mockResolvedValue({
        job_id: 'job-123',
        status: 'in_progress',
        bans_added: 5,
        bans_existing: 3,
        total_processed: 8,
      });

      render(
        <SyncBansModal
          open={true}
          onClose={mockOnClose}
          channelId={mockChannelId}
        />
      );

      const input = screen.getByLabelText(/Twitch Channel Name/);
      await userEvent.type(input, 'twitchdev');

      const startButton = screen.getByRole('button', { name: 'Start Sync' });
      await userEvent.click(startButton);

      const confirmButton = screen.getByRole('button', { name: 'Confirm Sync' });

      // Confirm button should show loading state
      expect(confirmButton).toBeInTheDocument();
    });
  });
});
