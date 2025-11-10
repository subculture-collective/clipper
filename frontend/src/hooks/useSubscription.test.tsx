import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSubscription } from './useSubscription';
import * as subscriptionApi from '../lib/subscription-api';
import * as authHook from './useAuth';
import type { AuthContextValue } from '../contexts/AuthContext';

// Mock only the API calls, not the helper functions
vi.mock('../lib/subscription-api', async () => {
  const actual = await vi.importActual<typeof subscriptionApi>('../lib/subscription-api');
  return {
    ...actual,
    getSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
  };
});
vi.mock('./useAuth');

describe('useSubscription', () => {
  let queryClient: QueryClient;

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
      user: { id: 'user-123', username: 'testuser', role: 'user' },
      isAuthenticated: true,
      isAdmin: false,
      isModerator: false,
      isModeratorOrAdmin: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as AuthContextValue);

    vi.mocked(subscriptionApi.getSubscription).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.subscription).toBe(null);
  });

  it('should return null subscription for unauthenticated user', () => {
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
    } as any);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.subscription).toBe(null);
    expect(result.current.isPro).toBe(false);
    expect(result.current.hasActive).toBe(false);
  });

  it('should return Pro subscription data', async () => {
    const mockSubscription = {
      id: 'sub-123',
      user_id: 'user-123',
      stripe_customer_id: 'cus-123',
      status: 'active' as const,
      tier: 'pro' as const,
      cancel_at_period_end: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { id: 'user-123', username: 'testuser', role: 'user' },
      isAuthenticated: true,
      isAdmin: false,
      isModerator: false,
      isModeratorOrAdmin: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any);

    vi.mocked(subscriptionApi.getSubscription).mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.isPro).toBe(true);
    expect(result.current.hasActive).toBe(true);
  });

  it('should return free tier subscription data', async () => {
    const mockSubscription = {
      id: 'sub-123',
      user_id: 'user-123',
      stripe_customer_id: 'cus-123',
      status: 'inactive' as const,
      tier: 'free' as const,
      cancel_at_period_end: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { id: 'user-123', username: 'testuser', role: 'user' },
      isAuthenticated: true,
      isAdmin: false,
      isModerator: false,
      isModeratorOrAdmin: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any);

    vi.mocked(subscriptionApi.getSubscription).mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.isPro).toBe(false);
    expect(result.current.hasActive).toBe(false);
  });

  it('should return trialing subscription as Pro', async () => {
    const mockSubscription = {
      id: 'sub-123',
      user_id: 'user-123',
      stripe_customer_id: 'cus-123',
      status: 'trialing' as const,
      tier: 'pro' as const,
      trial_start: '2024-01-01T00:00:00Z',
      trial_end: '2024-01-15T00:00:00Z',
      cancel_at_period_end: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { id: 'user-123', username: 'testuser', role: 'user' },
      isAuthenticated: true,
      isAdmin: false,
      isModerator: false,
      isModeratorOrAdmin: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any);

    vi.mocked(subscriptionApi.getSubscription).mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toEqual(mockSubscription);
    expect(result.current.isPro).toBe(true);
    expect(result.current.hasActive).toBe(true);
  });

  it('should handle null subscription (404 response)', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: { id: 'user-123', username: 'testuser', role: 'user' },
      isAuthenticated: true,
      isAdmin: false,
      isModerator: false,
      isModeratorOrAdmin: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    } as any);

    vi.mocked(subscriptionApi.getSubscription).mockResolvedValue(null);

    const { result } = renderHook(() => useSubscription(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscription).toBe(null);
    expect(result.current.isPro).toBe(false);
    expect(result.current.hasActive).toBe(false);
  });
});
