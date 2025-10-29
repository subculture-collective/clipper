import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CommentSkeleton } from './CommentSkeleton';

describe('CommentSkeleton', () => {
  it('renders multiple comment skeletons', () => {
    render(<CommentSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    // Should have 3 comments with multiple skeleton elements each
    expect(skeletons.length).toBeGreaterThan(3);
  });

  it('has proper accessibility attributes', () => {
    render(<CommentSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
    });
  });
});
