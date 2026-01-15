import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { DuplicateClipError } from './DuplicateClipError';

describe('DuplicateClipError', () => {
  it('renders error message', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip has already been posted"
        />
      </MemoryRouter>
    );

    expect(screen.getByText('This clip has already been posted')).toBeInTheDocument();
  });

  it('renders with clip link when clipSlug is provided', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
          clipSlug="test-clip-123"
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /view existing clip/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/clip/test-clip-123');
  });

  it('renders with clip link when clipId is provided', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
          clipId="abc-123"
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /view existing clip/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/clip/abc-123');
  });

  it('prefers clipSlug over clipId when both provided', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
          clipId="abc-123"
          clipSlug="test-clip-slug"
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /view existing clip/i });
    expect(link).toHaveAttribute('href', '/clip/test-clip-slug');
  });

  it('does not render clip link when neither clipId nor clipSlug provided', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
        />
      </MemoryRouter>
    );

    const link = screen.queryByRole('link', { name: /view existing clip/i });
    expect(link).not.toBeInTheDocument();
  });

  it('renders informational text about duplicates', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/each clip can only be submitted once/i)
    ).toBeInTheDocument();
  });

  it('calls onDismiss when alert is dismissed', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
          onDismiss={onDismiss}
        />
      </MemoryRouter>
    );

    // Find and click the dismiss button (close button in Alert component)
    const dismissButton = screen.getByRole('button', { name: /dismiss|close/i });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders with error variant (red styling)', () => {
    const { container } = render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
        />
      </MemoryRouter>
    );

    // Alert component should have error variant classes
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toBeInTheDocument();
  });

  it('shows "Duplicate Clip" as title', () => {
    render(
      <MemoryRouter>
        <DuplicateClipError
          message="This clip already exists"
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Duplicate Clip')).toBeInTheDocument();
  });
});
