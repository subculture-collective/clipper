import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SearchResultSkeleton } from './SearchResultSkeleton';

describe('SearchResultSkeleton', () => {
  it('renders multiple search result skeletons', () => {
    render(<SearchResultSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    // Should have 5 results with multiple skeleton elements each
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('has proper accessibility attributes', () => {
    render(<SearchResultSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
    });
  });
});
