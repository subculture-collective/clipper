import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmojiPicker } from './EmojiPicker';

describe('EmojiPicker', () => {
  const mockOnEmojiSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render emoji picker', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    expect(screen.getByRole('dialog', { name: /emoji picker/i })).toBeInTheDocument();
  });

  it('should display category tabs', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    // Category tabs are buttons with emoji as content
    const tabs = screen.getAllByRole('button');
    expect(tabs.length).toBeGreaterThan(5); // At least 5 categories
  });

  it('should display emojis in grid', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    // Should have multiple emoji buttons
    const emojiButtons = screen.getAllByRole('button');
    expect(emojiButtons.length).toBeGreaterThan(10);
  });

  it('should call onEmojiSelect when emoji is clicked', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    // Find an emoji button (they have aria-label starting with "Insert")
    const emojiButton = screen.getAllByRole('button').find(btn => 
      btn.getAttribute('aria-label')?.startsWith('Insert')
    );
    
    if (emojiButton) {
      await user.click(emojiButton);
      expect(mockOnEmojiSelect).toHaveBeenCalledTimes(1);
    }
  });

  it('should switch categories when category tab is clicked', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    // Get all category tabs (buttons with title attribute)
    const categoryTabs = screen.getAllByRole('button').filter(btn => btn.hasAttribute('title'));
    
    if (categoryTabs.length > 1) {
      await user.click(categoryTabs[1]);
      // Category should change (different emojis displayed)
      await waitFor(() => {
        expect(categoryTabs[1]).toHaveClass('bg-background');
      });
    }
  });

  it('should close on Escape key', async () => {
    const user = userEvent.setup();
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should display help text in footer', () => {
    render(<EmojiPicker onEmojiSelect={mockOnEmojiSelect} onClose={mockOnClose} />);

    expect(screen.getByText(/click an emoji to insert/i)).toBeInTheDocument();
  });
});
