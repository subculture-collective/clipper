import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VerifiedBadge } from './VerifiedBadge';

describe('VerifiedBadge', () => {
  it('renders the verified badge', () => {
    render(<VerifiedBadge />);
    const badge = screen.getByRole('img', { name: /verified creator/i });
    expect(badge).toBeInTheDocument();
  });

  it('shows tooltip by default', () => {
    render(<VerifiedBadge />);
    const badge = screen.getByRole('img', { name: /verified creator/i });
    expect(badge).toHaveAttribute('title');
    expect(badge.getAttribute('title')).toContain('Verified Creator');
  });

  it('hides tooltip when showTooltip is false', () => {
    render(<VerifiedBadge showTooltip={false} />);
    const badge = screen.getByRole('img', { name: /verified creator/i });
    expect(badge).not.toHaveAttribute('title');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<VerifiedBadge size="sm" />);
    let svg = screen.getByRole('img', { name: /verified creator/i }).querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');

    rerender(<VerifiedBadge size="md" />);
    svg = screen.getByRole('img', { name: /verified creator/i }).querySelector('svg');
    expect(svg).toHaveClass('w-5', 'h-5');

    rerender(<VerifiedBadge size="lg" />);
    svg = screen.getByRole('img', { name: /verified creator/i }).querySelector('svg');
    expect(svg).toHaveClass('w-6', 'h-6');
  });

  it('applies custom className', () => {
    render(<VerifiedBadge className="custom-class" />);
    const badge = screen.getByRole('img', { name: /verified creator/i });
    expect(badge).toHaveClass('custom-class');
  });

  it('has proper color classes', () => {
    render(<VerifiedBadge />);
    const svg = screen.getByRole('img', { name: /verified creator/i }).querySelector('svg');
    expect(svg).toHaveClass('text-blue-500', 'dark:text-blue-400');
  });
});
