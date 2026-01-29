import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThreadList } from './ThreadList';
import type { ForumThread } from '@/types/forum';

const mockThreads: ForumThread[] = [
  {
    id: '1',
    user_id: 'user1',
    username: 'testuser',
    title: 'Test Thread 1',
    content: 'This is the first test thread',
    tags: ['test', 'discussion'],
    view_count: 100,
    reply_count: 5,
    locked: false,
    pinned: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    user_id: 'user2',
    username: 'anotheruser',
    title: 'Test Thread 2',
    content: 'This is the second test thread',
    tags: ['help'],
    view_count: 50,
    reply_count: 2,
    locked: true,
    pinned: true,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('ThreadList', () => {
  it('renders list of threads', () => {
    render(
      <BrowserRouter>
        <ThreadList threads={mockThreads} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Thread 1')).toBeInTheDocument();
    expect(screen.getByText('Test Thread 2')).toBeInTheDocument();
  });

  it('displays thread stats correctly', () => {
    render(
      <BrowserRouter>
        <ThreadList threads={mockThreads} />
      </BrowserRouter>
    );

    // Check reply counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Check view counts
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows pinned and locked badges', () => {
    render(
      <BrowserRouter>
        <ThreadList threads={mockThreads} />
      </BrowserRouter>
    );

    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('displays tags for threads', () => {
    render(
      <BrowserRouter>
        <ThreadList threads={mockThreads} />
      </BrowserRouter>
    );

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('discussion')).toBeInTheDocument();
    expect(screen.getByText('help')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <BrowserRouter>
        <ThreadList threads={[]} loading={true} />
      </BrowserRouter>
    );

    const loadingElements = document.querySelectorAll('.animate-pulse');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no threads', () => {
    render(
      <BrowserRouter>
        <ThreadList threads={[]} loading={false} />
      </BrowserRouter>
    );

    expect(screen.getByText('No threads found')).toBeInTheDocument();
  });
});
