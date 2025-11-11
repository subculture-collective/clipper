import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProFeature } from './ProFeature';
import * as subscriptionHook from '../../hooks/useSubscription';
import * as authHook from '../../hooks/useAuth';

// Mock the hooks
vi.mock('../../hooks/useSubscription');
vi.mock('../../hooks/useAuth');

describe('ProFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth to return a basic user
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: {
        id: 'user-123',
        username: 'testuser',
        twitch_id: 'twitch-123',
        display_name: 'TestUser',
        role: 'user',
        karma_points: 0,
        is_banned: false,
        created_at: new Date().toISOString(),
      },
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );

  it('should show loading state while subscription is loading', () => {
    vi.mocked(subscriptionHook.useSubscription).mockReturnValue({
      subscription: null,
      isLoading: true,
      isError: false,
      isPro: false,
      hasActive: false,
      refetch: vi.fn(),
    });

    render(
      <ProFeature featureName="Test Feature">
        <div>Pro Content</div>
      </ProFeature>,
      { wrapper }
    );

    // Should not show Pro Content while loading
    expect(screen.queryByText('Pro Content')).not.toBeInTheDocument();
    // Should show loading UI (check for the flex items-center class)
    const loadingDiv = document.querySelector('.flex.items-center.justify-center.p-4');
    expect(loadingDiv).toBeInTheDocument();
  });

  it('should show children for Pro users', () => {
    vi.mocked(subscriptionHook.useSubscription).mockReturnValue({
      subscription: {
        id: 'sub-123',
        user_id: 'user-123',
        stripe_customer_id: 'cus-123',
        status: 'active',
        tier: 'pro',
        cancel_at_period_end: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      isLoading: false,
      isError: false,
      isPro: true,
      hasActive: true,
      refetch: vi.fn(),
    });

    render(
      <ProFeature featureName="Test Feature">
        <div>Pro Content</div>
      </ProFeature>,
      { wrapper }
    );

    expect(screen.getByText('Pro Content')).toBeInTheDocument();
    expect(screen.queryByText('Pro Feature')).not.toBeInTheDocument();
  });

  it('should show upgrade prompt for non-Pro users', () => {
    vi.mocked(subscriptionHook.useSubscription).mockReturnValue({
      subscription: null,
      isLoading: false,
      isError: false,
      isPro: false,
      hasActive: false,
      refetch: vi.fn(),
    });

    render(
      <ProFeature featureName="Collections">
        <div>Pro Content</div>
      </ProFeature>,
      { wrapper }
    );

    expect(screen.queryByText('Pro Content')).not.toBeInTheDocument();
    expect(screen.getByText('Pro Feature')).toBeInTheDocument();
    expect(screen.getByText(/Collections requires an active Pro subscription/)).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('should show custom fallback when provided', () => {
    vi.mocked(subscriptionHook.useSubscription).mockReturnValue({
      subscription: null,
      isLoading: false,
      isError: false,
      isPro: false,
      hasActive: false,
      refetch: vi.fn(),
    });

    render(
      <ProFeature
        featureName="Test Feature"
        fallback={<div>Custom Fallback</div>}
      >
        <div>Pro Content</div>
      </ProFeature>,
      { wrapper }
    );

    expect(screen.queryByText('Pro Content')).not.toBeInTheDocument();
    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Pro Feature')).not.toBeInTheDocument();
  });

  it('should not show upgrade prompt when disabled', () => {
    vi.mocked(subscriptionHook.useSubscription).mockReturnValue({
      subscription: null,
      isLoading: false,
      isError: false,
      isPro: false,
      hasActive: false,
      refetch: vi.fn(),
    });

    render(
      <ProFeature
        featureName="Test Feature"
        showUpgradePrompt={false}
      >
        <div>Pro Content</div>
      </ProFeature>,
      { wrapper }
    );

    expect(screen.queryByText('Pro Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Pro Feature')).not.toBeInTheDocument();
    expect(screen.queryByText('Upgrade to Pro')).not.toBeInTheDocument();
  });

  it('should show custom upgrade message', () => {
    vi.mocked(subscriptionHook.useSubscription).mockReturnValue({
      subscription: null,
      isLoading: false,
      isError: false,
      isPro: false,
      hasActive: false,
      refetch: vi.fn(),
    });

    render(
      <ProFeature
        featureName="Test Feature"
        upgradeMessage="Join Pro to unlock amazing features!"
      >
        <div>Pro Content</div>
      </ProFeature>,
      { wrapper }
    );

    expect(screen.getByText('Join Pro to unlock amazing features!')).toBeInTheDocument();
  });
});
