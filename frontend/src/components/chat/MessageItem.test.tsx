import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MessageItem } from './MessageItem';
import type { ChatMessage } from '@/types/chat';

const renderWithRouter = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('MessageItem', () => {
  const mockMessage: ChatMessage = {
    id: '1',
    channel_id: 'general',
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    content: 'Hello world',
    is_deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders message with username and content', () => {
    renderWithRouter(<MessageItem message={mockMessage} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders avatar with fallback', () => {
    renderWithRouter(<MessageItem message={mockMessage} />);
    const avatar = screen.getByText('T'); // First letter of username
    expect(avatar).toBeInTheDocument();
  });

  it('shows deleted message placeholder', () => {
    const deletedMessage = { ...mockMessage, is_deleted: true };
    renderWithRouter(<MessageItem message={deletedMessage} />);
    expect(screen.getByText('This message has been deleted')).toBeInTheDocument();
    expect(screen.queryByText('Hello world')).not.toBeInTheDocument();
  });

  it('applies hover styles', () => {
    const { container } = renderWithRouter(<MessageItem message={mockMessage} />);
    const messageContainer = container.firstChild as HTMLElement;
    expect(messageContainer.className).toContain('hover:bg-neutral-50');
    expect(messageContainer.className).toContain('dark:hover:bg-neutral-800');
  });
});
