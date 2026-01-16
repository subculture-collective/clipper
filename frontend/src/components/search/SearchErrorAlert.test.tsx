import { render, screen } from '@/test/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SearchErrorAlert } from './SearchErrorAlert';

describe('SearchErrorAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should not render when type is "none"', () => {
    render(<SearchErrorAlert type="none" />);
    
    // Check that neither alert is in the document
    expect(screen.queryByTestId('search-failover-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('search-error-alert')).not.toBeInTheDocument();
  });

  it('should render failover warning with correct styling', () => {
    render(<SearchErrorAlert type="failover" />);
    
    const alert = screen.getByTestId('search-failover-warning');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Using Backup Search')).toBeInTheDocument();
    expect(screen.getByText(/experiencing issues with our primary search/i)).toBeInTheDocument();
  });

  it('should render error alert with retry button', () => {
    const onRetry = vi.fn();
    render(<SearchErrorAlert type="error" onRetry={onRetry} />);
    
    const alert = screen.getByTestId('search-error-alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Search Temporarily Unavailable')).toBeInTheDocument();
    
    const retryButton = screen.getByTestId('retry-search');
    expect(retryButton).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<SearchErrorAlert type="error" onRetry={onRetry} />);
    
    const retryButton = screen.getByTestId('retry-search');
    retryButton.click();
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should disable retry button when isRetrying is true', () => {
    render(<SearchErrorAlert type="error" onRetry={vi.fn()} isRetrying={true} />);
    
    const retryButton = screen.getByTestId('retry-search');
    expect(retryButton).toBeDisabled();
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('should show spinner when retrying', () => {
    render(<SearchErrorAlert type="error" onRetry={vi.fn()} isRetrying={true} />);
    
    // Check for spinner SVG
    const spinner = screen.getByRole('button', { name: /retrying/i });
    expect(spinner).toBeInTheDocument();
  });

  it('should auto-dismiss failover warning after default duration', async () => {
    const onDismiss = vi.fn();
    render(<SearchErrorAlert type="failover" onDismiss={onDismiss} />);
    
    expect(screen.getByTestId('search-failover-warning')).toBeInTheDocument();
    
    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);
    
    // Wait for the component to update
    await vi.runOnlyPendingTimersAsync();
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss failover warning after custom duration', async () => {
    const onDismiss = vi.fn();
    render(<SearchErrorAlert type="failover" onDismiss={onDismiss} autoDismissMs={5000} />);
    
    expect(screen.getByTestId('search-failover-warning')).toBeInTheDocument();
    
    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);
    
    // Wait for the component to update
    await vi.runOnlyPendingTimersAsync();
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not auto-dismiss error alerts', async () => {
    const onDismiss = vi.fn();
    render(<SearchErrorAlert type="error" onDismiss={onDismiss} />);
    
    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);
    
    // Error should still be visible
    expect(screen.getByTestId('search-error-alert')).toBeInTheDocument();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should allow manual dismissal of failover warning', () => {
    const onDismiss = vi.fn();
    render(<SearchErrorAlert type="failover" onDismiss={onDismiss} />);
    
    // Find and click dismiss button (X button in Alert component)
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    dismissButton.click();
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should display custom error message when provided', () => {
    const customMessage = 'Custom error message for testing';
    render(<SearchErrorAlert type="error" message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('should have correct ARIA attributes for accessibility', () => {
    render(<SearchErrorAlert type="error" />);
    
    const alert = screen.getByTestId('search-error-alert');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('should show new error when error type changes from dismissed state', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<SearchErrorAlert type="failover" onDismiss={onDismiss} />);
    
    expect(screen.getByTestId('search-failover-warning')).toBeInTheDocument();
    
    // Manually dismiss
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    dismissButton.click();
    
    // onDismiss should be called
    expect(onDismiss).toHaveBeenCalled();
    
    // Change to error type - component should reset and show new error
    // regardless of previous dismissed state
    rerender(<SearchErrorAlert type="error" />);
    
    // New error alert should appear
    expect(screen.getByTestId('search-error-alert')).toBeInTheDocument();
  });

  it('should not show retry button for failover warnings', () => {
    render(<SearchErrorAlert type="failover" onRetry={vi.fn()} />);
    
    // Failover warnings should not have retry button
    expect(screen.queryByTestId('retry-search')).not.toBeInTheDocument();
  });

  it('should handle missing onRetry callback gracefully', () => {
    // Should render without crashing even if onRetry is not provided
    render(<SearchErrorAlert type="error" />);
    
    // Retry button should not be present
    expect(screen.queryByTestId('retry-search')).not.toBeInTheDocument();
  });

  it('should display retry count indicator when retrying', () => {
    render(<SearchErrorAlert type="error" retryCount={2} maxRetries={3} isRetrying={true} />);
    
    const retryCountIndicator = screen.getByTestId('retry-count-indicator');
    expect(retryCountIndicator).toBeInTheDocument();
    expect(retryCountIndicator).toHaveTextContent('Retrying 2/3');
  });

  it('should display retry count indicator after retry attempt', () => {
    render(<SearchErrorAlert type="error" retryCount={1} maxRetries={3} isRetrying={false} />);
    
    const retryCountIndicator = screen.getByTestId('retry-count-indicator');
    expect(retryCountIndicator).toBeInTheDocument();
    expect(retryCountIndicator).toHaveTextContent('Retry 1/3');
  });

  it('should display progress bar when retrying', () => {
    render(<SearchErrorAlert type="error" retryCount={2} maxRetries={3} isRetrying={true} />);
    
    const progressBar = screen.getByTestId('retry-progress-bar');
    expect(progressBar).toBeInTheDocument();
    
    // Check progress bar has correct width
    const progressBarInner = progressBar.querySelector('div');
    expect(progressBarInner).toHaveStyle({ width: '66.66666666666666%' });
  });

  it('should show cancel button when retrying', () => {
    const onCancelRetry = vi.fn();
    render(<SearchErrorAlert type="error" isRetrying={true} onCancelRetry={onCancelRetry} />);
    
    const cancelButton = screen.getByTestId('cancel-retry');
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveTextContent('Cancel');
  });

  it('should call onCancelRetry when cancel button is clicked', () => {
    const onCancelRetry = vi.fn();
    render(<SearchErrorAlert type="error" isRetrying={true} onCancelRetry={onCancelRetry} />);
    
    const cancelButton = screen.getByTestId('cancel-retry');
    cancelButton.click();
    
    expect(onCancelRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show cancel button when not retrying', () => {
    const onCancelRetry = vi.fn();
    render(<SearchErrorAlert type="error" isRetrying={false} onCancelRetry={onCancelRetry} />);
    
    expect(screen.queryByTestId('cancel-retry')).not.toBeInTheDocument();
  });

  it('should display circuit breaker status when circuit is open', () => {
    render(<SearchErrorAlert type="error" isCircuitOpen={true} />);
    
    const circuitBreakerStatus = screen.getByTestId('circuit-breaker-status');
    expect(circuitBreakerStatus).toBeInTheDocument();
    expect(circuitBreakerStatus).toHaveTextContent('Service protection active');
  });

  it('should not show retry button when circuit breaker is open', () => {
    render(<SearchErrorAlert type="error" isCircuitOpen={true} onRetry={vi.fn()} />);
    
    // Retry button should not be present when circuit is open
    expect(screen.queryByTestId('retry-search')).not.toBeInTheDocument();
  });

  it('should have correct ARIA attributes for progress bar', () => {
    render(<SearchErrorAlert type="error" retryCount={1} maxRetries={3} isRetrying={true} />);
    
    const progressBar = screen.getByTestId('retry-progress-bar');
    const progressBarInner = progressBar.querySelector('div[role="progressbar"]');
    
    expect(progressBarInner).toHaveAttribute('role', 'progressbar');
    expect(progressBarInner).toHaveAttribute('aria-valuenow', '1');
    expect(progressBarInner).toHaveAttribute('aria-valuemin', '0');
    expect(progressBarInner).toHaveAttribute('aria-valuemax', '3');
    expect(progressBarInner).toHaveAttribute('aria-label', 'Retry progress: 1 of 3');
  });
});
