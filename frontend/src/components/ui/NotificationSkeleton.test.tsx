import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationSkeleton } from './NotificationSkeleton';

describe('NotificationSkeleton', () => {
  it('renders multiple notification skeletons', () => {
    render(<NotificationSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    // Should have 5 notifications with multiple skeleton elements each
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it('has proper accessibility attributes', () => {
    render(<NotificationSkeleton />);
    const skeletons = document.querySelectorAll('[aria-busy="true"]');
    skeletons.forEach(skeleton => {
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('aria-live', 'polite');
    });
  });
});
