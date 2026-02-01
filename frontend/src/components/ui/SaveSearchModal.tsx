import React, { useState } from 'react';
import { Modal, ModalFooter } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface SaveSearchModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  /**
   * Callback when modal should close
   */
  onClose: () => void;
  /**
   * Callback when user saves the search
   */
  onSave: (name: string) => void | Promise<void>;
}

/**
 * Modal for entering a name when saving a search
 */
export const SaveSearchModal: React.FC<SaveSearchModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await onSave(name.trim());
      setName('');
      onClose();
    } catch (error) {
      // Keep modal open on error so user can see the error state
      console.error('Save search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleCancel} title="Save Search" size="md">
      <form onSubmit={handleSubmit}>
        <div className="py-2">
          <label htmlFor="search-name" className="block text-sm font-medium mb-2">
            Search Name (optional)
          </label>
          <Input
            id="search-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My search"
            autoFocus
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Leave empty to use the search query as the name
          </p>
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
