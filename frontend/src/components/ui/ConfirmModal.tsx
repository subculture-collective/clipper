import React, { useState } from 'react';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  /**
   * Callback when modal should close
   */
  onClose: () => void;
  /**
   * Callback when user confirms
   */
  onConfirm: () => void | Promise<void>;
  /**
   * Modal title
   */
  title: string;
  /**
   * Confirmation message
   */
  message: string;
  /**
   * Text for confirm button
   * @default 'Confirm'
   */
  confirmText?: string;
  /**
   * Text for cancel button
   * @default 'Cancel'
   */
  cancelText?: string;
  /**
   * Variant for confirm button
   * @default 'primary'
   */
  variant?: 'primary' | 'danger';
}

/**
 * Reusable confirmation modal for yes/no actions
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Keep modal open on error so user can see the error state
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="py-2">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <ModalFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          loading={isLoading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
