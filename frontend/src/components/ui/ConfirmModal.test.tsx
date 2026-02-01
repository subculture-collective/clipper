import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  it('should render when open', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test Title"
        message="Test message"
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        open={false}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test Title"
        message="Test message"
      />
    );

    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('should call onConfirm and onClose when confirm button is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test Title"
        message="Test message"
        confirmText="Yes"
      />
    );

    fireEvent.click(screen.getByText('Yes'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Test Title"
        message="Test message"
        cancelText="No"
      />
    );

    fireEvent.click(screen.getByText('No'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
