import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders empty state message', () => {
    render(<EmptyState />);
    expect(screen.getByText('Select a channel')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a channel from the sidebar to start chatting with your community')
    ).toBeInTheDocument();
  });

  it('displays message circle icon', () => {
    const { container } = render(<EmptyState />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies proper styling classes', () => {
    const { container } = render(<EmptyState />);
    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('flex-1');
    expect(mainContainer.className).toContain('bg-background');
  });
});
