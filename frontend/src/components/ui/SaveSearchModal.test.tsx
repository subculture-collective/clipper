import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SaveSearchModal } from './SaveSearchModal';

describe('SaveSearchModal', () => {
  it('should render when open', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    expect(screen.getByText('Save Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Name (optional)')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveSearchModal
        open={false}
        onClose={onClose}
        onSave={onSave}
      />
    );

    expect(screen.queryByText('Save Search')).not.toBeInTheDocument();
  });

  it('should call onSave with input value and onClose when save button is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const input = screen.getByLabelText('Search Name (optional)');
    fireEvent.change(input, { target: { value: 'My Search' } });
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith('My Search');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSave with empty string when save button is clicked with no input', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith('');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should reset input when modal is closed and reopened', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    const { rerender } = render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const input = screen.getByLabelText('Search Name (optional)');
    fireEvent.change(input, { target: { value: 'Test' } });
    
    // Close modal
    fireEvent.click(screen.getByText('Cancel'));
    
    // Reopen modal
    rerender(
      <SaveSearchModal
        open={false}
        onClose={onClose}
        onSave={onSave}
      />
    );
    
    rerender(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    // Input should be empty
    expect(screen.getByLabelText('Search Name (optional)')).toHaveValue('');
  });
});
