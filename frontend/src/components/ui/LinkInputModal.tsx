import React, { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { validateAndNormalizeUrl } from '@/lib/url-validation';

interface LinkInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (url: string, text: string) => void;
}

/**
 * Modal for inserting links with URL validation
 */
export const LinkInputModal: React.FC<LinkInputModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    // Validate and normalize the URL before inserting
    const validatedUrl = validateAndNormalizeUrl(url.trim());
    if (!validatedUrl) {
      setError('Invalid URL. Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setError('');
    onInsert(validatedUrl, text.trim());
    
    // Reset form
    setUrl('');
    setText('');
    onClose();
  };

  const handleCancel = () => {
    setUrl('');
    setText('');
    setError('');
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleCancel} title="Insert Link" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="link-url" className="block text-sm font-medium mb-1">
            URL
          </label>
          <Input
            id="link-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
            className={error ? 'border-red-500' : ''}
          />
          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label htmlFor="link-text" className="block text-sm font-medium mb-1">
            Link Text (optional)
          </label>
          <Input
            id="link-text"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Click here"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Leave empty to use the URL as link text
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Insert Link
          </Button>
        </div>
      </form>
    </Modal>
  );
};
