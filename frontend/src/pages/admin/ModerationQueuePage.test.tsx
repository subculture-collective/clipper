import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../context/AuthContext';
import * as submissionApi from '../../lib/submission-api';
import { render, screen, waitFor } from '../../test/test-utils';
import { ModerationQueuePage } from './ModerationQueuePage';

// Mock the API calls
vi.mock('../../lib/submission-api', () => ({
    getPendingSubmissions: vi.fn(),
    approveSubmission: vi.fn(),
    rejectSubmission: vi.fn(),
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

describe('ModerationQueuePage', () => {
    const mockGetPendingSubmissions = vi.mocked(
        submissionApi.getPendingSubmissions
    );
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

    describe('Null Data Handling', () => {
        it('should handle null data from API gracefully', async () => {
            // Mock API to return null data
            mockGetPendingSubmissions.mockResolvedValue({
                success: true,
                data: null as any, // Simulating null response
                meta: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    total_pages: 0,
                },
            });

            render(<ModerationQueuePage />);

            // Wait for loading to complete
            await waitFor(() => {
                expect(
                    screen.queryByText('Moderation Queue')
                ).toBeInTheDocument();
            });

            // Should display empty state
            await waitFor(() => {
                expect(
                    screen.getByText('No pending submissions to review.')
                ).toBeInTheDocument();
            });

            // Should not throw TypeError
            expect(screen.getByText('0')).toBeInTheDocument(); // Total count
        });

        it('should handle empty array data from API', async () => {
            mockGetPendingSubmissions.mockResolvedValue({
                success: true,
                data: [],
                meta: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    total_pages: 0,
                },
            });

            render(<ModerationQueuePage />);

            await waitFor(() => {
                expect(
                    screen.getByText('No pending submissions to review.')
                ).toBeInTheDocument();
            });

            expect(screen.getByText('0')).toBeInTheDocument(); // Total count
        });

        it('should display submissions when data is present', async () => {
            mockGetPendingSubmissions.mockResolvedValue({
                success: true,
                data: [
                    {
                        id: 'sub-1',
                        user_id: 'user-1',
                        twitch_clip_id: 'clip-1',
                        twitch_clip_url: 'https://twitch.tv/clip1',
                        title: 'Test Clip',
                        custom_title: 'My Custom Title',
                        is_nsfw: false,
                        status: 'pending' as const,
                        view_count: 100,
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:00:00Z',
                        user: {
                            id: 'user-1',
                            username: 'testuser',
                            display_name: 'Test User',
                            karma_points: 50,
                            role: 'user',
                        },
                    },
                ],
                meta: {
                    page: 1,
                    limit: 20,
                    total: 1,
                    total_pages: 1,
                },
            });

            render(<ModerationQueuePage />);

            await waitFor(() => {
                expect(screen.getByText('My Custom Title')).toBeInTheDocument();
            });

            expect(screen.getByText('1')).toBeInTheDocument(); // Total count
        });
    });

    describe('Error Handling', () => {
        it('should display error message when API fails', async () => {
            mockGetPendingSubmissions.mockRejectedValue({
                response: {
                    data: {
                        error: 'Failed to fetch submissions',
                    },
                },
            });

            render(<ModerationQueuePage />);

            await waitFor(() => {
                expect(
                    screen.getByText('Failed to fetch submissions')
                ).toBeInTheDocument();
            });
        });
    });
});
