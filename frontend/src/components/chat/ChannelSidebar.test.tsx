import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelSidebar } from './ChannelSidebar';
import { Channel } from '@/types/chat';

describe('ChannelSidebar', () => {
  const mockChannels: Channel[] = [
    {
      id: 'general',
      name: 'general',
      description: 'General chat',
      creator_id: 'system',
      channel_type: 'public',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 3,
    },
    {
      id: 'random',
      name: 'random',
      description: 'Random chat',
      creator_id: 'system',
      channel_type: 'public',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 0,
    },
  ];

  it('renders all channels', () => {
    render(
      <ChannelSidebar
        channels={mockChannels}
        selectedChannel={null}
        onSelectChannel={vi.fn()}
      />
    );
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.getByText('random')).toBeInTheDocument();
  });

  it('highlights selected channel', () => {
    render(
      <ChannelSidebar
        channels={mockChannels}
        selectedChannel="general"
        onSelectChannel={vi.fn()}
      />
    );
    const selectedButton = screen.getByRole('button', { current: 'page' });
    expect(selectedButton.className).toContain('bg-neutral-800');
    expect(selectedButton.className).toContain('border-l-2');
  });

  it('shows unread badge for channels with unread messages', () => {
    render(
      <ChannelSidebar
        channels={mockChannels}
        selectedChannel={null}
        onSelectChannel={vi.fn()}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('filters channels based on search query', () => {
    render(
      <ChannelSidebar
        channels={mockChannels}
        selectedChannel={null}
        onSelectChannel={vi.fn()}
      />
    );
    const searchInput = screen.getByPlaceholderText('Search channels...');
    fireEvent.change(searchInput, { target: { value: 'gen' } });
    
    expect(screen.getByText('general')).toBeInTheDocument();
    expect(screen.queryByText('random')).not.toBeInTheDocument();
  });

  it('calls onSelectChannel when channel is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <ChannelSidebar
        channels={mockChannels}
        selectedChannel={null}
        onSelectChannel={handleSelect}
      />
    );
    
    fireEvent.click(screen.getByText('general'));
    expect(handleSelect).toHaveBeenCalledWith('general');
  });

  it('shows empty state when no channels match search', () => {
    render(
      <ChannelSidebar
        channels={mockChannels}
        selectedChannel={null}
        onSelectChannel={vi.fn()}
      />
    );
    const searchInput = screen.getByPlaceholderText('Search channels...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No channels found')).toBeInTheDocument();
  });
});
