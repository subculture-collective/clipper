import { useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { Alert } from '../ui/Alert';
import { createAppeal } from '@/lib/moderation-api';
import { getErrorMessage } from '@/lib/error-utils';

interface AppealFormProps {
  open: boolean;
  onClose: () => void;
  moderationActionId: string;
  onSuccess?: () => void;
}

export function AppealForm({ open, onClose, moderationActionId, onSuccess }: AppealFormProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reason.trim().length < 10) {
      setError('Please provide a detailed reason (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createAppeal({
        moderation_action_id: moderationActionId,
        reason: reason.trim(),
      });
      setSuccess(true);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset form
        setReason('');
        setSuccess(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit appeal. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !success) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Appeal Moderation Decision"
      size="md"
      closeOnBackdrop={!isSubmitting}
    >
      {success ? (
        <div className="py-8 text-center">
          <Alert variant="success">
            Appeal submitted successfully! We'll review your appeal and get back to you soon.
          </Alert>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Please explain why you believe this moderation decision was incorrect. 
                Your appeal will be reviewed by our moderation team.
              </p>
            </div>

            {error && (
              <Alert variant="error">
                {error}
              </Alert>
            )}

            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-2">
                Reason for Appeal *
              </label>
              <TextArea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you believe this decision was incorrect..."
                rows={6}
                maxLength={2000}
                disabled={isSubmitting}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {reason.length}/2000 characters (minimum 10)
              </p>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || reason.trim().length < 10}
              loading={isSubmitting}
            >
              Submit Appeal
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
