import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncStatus } from './SyncStatus';

describe('SyncStatus', () => {
  it('shows disconnected state when not connected', () => {
    render(<SyncStatus isConnected={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('shows in-sync state when connected and synced', () => {
    render(<SyncStatus isConnected={true} syncState="in-sync" />);
    expect(screen.getByText('In Sync')).toBeInTheDocument();
  });

  it('shows catching-up state', () => {
    render(<SyncStatus isConnected={true} syncState="catching-up" />);
    expect(screen.getByText('Catching Up')).toBeInTheDocument();
  });

  it('shows buffering state', () => {
    render(<SyncStatus isConnected={true} syncState="buffering" />);
    expect(screen.getByText('Buffering')).toBeInTheDocument();
  });

  it('applies correct color classes for different states', () => {
    const { rerender } = render(<SyncStatus isConnected={false} />);
    expect(screen.getByText('Disconnected').parentElement).toHaveClass('text-error-600');

    rerender(<SyncStatus isConnected={true} syncState="in-sync" />);
    expect(screen.getByText('In Sync').parentElement).toHaveClass('text-success-600');

    rerender(<SyncStatus isConnected={true} syncState="catching-up" />);
    expect(screen.getByText('Catching Up').parentElement).toHaveClass('text-warning-600');
  });
});
