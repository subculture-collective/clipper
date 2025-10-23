import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { ClipCard } from './ClipCard';
import type { Clip } from '@/types/clip';

// Mock the hooks
vi.mock('@/hooks/useClips', () => ({
  useClipVote: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useClipFavorite: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const mockClip: Clip = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  twitch_clip_id: 'test_clip_1',
  twitch_clip_url: 'https://clips.twitch.tv/test_clip_1',
  embed_url: 'https://clips.twitch.tv/embed?clip=test_clip_1',
  title: 'Amazing Play',
  creator_name: 'TestCreator',
  broadcaster_name: 'TestStreamer',
  game_name: 'Test Game',
  thumbnail_url: 'https://example.com/thumb.jpg',
  duration: 30.5,
  view_count: 1500,
  vote_score: 42,
  comment_count: 10,
  favorite_count: 5,
  created_at: '2024-01-01T00:00:00Z',
  imported_at: '2024-01-01T00:00:00Z',
  is_featured: false,
  is_nsfw: false,
  is_removed: false,
  user_vote: null,
  is_favorited: false,
};

describe('ClipCard', () => {
  it('renders clip information correctly', () => {
    render(<ClipCard clip={mockClip} />);

    expect(screen.getByText('Amazing Play')).toBeInTheDocument();
    expect(screen.getByText('TestStreamer')).toBeInTheDocument();
    expect(screen.getByText('Test Game')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays vote score with correct formatting', () => {
    render(<ClipCard clip={mockClip} />);
    
    const voteScore = screen.getByText('42');
    expect(voteScore).toBeInTheDocument();
    expect(voteScore).toHaveClass('text-sm', 'font-bold');
  });

  it('formats large numbers correctly', () => {
    const clipWithLargeViews = {
      ...mockClip,
      view_count: 1500000,
    };
    
    render(<ClipCard clip={clipWithLargeViews} />);
    expect(screen.getByText('1.5M')).toBeInTheDocument();
  });

  it('formats duration correctly', () => {
    render(<ClipCard clip={mockClip} />);
    // Duration is 30.5 seconds = 0:30
    expect(screen.getByText('0:30')).toBeInTheDocument();
  });

  it('has upvote and downvote buttons', () => {
    render(<ClipCard clip={mockClip} />);
    
    const upvoteButton = screen.getByLabelText('Upvote');
    const downvoteButton = screen.getByLabelText('Downvote');
    
    expect(upvoteButton).toBeInTheDocument();
    expect(downvoteButton).toBeInTheDocument();
  });

  it('displays positive vote score in green', () => {
    render(<ClipCard clip={mockClip} />);
    
    const voteScore = screen.getByText('42');
    expect(voteScore).toHaveClass('text-green-600');
  });

  it('displays negative vote score in red', () => {
    const clipWithNegativeScore = {
      ...mockClip,
      vote_score: -5,
    };
    
    render(<ClipCard clip={clipWithNegativeScore} />);
    
    const voteScore = screen.getByText('-5');
    expect(voteScore).toHaveClass('text-red-600');
  });

  it('displays zero vote score in muted color', () => {
    const clipWithZeroScore = {
      ...mockClip,
      vote_score: 0,
    };
    
    render(<ClipCard clip={clipWithZeroScore} />);
    
    const voteScore = screen.getByText('0');
    expect(voteScore).toHaveClass('text-muted-foreground');
  });

  it('highlights upvote button when user has upvoted', () => {
    const upvotedClip = {
      ...mockClip,
      user_vote: 1 as const,
    };
    
    render(<ClipCard clip={upvotedClip} />);
    
    const upvoteButton = screen.getByLabelText('Upvote');
    expect(upvoteButton).toHaveClass('text-green-600');
  });

  it('highlights downvote button when user has downvoted', () => {
    const downvotedClip = {
      ...mockClip,
      user_vote: -1 as const,
    };
    
    render(<ClipCard clip={downvotedClip} />);
    
    const downvoteButton = screen.getByLabelText('Downvote');
    expect(downvoteButton).toHaveClass('text-red-600');
  });

  it('formats clip age correctly', () => {
    const recentClip = {
      ...mockClip,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    };
    
    render(<ClipCard clip={recentClip} />);
    expect(screen.getByText(/about 1 hour/i)).toBeInTheDocument();
  });

  it('displays NSFW badge when clip is marked NSFW', () => {
    const nsfwClip = {
      ...mockClip,
      is_nsfw: true,
    };
    
    render(<ClipCard clip={nsfwClip} />);
    expect(screen.getByText('NSFW')).toBeInTheDocument();
  });

  it('displays featured badge when clip is featured', () => {
    const featuredClip = {
      ...mockClip,
      is_featured: true,
    };
    
    render(<ClipCard clip={featuredClip} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('has a link to clip detail page', () => {
    render(<ClipCard clip={mockClip} />);
    
    const link = screen.getByRole('link', { name: /amazing play/i });
    expect(link).toHaveAttribute('href', `/clip/${mockClip.id}`);
  });
});
