import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { SubmissionConfirmation } from './SubmissionConfirmation';
import type { ClipSubmission } from '@/types/submission';

describe('SubmissionConfirmation', () => {
    const mockSubmission: ClipSubmission = {
        id: 'clip-123',
        user_id: 'user-456',
        twitch_clip_id: 'twitch-clip-789',
        twitch_clip_url: 'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
        title: 'Amazing Gaming Moment',
        custom_title: 'Epic Clutch Victory',
        tags: ['clutch', 'gaming', 'epic'],
        is_nsfw: false,
        status: 'pending',
        created_at: '2025-01-15T12:00:00Z',
        updated_at: '2025-01-15T12:00:00Z',
        broadcaster_name: 'TestStreamer',
        creator_name: 'ClipCreator',
        view_count: 0,
    };

    const mockOnSubmitAnother = vi.fn();

    it('renders success icon and message', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(
            screen.getByText('Submission Successful!')
        ).toBeInTheDocument();
        expect(
            screen.getByText('Your clip has been submitted for review')
        ).toBeInTheDocument();
    });

    it('displays submission title', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Epic Clutch Victory')).toBeInTheDocument();
    });

    it('displays fallback to original title if custom title is not provided', () => {
        const submissionWithoutCustomTitle = {
            ...mockSubmission,
            custom_title: undefined,
        };

        render(
            <SubmissionConfirmation
                submission={submissionWithoutCustomTitle}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Amazing Gaming Moment')).toBeInTheDocument();
    });

    it('displays "Untitled" if no title is provided', () => {
        const submissionWithoutTitle = {
            ...mockSubmission,
            title: undefined,
            custom_title: undefined,
        };

        render(
            <SubmissionConfirmation
                submission={submissionWithoutTitle}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('displays broadcaster name', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Streamer')).toBeInTheDocument();
        expect(screen.getByText('TestStreamer')).toBeInTheDocument();
    });

    it('displays creator name when broadcaster name is not available', () => {
        const submissionWithoutBroadcaster = {
            ...mockSubmission,
            broadcaster_name: undefined,
        };

        render(
            <SubmissionConfirmation
                submission={submissionWithoutBroadcaster}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('ClipCreator')).toBeInTheDocument();
    });

    it('displays tags when provided', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Tags')).toBeInTheDocument();
        expect(screen.getByText('clutch')).toBeInTheDocument();
        expect(screen.getByText('gaming')).toBeInTheDocument();
        expect(screen.getByText('epic')).toBeInTheDocument();
    });

    it('does not display tags section when no tags are provided', () => {
        const submissionWithoutTags = {
            ...mockSubmission,
            tags: undefined,
        };

        render(
            <SubmissionConfirmation
                submission={submissionWithoutTags}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('displays submitted date', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Submitted')).toBeInTheDocument();
        // Date formatting will vary, just check the label exists
        expect(screen.getByText(/Jan 15, 2025/i)).toBeInTheDocument();
    });

    it('displays pending status with warning badge', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Status')).toBeInTheDocument();
        const statusBadge = screen.getByText('pending');
        expect(statusBadge).toBeInTheDocument();
    });

    it('displays approved status with success badge', () => {
        const approvedSubmission = {
            ...mockSubmission,
            status: 'approved' as const,
        };

        render(
            <SubmissionConfirmation
                submission={approvedSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        const statusBadge = screen.getByText('approved');
        expect(statusBadge).toBeInTheDocument();
    });

    it('shows auto-approval message and clip link when status is approved', () => {
        const approvedSubmission = {
            ...mockSubmission,
            status: 'approved' as const,
        };

        render(
            <SubmissionConfirmation
                submission={approvedSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.getByText('Auto-approved!')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Your clip has been automatically approved and is now live on the platform.'
            )
        ).toBeInTheDocument();

        const clipLink = screen.getByText('View your clip →');
        expect(clipLink).toBeInTheDocument();
        expect(clipLink).toHaveAttribute('href', '/clip/clip-123');
    });

    it('does not show auto-approval message when status is pending', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        expect(screen.queryByText('Auto-approved!')).not.toBeInTheDocument();
    });

    it('has "View My Submissions" link with correct href', () => {
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        const submissionsLink = screen.getByText('View My Submissions')
            .closest('a');
        expect(submissionsLink).toHaveAttribute('href', '/submissions');
    });

    it('calls onSubmitAnother when "Submit Another Clip" is clicked', async () => {
        const user = userEvent.setup();
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        const submitAnotherButton = screen.getByText('Submit Another Clip');
        await user.click(submitAnotherButton);

        expect(mockOnSubmitAnother).toHaveBeenCalledTimes(1);
    });

    it('renders responsive layout with mobile and desktop classes', () => {
        const { container } = render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        // Check for responsive classes
        const buttonContainer = container.querySelector('.sm\\:flex-row');
        expect(buttonContainer).toBeInTheDocument();
    });

    it('displays all submission information within 2 seconds', () => {
        const startTime = performance.now();
        
        render(
            <SubmissionConfirmation
                submission={mockSubmission}
                onSubmitAnother={mockOnSubmitAnother}
            />
        );

        const endTime = performance.now();
        const renderTime = endTime - startTime;

        // Check that all essential information is rendered
        expect(
            screen.getByText('Submission Successful!')
        ).toBeInTheDocument();
        expect(screen.getByText('Epic Clutch Victory')).toBeInTheDocument();
        expect(screen.getByText('TestStreamer')).toBeInTheDocument();

        // Ensure rendering completes well within 2 seconds
        expect(renderTime).toBeLessThan(2000);
    });
});
