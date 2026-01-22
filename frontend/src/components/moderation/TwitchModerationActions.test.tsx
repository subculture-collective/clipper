import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwitchModerationActions } from './TwitchModerationActions';
import * as moderationApi from '../../lib/moderation-api';
import * as authContext from '../../context/AuthContext';

// Mock the API
vi.mock('../../lib/moderation-api');
vi.mock('../../context/AuthContext', async () => {
    const actual = await vi.importActual('../../context/AuthContext');
    return {
        ...actual,
        useAuth: vi.fn(),
    };
});

import { ToastProvider } from '../../context/ToastContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUser = {
    id: 'user-123',
    twitch_id: 'twitch-123',
    username: 'testuser',
    display_name: 'Test User',
    role: 'user' as const,
    karma_points: 0,
    is_banned: false,
    created_at: '2024-01-01T00:00:00Z',
};

// Wrapper component that provides ToastContext
function TestWrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient();
    return (
        <QueryClientProvider client={client}>
            <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
    );
}

describe('TwitchModerationActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Permission Gating', () => {
        it('should not render when user is not broadcaster or Twitch moderator', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={false}
                    isTwitchModerator={false}
                />,
                { wrapper: TestWrapper },
            );

            // Should not render ban/unban buttons
            expect(
                screen.queryByRole('button', { name: /ban.*on twitch/i }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: /unban.*on twitch/i }),
            ).not.toBeInTheDocument();
        });

        it('should not render for site moderators', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: { ...mockUser, role: 'moderator' },
                isAuthenticated: true,
                isAdmin: false,
                isModerator: true,
                isModeratorOrAdmin: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={false}
                    isTwitchModerator={false}
                />,
                { wrapper: TestWrapper },
            );

            // Should not render ban/unban buttons
            expect(
                screen.queryByRole('button', { name: /ban.*on twitch/i }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole('button', { name: /unban.*on twitch/i }),
            ).not.toBeInTheDocument();
        });

        it('should render ban button when site moderator is also broadcaster', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: { ...mockUser, role: 'moderator' },
                isAuthenticated: true,
                isAdmin: false,
                isModerator: true,
                isModeratorOrAdmin: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                    isTwitchModerator={false}
                />,
                { wrapper: TestWrapper },
            );

            expect(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            ).toBeInTheDocument();
        });

        it('should render ban button when site moderator is also Twitch moderator', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: { ...mockUser, role: 'moderator' },
                isAuthenticated: true,
                isAdmin: false,
                isModerator: true,
                isModeratorOrAdmin: true,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={false}
                    isTwitchModerator={true}
                />,
                { wrapper: TestWrapper },
            );

            expect(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            ).toBeInTheDocument();
        });

        it('should render ban button when user is broadcaster', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                    isTwitchModerator={false}
                />,
                { wrapper: TestWrapper },
            );

            expect(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            ).toBeInTheDocument();
        });

        it('should render ban button when user is Twitch moderator', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={false}
                    isTwitchModerator={true}
                />,
                { wrapper: TestWrapper },
            );

            expect(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            ).toBeInTheDocument();
        });

        it('should render unban button when user is banned', () => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBanned={true}
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            expect(
                screen.getByRole('button', {
                    name: /unban targetuser on twitch/i,
                }),
            ).toBeInTheDocument();
        });
    });

    describe('Ban Functionality', () => {
        beforeEach(() => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });
        });

        it('should open ban modal when ban button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText(/ban user on twitch/i)).toBeInTheDocument();
        });

        it('should successfully ban user with permanent ban', async () => {
            const user = userEvent.setup();
            const onSuccess = vi.fn();
            const mockBanResponse = {
                success: true,
                message: 'User banned successfully',
                broadcasterID: 'broadcaster-123',
                userID: 'target-456',
            };

            vi.mocked(moderationApi.banUserOnTwitch).mockResolvedValue(
                mockBanResponse,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                    onSuccess={onSuccess}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );

            const modal = screen.getByRole('dialog');
            expect(
                within(modal).getByLabelText(/permanent ban/i),
            ).toBeChecked();

            await user.click(
                within(modal).getByRole('button', { name: /ban user/i }),
            );

            await waitFor(() => {
                expect(moderationApi.banUserOnTwitch).toHaveBeenCalledWith({
                    broadcasterID: 'broadcaster-123',
                    userID: 'target-456',
                    reason: undefined,
                    duration: undefined,
                });
            });

            expect(onSuccess).toHaveBeenCalled();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should successfully ban user with timeout', async () => {
            const user = userEvent.setup();
            const mockBanResponse = {
                success: true,
                message: 'User timed out successfully',
                broadcasterID: 'broadcaster-123',
                userID: 'target-456',
            };

            vi.mocked(moderationApi.banUserOnTwitch).mockResolvedValue(
                mockBanResponse,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );

            const modal = screen.getByRole('dialog');
            await user.click(
                within(modal).getByLabelText(/timeout \(temporary\)/i),
            );

            // Click on "Custom duration" button to reveal the input
            const customButton = within(modal).getByRole('button', {
                name: /custom duration/i,
            });
            await user.click(customButton);

            const durationInput =
                within(modal).getByLabelText(/duration \(seconds\)/i);
            await user.clear(durationInput);
            await user.type(durationInput, '300');

            await user.click(
                within(modal).getByRole('button', { name: /timeout user/i }),
            );

            await waitFor(() => {
                expect(moderationApi.banUserOnTwitch).toHaveBeenCalledWith({
                    broadcasterID: 'broadcaster-123',
                    userID: 'target-456',
                    reason: undefined,
                    duration: 300,
                });
            });
        });

        it('should include reason when provided', async () => {
            const user = userEvent.setup();
            const mockBanResponse = {
                success: true,
                message: 'User banned successfully',
                broadcasterID: 'broadcaster-123',
                userID: 'target-456',
            };

            vi.mocked(moderationApi.banUserOnTwitch).mockResolvedValue(
                mockBanResponse,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );

            const modal = screen.getByRole('dialog');
            const reasonInput =
                within(modal).getByLabelText(/reason \(optional\)/i);
            await user.type(reasonInput, 'Spam in chat');

            await user.click(
                within(modal).getByRole('button', { name: /ban user/i }),
            );

            await waitFor(() => {
                expect(moderationApi.banUserOnTwitch).toHaveBeenCalledWith({
                    broadcasterID: 'broadcaster-123',
                    userID: 'target-456',
                    reason: 'Spam in chat',
                    duration: undefined,
                });
            });
        });
    });

    describe('Unban Functionality', () => {
        beforeEach(() => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });
        });

        it('should open unban modal when unban button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBanned={true}
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /unban targetuser on twitch/i,
                }),
            );

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(
                screen.getByText(/unban user on twitch/i),
            ).toBeInTheDocument();
        });

        it('should successfully unban user', async () => {
            const user = userEvent.setup();
            const onSuccess = vi.fn();
            const mockUnbanResponse = {
                success: true,
                message: 'User unbanned successfully',
                broadcasterID: 'broadcaster-123',
                userID: 'target-456',
            };

            vi.mocked(moderationApi.unbanUserOnTwitch).mockResolvedValue(
                mockUnbanResponse,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBanned={true}
                    isBroadcaster={true}
                    onSuccess={onSuccess}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /unban targetuser on twitch/i,
                }),
            );

            const modal = screen.getByRole('dialog');
            await user.click(
                within(modal).getByRole('button', { name: /unban user/i }),
            );

            await waitFor(() => {
                expect(moderationApi.unbanUserOnTwitch).toHaveBeenCalledWith({
                    broadcasterID: 'broadcaster-123',
                    userID: 'target-456',
                });
            });

            expect(onSuccess).toHaveBeenCalled();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });
        });

        it('should display error for SITE_MODERATORS_READ_ONLY', async () => {
            const user = userEvent.setup();
            const mockError = {
                response: {
                    data: {
                        error: 'Site moderators are read-only',
                        code: 'SITE_MODERATORS_READ_ONLY',
                        detail: 'You must be the broadcaster or a Twitch-recognized moderator',
                    },
                },
            };

            vi.mocked(moderationApi.banUserOnTwitch).mockRejectedValue(
                mockError,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            const modal = screen.getByRole('dialog');
            await user.click(
                within(modal).getByRole('button', { name: /ban user/i }),
            );

            await waitFor(() => {
                expect(
                    screen.getByTestId('twitch-action-error-alert'),
                ).toHaveTextContent(
                    /site moderators cannot perform twitch actions/i,
                );
            });
        });

        it('should display error for INSUFFICIENT_SCOPES', async () => {
            const user = userEvent.setup();
            const mockError = {
                response: {
                    data: {
                        error: 'Insufficient scopes',
                        code: 'INSUFFICIENT_SCOPES',
                        detail: 'Missing required OAuth scopes',
                    },
                },
            };

            vi.mocked(moderationApi.banUserOnTwitch).mockRejectedValue(
                mockError,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            const modal = screen.getByRole('dialog');
            await user.click(
                within(modal).getByRole('button', { name: /ban user/i }),
            );

            await waitFor(() => {
                expect(
                    screen.getByTestId('twitch-action-error-alert'),
                ).toHaveTextContent(
                    /do not have the required twitch permissions/i,
                );
            });
        });

        it('should display error for RATE_LIMIT_EXCEEDED', async () => {
            const user = userEvent.setup();
            const mockError = {
                response: {
                    data: {
                        error: 'Rate limit exceeded',
                        code: 'RATE_LIMIT_EXCEEDED',
                        detail: 'Too many requests',
                    },
                },
            };

            vi.mocked(moderationApi.banUserOnTwitch).mockRejectedValue(
                mockError,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            const modal = screen.getByRole('dialog');
            await user.click(
                within(modal).getByRole('button', { name: /ban user/i }),
            );

            await waitFor(() => {
                expect(
                    screen.getByTestId('twitch-action-error-alert'),
                ).toHaveTextContent(/rate limit exceeded/i);
            });
        });

        it('should display generic error for unknown errors', async () => {
            const user = userEvent.setup();
            const mockError = new Error('Network error');

            vi.mocked(moderationApi.banUserOnTwitch).mockRejectedValue(
                mockError,
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            const modal = screen.getByRole('dialog');
            await user.click(
                within(modal).getByRole('button', { name: /ban user/i }),
            );

            await waitFor(() => {
                expect(
                    screen.getByTestId('twitch-action-error-alert'),
                ).toHaveTextContent(/network error/i);
            });
        });
    });

    describe('Modal Behavior', () => {
        beforeEach(() => {
            vi.mocked(authContext.useAuth).mockReturnValue({
                user: mockUser,
                isAuthenticated: true,
                isAdmin: false,
                isModerator: false,
                isModeratorOrAdmin: false,
                isLoading: false,
                login: vi.fn(),
                logout: vi.fn(),
                refreshUser: vi.fn(),
            });
        });

        it('should close ban modal on cancel', async () => {
            const user = userEvent.setup();

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            expect(screen.getByRole('dialog')).toBeInTheDocument();

            await user.click(screen.getByRole('button', { name: /cancel/i }));
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should reset form when reopening ban modal', async () => {
            const user = userEvent.setup();

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            // Open modal and fill form
            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            let modal = screen.getByRole('dialog');

            const reasonInput =
                within(modal).getByLabelText(/reason \(optional\)/i);
            await user.type(reasonInput, 'Test reason');

            // Close modal
            await user.click(
                within(modal).getByRole('button', { name: /cancel/i }),
            );

            // Reopen modal
            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            modal = screen.getByRole('dialog');

            // Check form is reset
            expect(
                within(modal).getByLabelText(/reason \(optional\)/i),
            ).toHaveValue('');
        });

        it('should prevent closing modal while loading', async () => {
            const user = userEvent.setup();
            vi.mocked(moderationApi.banUserOnTwitch).mockImplementation(
                () => new Promise(() => {}), // Never resolves
            );

            render(
                <TwitchModerationActions
                    broadcasterID='broadcaster-123'
                    userID='target-456'
                    username='targetuser'
                    isBroadcaster={true}
                />,
                { wrapper: TestWrapper },
            );

            await user.click(
                screen.getByRole('button', {
                    name: /ban targetuser on twitch/i,
                }),
            );
            const modal = screen.getByRole('dialog');

            const banButton = within(modal).getByRole('button', {
                name: /ban user/i,
            });
            await user.click(banButton);

            // Modal should still be open
            expect(screen.getByRole('dialog')).toBeInTheDocument();

            // Cancel button should be disabled
            expect(
                within(modal).getByRole('button', { name: /cancel/i }),
            ).toBeDisabled();
        });
    });
});
