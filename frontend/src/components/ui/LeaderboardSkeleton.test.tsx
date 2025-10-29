import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardSkeleton } from './LeaderboardSkeleton';

describe('LeaderboardSkeleton', () => {
  it('renders multiple skeleton entries', () => {
    render(<LeaderboardSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    // Should have 10 entries with multiple skeleton elements each
    expect(skeletons.length).toBeGreaterThan(10);
  });

  it('has proper accessibility attributes', () => {
    render(<LeaderboardSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
    });
  });
});
