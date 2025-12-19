import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SearchResultCard } from './SearchResultCard';
import type { SearchResult } from '@/types/forum';

// Wrapper component to provide routing context
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('SearchResultCard', () => {
  const mockThreadResult: SearchResult = {
    type: 'thread',
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Thread Title',
    body: 'This is test thread content',
    author_id: '123e4567-e89b-12d3-a456-426614174001',
    author_name: 'testuser',
    vote_count: 5,
    created_at: new Date().toISOString(),
    headline: 'This is a <b>highlighted</b> snippet',
    rank: 0.5,
  };

  const mockReplyResult: SearchResult = {
    type: 'reply',
    id: '123e4567-e89b-12d3-a456-426614174002',
    body: 'This is test reply content',
    author_id: '123e4567-e89b-12d3-a456-426614174001',
    author_name: 'testuser',
    thread_id: '123e4567-e89b-12d3-a456-426614174000',
    vote_count: 3,
    created_at: new Date().toISOString(),
    headline: 'Reply with <b>highlighted</b> text',
    rank: 0.3,
  };

  it('renders thread result with title', () => {
    renderWithRouter(<SearchResultCard result={mockThreadResult} />);
    
    expect(screen.getByText('Test Thread Title')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Thread')).toBeInTheDocument();
  });

  it('renders reply result without title', () => {
    renderWithRouter(<SearchResultCard result={mockReplyResult} />);
    
    expect(screen.queryByText('Test Thread Title')).not.toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('Reply')).toBeInTheDocument();
  });

  it('displays vote count when not zero', () => {
    renderWithRouter(<SearchResultCard result={mockThreadResult} />);
    
    expect(screen.getByText('5 votes')).toBeInTheDocument();
  });

  it('does not display vote count when zero', () => {
    const zeroVotesResult = { ...mockThreadResult, vote_count: 0 };
    renderWithRouter(<SearchResultCard result={zeroVotesResult} />);
    
    expect(screen.queryByText('0 votes')).not.toBeInTheDocument();
  });

  it('renders highlighted snippet with HTML', () => {
    const { container } = renderWithRouter(<SearchResultCard result={mockThreadResult} />);
    
    const highlightElement = container.querySelector('.search-highlight');
    expect(highlightElement).toBeInTheDocument();
    expect(highlightElement?.innerHTML).toContain('<b>highlighted</b>');
  });

  it('links to correct thread URL for thread results', () => {
    renderWithRouter(<SearchResultCard result={mockThreadResult} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/forum/threads/${mockThreadResult.id}`);
  });

  it('links to correct reply URL for reply results', () => {
    renderWithRouter(<SearchResultCard result={mockReplyResult} />);
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/forum/threads/${mockReplyResult.thread_id}#reply-${mockReplyResult.id}`);
  });

  it('renders thread badge', () => {
    renderWithRouter(<SearchResultCard result={mockThreadResult} />);
    
    const badge = screen.getByText('Thread');
    expect(badge).toBeInTheDocument();
  });

  it('renders reply badge', () => {
    renderWithRouter(<SearchResultCard result={mockReplyResult} />);
    
    const badge = screen.getByText('Reply');
    expect(badge).toBeInTheDocument();
  });
});
