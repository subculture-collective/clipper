import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { RateLimitError } from './RateLimitError';

describe('RateLimitError', () => {
  it('should render rate limit error with countdown', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300; // 5 minutes from now

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    expect(screen.getByText(/Submission Rate Limit Reached/i)).toBeInTheDocument();
    expect(screen.getByText(/You've submitted 10 clips in the past 1 hour/i)).toBeInTheDocument();
    expect(screen.getByText(/You can submit again in/i)).toBeInTheDocument();
  });

  it('should format time remaining as minutes and seconds', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 125; // 2 minutes 5 seconds

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    // Should show minutes and seconds
    expect(screen.getByText(/2 minutes/i)).toBeInTheDocument();
  });

  it('should format time remaining with hours', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 3665; // 1 hour 1 minute 5 seconds

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    // Should show hours and minutes (only first 2 parts) - use getAllByText since text appears twice
    const hourText = screen.getAllByText(/1 hour/i);
    expect(hourText.length).toBeGreaterThan(0);
  });

  it('should display window time correctly for hours', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600} // 1 hour
      />
    );

    expect(screen.getByText(/in the past 1 hour/i)).toBeInTheDocument();
  });

  it('should display window time correctly for multiple hours', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={50}
        window={7200} // 2 hours
      />
    );

    expect(screen.getByText(/in the past 2 hours/i)).toBeInTheDocument();
  });

  it('should display learn about rate limits link', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    const link = screen.getByText(/Learn about rate limits/i);
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/help/rate-limits');
    expect(link.closest('a')).toHaveAttribute('target', '_blank');
    expect(link.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should have proper accessibility attributes', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    const { container } = render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    // Alert component should provide role="alert" and ARIA attributes
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('should display time remaining with ARIA label', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300; // 5 minutes

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    const timeElement = screen.getByLabelText(/Time remaining:/i);
    expect(timeElement).toBeInTheDocument();
  });

  it('should render with different limits', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={50}
        window={3600}
      />
    );

    expect(screen.getByText(/You've submitted 50 clips/i)).toBeInTheDocument();
  });

  it('should handle expired rate limit (0 seconds remaining)', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now - 10; // Already expired

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={3600}
      />
    );

    // When expired, should show success message
    expect(screen.getByText(/You can submit again now!/i)).toBeInTheDocument();
  });

  it('should display window time correctly for minutes (90 seconds)', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={90} // 90 seconds = 1.5 minutes, should display as "1 minute"
      />
    );

    expect(screen.getByText(/in the past 1 minute/i)).toBeInTheDocument();
  });

  it('should display window time correctly for multiple minutes (1800 seconds)', () => {
    const now = Math.floor(Date.now() / 1000);
    const retryAfter = now + 300;

    render(
      <RateLimitError
        retryAfter={retryAfter}
        limit={10}
        window={1800} // 30 minutes
      />
    );

    expect(screen.getByText(/in the past 30 minutes/i)).toBeInTheDocument();
  });

  describe('Callbacks', () => {
    it('should provide onExpire callback prop', () => {
      // Test that onExpire prop is accepted without errors
      const onExpire = vi.fn();
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = now + 300;

      const { unmount } = render(
        <RateLimitError
          retryAfter={retryAfter}
          limit={10}
          window={3600}
          onExpire={onExpire}
        />
      );

      // Component should render without errors
      expect(screen.getByText(/Submission Rate Limit Reached/i)).toBeInTheDocument();
      
      unmount();
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      const now = Math.floor(Date.now() / 1000);
      const retryAfter = now - 10; // Already expired

      render(
        <RateLimitError
          retryAfter={retryAfter}
          limit={10}
          window={3600}
          onDismiss={onDismiss}
        />
      );

      // Should be dismissible when expired
      const dismissButton = screen.getByLabelText('Dismiss');
      expect(dismissButton).toBeInTheDocument();

      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
