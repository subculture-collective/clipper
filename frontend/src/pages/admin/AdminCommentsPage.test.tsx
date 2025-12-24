import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import * as moderationApi from '../../lib/moderation-api';
import { render, screen, waitFor } from '../../test/test-utils';
import { AdminCommentsPage } from './AdminCommentsPage';

// Mock the API calls
vi.mock('../../lib/moderation-api', () => ({
    getModerationQueue: vi.fn(),
    getModerationStats: vi.fn(),
    approveQueueItem: vi.fn(),
    rejectQueueItem: vi.fn(),
    bulkModerate: vi.fn(),
}));

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AdminCommentsPage', () => {
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

    describe('Comment Queue Loading', () => {
        it('should load and display comment moderation queue items', async () => {
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

            render(<AdminCommentsPage />);

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
            });

            // Check that the page title is displayed
            expect(
                screen.getByText('Comment Moderation Queue')
            ).toBeInTheDocument();

            // Check that the item is displayed
            expect(screen.getByText('comment-1')).toBeInTheDocument();
            expect(screen.getByText('spam')).toBeInTheDocument();
        });

        it('should display empty state when no comments are in the queue', async () => {
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

            render(<AdminCommentsPage />);

            await waitFor(() => {
                expect(
                    screen.getByText(/no comments in the moderation queue/i)
                ).toBeInTheDocument();
            });
        });

        it('should redirect non-admin users', () => {
            mockUseAuth.mockReturnValue({
                user: null,
                isAuthenticated: false,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                login: vi.fn(),
                logout: vi.fn(),
                isLoading: false,
                refreshUser: vi.fn(),
            });

            render(<AdminCommentsPage />);

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    describe('Accessibility', () => {
        it('should have accessible checkbox labels', async () => {
            mockGetModerationQueue.mockResolvedValue({
                success: true,
                data: [
                    {
                        id: 'item-1',
                        content_type: 'comment',
                        content_id: 'comment-1',
                        reason: 'harassment',
                        priority: 50,
                        status: 'pending',
                        reported_by: [],
                        report_count: 0,
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
                    by_reason: { harassment: 1 },
                    auto_flagged_count: 0,
                    user_reported_count: 0,
                    high_priority_count: 0,
                },
            });

            render(<AdminCommentsPage />);

            await waitFor(() => {
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
            });

            // Check for select all checkbox label
            const selectAllCheckbox = screen.getByLabelText(
                /select all comments for bulk moderation/i
            );
            expect(selectAllCheckbox).toBeInTheDocument();

            // Check for individual item checkbox label
            const itemCheckbox = screen.getByLabelText(
                /select comment comment-1 for bulk moderation/i
            );
            expect(itemCheckbox).toBeInTheDocument();
        });
    });
});
