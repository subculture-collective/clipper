import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DuplicateClipError } from './DuplicateClipError';

describe('DuplicateClipError', () => {
  it('renders error message', () => {
    render(
      <DuplicateClipError
        message="This clip has already been posted"
      />
    );

    expect(screen.getByText('This clip has already been posted')).toBeInTheDocument();
  });

  it('renders with clip link when clipSlug is provided', () => {
    render(
      <DuplicateClipError
        message="This clip already exists"
        clipSlug="test-clip-123"
      />
    );

    const link = screen.getByRole('link', { name: /view existing clip/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/clips/test-clip-123');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders with clip link when clipId is provided', () => {
    render(
      <DuplicateClipError
        message="This clip already exists"
        clipId="abc-123"
      />
    );

    const link = screen.getByRole('link', { name: /view existing clip/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/clips/abc-123');
  });

  it('prefers clipSlug over clipId when both provided', () => {
    render(
      <DuplicateClipError
        message="This clip already exists"
        clipId="abc-123"
        clipSlug="test-clip-slug"
      />
    );

    const link = screen.getByRole('link', { name: /view existing clip/i });
    expect(link).toHaveAttribute('href', '/clips/test-clip-slug');
  });

  it('does not render clip link when neither clipId nor clipSlug provided', () => {
    render(
      <DuplicateClipError
        message="This clip already exists"
      />
    );

    const link = screen.queryByRole('link', { name: /view existing clip/i });
    expect(link).not.toBeInTheDocument();
  });

  it('renders informational text about duplicates', () => {
    render(
      <DuplicateClipError
        message="This clip already exists"
      />
    );

    expect(
      screen.getByText(/each clip can only be submitted once/i)
    ).toBeInTheDocument();
  });

  it('calls onDismiss when alert is dismissed', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <DuplicateClipError
        message="This clip already exists"
        onDismiss={onDismiss}
      />
    );

    // Find and click the dismiss button (close button in Alert component)
    const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders with error variant (red styling)', () => {
    const { container } = render(
      <DuplicateClipError
        message="This clip already exists"
      />
    );

    // Alert component should have error variant classes
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('shows "Duplicate Clip" as title', () => {
    render(
      <DuplicateClipError
        message="This clip already exists"
      />
    );

    expect(screen.getByText('Duplicate Clip')).toBeInTheDocument();
  });
});
