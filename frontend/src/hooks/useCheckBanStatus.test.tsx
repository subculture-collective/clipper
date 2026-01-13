import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCheckBanStatus } from './useCheckBanStatus';
import * as moderationApi from '../lib/moderation-api';
import * as authHook from './useAuth';
import type { User } from '../lib/auth-api';

// Mock the API and auth modules
vi.mock('../lib/moderation-api', async () => {
    const actual = await vi.importActual<typeof moderationApi>('../lib/moderation-api');
    return {
        ...actual,
        checkBanStatus: vi.fn(),
    };
});
vi.mock('./useAuth');

describe('useCheckBanStatus', () => {
    let queryClient: QueryClient;

    const mockUser: User = {
        id: 'user-123',
        username: 'testuser',
        twitch_id: 'twitch-123',
        display_name: 'TestUser',
        role: 'user',
        karma_points: 0,
        is_banned: false,
        created_at: new Date().toISOString(),
    };

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                },
            },
        });
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it('should return loading state initially', () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        vi.mocked(moderationApi.checkBanStatus).mockImplementation(() =>
            new Promise(() => {}) // Never resolves
        );

        const { result } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.isBanned).toBe(false);
    });

    it('should return not banned when user is not banned', async () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const mockBanStatus = {
            isBanned: false,
        };

        vi.mocked(moderationApi.checkBanStatus).mockResolvedValue(mockBanStatus);

        const { result } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isBanned).toBe(false);
        expect(result.current.banReason).toBeUndefined();
        expect(result.current.bannedAt).toBeUndefined();
        expect(result.current.expiresAt).toBeUndefined();
        expect(result.current.error).toBeUndefined();
    });

    it('should return ban details when user is banned', async () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const mockBanStatus = {
            isBanned: true,
            banReason: 'Violation of community guidelines',
            bannedAt: '2024-01-10T00:00:00Z',
            expiresAt: null,
        };

        vi.mocked(moderationApi.checkBanStatus).mockResolvedValue(mockBanStatus);

        const { result } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isBanned).toBe(true);
        expect(result.current.banReason).toBe('Violation of community guidelines');
        expect(result.current.bannedAt).toBe('2024-01-10T00:00:00Z');
        expect(result.current.expiresAt).toBe(null);
        expect(result.current.error).toBeUndefined();
    });

    it('should return ban with expiry date', async () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const mockBanStatus = {
            isBanned: true,
            banReason: 'Temporary ban for spam',
            bannedAt: '2024-01-10T00:00:00Z',
            expiresAt: '2024-01-17T00:00:00Z',
        };

        vi.mocked(moderationApi.checkBanStatus).mockResolvedValue(mockBanStatus);

        const { result } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isBanned).toBe(true);
        expect(result.current.banReason).toBe('Temporary ban for spam');
        expect(result.current.expiresAt).toBe('2024-01-17T00:00:00Z');
    });

    it('should handle error state', async () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const mockError = new Error('Failed to check ban status');
        vi.mocked(moderationApi.checkBanStatus).mockRejectedValue(mockError);

        const { result } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.isBanned).toBe(false);
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Failed to check ban status');
    });

    it('should not fetch when user is not authenticated', () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
            user: null,
            isAuthenticated: false,
            isAdmin: false,
            isModerator: false,
            isModeratorOrAdmin: false,
            isLoading: false,
            login: vi.fn(),
            logout: vi.fn(),
            refreshUser: vi.fn(),
        });

        const { result } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isBanned).toBe(false);
        expect(moderationApi.checkBanStatus).not.toHaveBeenCalled();
    });

    it('should not fetch when channelId is empty', () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const { result } = renderHook(() => useCheckBanStatus(''), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.isBanned).toBe(false);
        expect(moderationApi.checkBanStatus).not.toHaveBeenCalled();
    });

    it('should cache results and not refetch on re-render', async () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const mockBanStatus = {
            isBanned: true,
            banReason: 'Test ban',
            bannedAt: '2024-01-10T00:00:00Z',
            expiresAt: null,
        };

        vi.mocked(moderationApi.checkBanStatus).mockResolvedValue(mockBanStatus);

        const { result, rerender } = renderHook(() => useCheckBanStatus('channel-123'), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(moderationApi.checkBanStatus).toHaveBeenCalledTimes(1);
        expect(result.current.isBanned).toBe(true);

        // Re-render the hook
        rerender();

        // Should not trigger another API call due to caching
        expect(moderationApi.checkBanStatus).toHaveBeenCalledTimes(1);
        expect(result.current.isBanned).toBe(true);
    });

    it('should handle different channelIds separately', async () => {
        vi.mocked(authHook.useAuth).mockReturnValue({
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

        const mockBanStatus1 = {
            isBanned: true,
            banReason: 'Banned from channel 1',
        };

        const mockBanStatus2 = {
            isBanned: false,
        };

        vi.mocked(moderationApi.checkBanStatus)
            .mockResolvedValueOnce(mockBanStatus1)
            .mockResolvedValueOnce(mockBanStatus2);

        // Render hook with first channel
        const { result: result1 } = renderHook(() => useCheckBanStatus('channel-1'), { wrapper });
        await waitFor(() => expect(result1.current.isLoading).toBe(false));

        // Render hook with second channel
        const { result: result2 } = renderHook(() => useCheckBanStatus('channel-2'), { wrapper });
        await waitFor(() => expect(result2.current.isLoading).toBe(false));

        expect(result1.current.isBanned).toBe(true);
        expect(result1.current.banReason).toBe('Banned from channel 1');
        expect(result2.current.isBanned).toBe(false);
        expect(result2.current.banReason).toBeUndefined();
    });
});
