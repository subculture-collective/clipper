import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileSkeleton } from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  it('renders without crashing', () => {
    render(<ProfileSkeleton />);
    // Check that skeleton elements are present by checking for loading indicators
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has proper accessibility attributes', () => {
    render(<ProfileSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
    });
  });
});
