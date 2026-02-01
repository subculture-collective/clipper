import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('should call onSave with input value and onClose when save button is clicked', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

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

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('My Search');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onSave with empty string when save button is clicked with no input', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
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

  it('should show loading state and disable form while saving', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    const input = screen.getByLabelText('Search Name (optional)');
    const saveButton = screen.getByText('Save');
    const cancelButton = screen.getByText('Cancel');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(saveButton);

    // Input and buttons should be disabled while loading
    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(cancelButton).toBeDisabled();
    });

    // Wait for async action to complete
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should keep modal open on error', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SaveSearchModal
        open={true}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    // Modal should remain open on error
    expect(onClose).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
