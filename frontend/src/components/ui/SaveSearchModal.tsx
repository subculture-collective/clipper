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
  onSave: (name: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name.trim());
    setName('');
    onClose();
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
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Leave empty to use the search query as the name
          </p>
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
