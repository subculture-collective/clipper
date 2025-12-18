import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('does not render when no users are typing', () => {
    const { container } = render(
      <TypingIndicator channelId="general" typingUsers={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows single user typing', () => {
    render(<TypingIndicator channelId="general" typingUsers={['user1']} />);
    expect(screen.getByText('user1 is typing...')).toBeInTheDocument();
  });

  it('shows two users typing', () => {
    render(
      <TypingIndicator channelId="general" typingUsers={['user1', 'user2']} />
    );
    expect(screen.getByText('user1 and user2 are typing...')).toBeInTheDocument();
  });

  it('shows multiple users typing with count', () => {
    render(
      <TypingIndicator
        channelId="general"
        typingUsers={['user1', 'user2', 'user3']}
      />
    );
    expect(screen.getByText('user1 and 2 others are typing...')).toBeInTheDocument();
  });

  it('displays animated dots', () => {
    const { container } = render(
      <TypingIndicator channelId="general" typingUsers={['user1']} />
    );
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });
});
