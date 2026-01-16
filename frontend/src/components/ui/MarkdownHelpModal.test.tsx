import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownHelpModal } from './MarkdownHelpModal';

describe('MarkdownHelpModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<MarkdownHelpModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText(/markdown formatting guide/i)).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<MarkdownHelpModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/markdown formatting guide/i)).toBeInTheDocument();
  });

  it('should display markdown syntax examples', () => {
    render(<MarkdownHelpModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('Italic')).toBeInTheDocument();
    expect(screen.getByText('Link')).toBeInTheDocument();
    expect(screen.getByText('Code Block')).toBeInTheDocument();
  });

  it('should display keyboard shortcuts', () => {
    render(<MarkdownHelpModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText(/keyboard shortcuts/i)).toBeInTheDocument();
    expect(screen.getByText(/to submit/i)).toBeInTheDocument();
    expect(screen.getByText(/to cancel/i)).toBeInTheDocument();
  });

  it('should show syntax and examples for each formatting option', () => {
    render(<MarkdownHelpModal isOpen={true} onClose={mockOnClose} />);

    // Check for bold example
    expect(screen.getByText('**bold text**')).toBeInTheDocument();
    
    // Check for italic example
    expect(screen.getByText('*italic text*')).toBeInTheDocument();
    
    // Check for link example
    expect(screen.getByText('[link text](url)')).toBeInTheDocument();
  });

  it('should call onClose when modal is closed', async () => {
    const user = userEvent.setup();
    render(<MarkdownHelpModal isOpen={true} onClose={mockOnClose} />);

    // Find and click the close button (usually an X button in the modal)
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
