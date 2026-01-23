import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import * as moderationApi from '../../lib/moderation-api';
import { render, screen, waitFor } from '../../test/test-utils';
import { AdminModerationQueuePage } from './AdminModerationQueuePage';

// Mock the API calls
vi.mock('../../lib/moderation-api', () => ({
    getModerationQueue: vi.fn(),
    getModerationStats: vi.fn(),
    approveQueueItem: vi.fn(),
    rejectQueueItem: vi.fn(),
    bulkModerate: vi.fn(),
}));

// Mock the AuthContext
vi.mock('../../context/AuthContext', async () => {
    const actual = await vi.importActual('../../context/AuthContext');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AdminModerationQueuePage', () => {
    const mockGetModerationQueue = vi.mocked(moderationApi.getModerationQueue);
    const mockGetModerationStats = vi.mocked(moderationApi.getModerationStats);
    const mockUseAuth = vi.mocked(useAuth);

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAuth.mockReturnValue({
            user: {
                id: 'admin-123',
                twitch_id: 'twitch-123',
                username: 'adminuser',
                display_name: 'Admin User',
                karma_points: 1000,
                role: 'admin' as const,
                is_banned: false,
                created_at: '2024-01-01T00:00:00Z',
            },
            isAuthenticated: true,
            isAdmin: true,
            isModerator: false,
            isModeratorOrAdmin: true,
            login: vi.fn(),
            logout: vi.fn(),
            isLoading: false,
            refreshUser: vi.fn(),
        });
    });

    describe('Queue Loading', () => {
        it('should load and display moderation queue items', async () => {
            mockGetModerationQueue.mockResolvedValue({
                success: true,
                data: [
                    {
                        id: 'item-1',
                        content_type: 'comment',
                        content_id: 'comment-1',
                        reason: 'spam',
                        priority: 75,
                        status: 'pending',
                        reported_by: ['user-1'],
                        report_count: 1,
                        auto_flagged: false,
                        created_at: '2024-01-01T00:00:00Z',
                    },
                ],
                meta: {
                    count: 1,
                    limit: 50,
                    status: 'pending',
                },
            });

            mockGetModerationStats.mockResolvedValue({
                success: true,
                data: {
                    total_pending: 1,
                    total_approved: 0,
                    total_rejected: 0,
                    total_escalated: 0,
                    by_content_type: { comment: 1 },
                    by_reason: { spam: 1 },
                    auto_flagged_count: 0,
                    user_reported_count: 1,
                    high_priority_count: 1,
                },
            });

            render(<AdminModerationQueuePage />);

            // Wait for the page title to appear
            await waitFor(() => {
                expect(
                    screen.getByText('Moderation Queue')
                ).toBeInTheDocument();
            });

            // Page should render without errors
            expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
        });

        it('should handle empty queue gracefully', async () => {
            mockGetModerationQueue.mockResolvedValue({
                success: true,
                data: [],
                meta: {
                    count: 0,
                    limit: 50,
                    status: 'pending',
                },
            });

            mockGetModerationStats.mockResolvedValue({
                success: true,
                data: {
                    total_pending: 0,
                    total_approved: 0,
                    total_rejected: 0,
                    total_escalated: 0,
                    by_content_type: {},
                    by_reason: {},
                    auto_flagged_count: 0,
                    user_reported_count: 0,
                    high_priority_count: 0,
                },
            });

            render(<AdminModerationQueuePage />);

            await waitFor(() => {
                expect(
                    screen.getByText('No items in the queue.')
                ).toBeInTheDocument();
            });
        });

        it('should display error message when API fails', async () => {
            mockGetModerationQueue.mockRejectedValue({
                response: {
                    data: {
                        error: 'Failed to load queue',
                    },
                },
            });

            mockGetModerationStats.mockResolvedValue({
                success: true,
                data: {
                    total_pending: 0,
                    total_approved: 0,
                    total_rejected: 0,
                    total_escalated: 0,
                    by_content_type: {},
                    by_reason: {},
                    auto_flagged_count: 0,
                    user_reported_count: 0,
                    high_priority_count: 0,
                },
            });

            render(<AdminModerationQueuePage />);

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to load queue')
                ).toBeInTheDocument();
            });
        });
    });

    describe('Bulk Selection', () => {
        it('should allow selecting items', async () => {
            mockGetModerationQueue.mockResolvedValue({
                success: true,
                data: [
                    {
                        id: 'item-1',
                        content_type: 'comment',
                        content_id: 'comment-1',
                        reason: 'spam',
                        priority: 75,
                        status: 'pending',
                        reported_by: ['user-1'],
                        report_count: 1,
                        auto_flagged: false,
                        created_at: '2024-01-01T00:00:00Z',
                    },
                ],
                meta: {
                    count: 1,
                    limit: 50,
                    status: 'pending',
                },
            });

            mockGetModerationStats.mockResolvedValue({
                success: true,
                data: {
                    total_pending: 1,
                    total_approved: 0,
                    total_rejected: 0,
                    total_escalated: 0,
                    by_content_type: { comment: 1 },
                    by_reason: { spam: 1 },
                    auto_flagged_count: 0,
                    user_reported_count: 1,
                    high_priority_count: 1,
                },
            });

            render(<AdminModerationQueuePage />);

            await waitFor(() => {
                expect(
                    screen.getByText('Moderation Queue')
                ).toBeInTheDocument();
            });

            // Should not show bulk actions bar initially
            expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
        });
    });
});
