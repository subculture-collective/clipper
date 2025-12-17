import { useState } from 'react';
import { Modal, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { Alert } from '../ui/Alert';
import { resolveAppeal, type ModerationAppeal } from '@/lib/moderation-api';
import { getErrorMessage } from '@/lib/error-utils';

interface AppealResolutionModalProps {
  open: boolean;
  onClose: () => void;
  appeal: ModerationAppeal;
  onSuccess?: () => void;
}

export function AppealResolutionModal({ 
  open, 
  onClose, 
  appeal, 
  onSuccess 
}: AppealResolutionModalProps) {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!decision) {
      setError('Please select a decision');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await resolveAppeal(appeal.id, {
        decision,
        resolution: resolution.trim() || undefined,
      });
      setSuccess(true);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset form
        setDecision(null);
        setResolution('');
        setSuccess(false);
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to resolve appeal. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !success) {
      setDecision(null);
      setResolution('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Resolve Appeal"
      size="lg"
      closeOnBackdrop={!isSubmitting}
    >
      {success ? (
        <div className="py-8 text-center">
          <Alert type="success">
            Appeal resolved successfully!
          </Alert>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Appeal Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h3 className="font-semibold mb-2">Appeal Details</h3>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">User:</span> {appeal.username || 'Unknown'} 
                  {appeal.display_name && ` (${appeal.display_name})`}
                </p>
                <p>
                  <span className="font-medium">Original Action:</span> {appeal.decision_action || 'Unknown'}
                </p>
                <p>
                  <span className="font-medium">Content:</span> {appeal.content_type || 'Unknown'} (ID: {appeal.content_id || 'N/A'})
                </p>
                {appeal.decision_reason && (
                  <p>
                    <span className="font-medium">Original Reason:</span> {appeal.decision_reason}
                  </p>
                )}
              </div>
              <div className="mt-3">
                <p className="font-medium text-sm mb-1">Appeal Reason:</p>
                <p className="text-sm bg-background p-3 rounded">
                  {appeal.reason}
                </p>
              </div>
            </div>

            {error && (
              <Alert type="error">
                {error}
              </Alert>
            )}

            {/* Decision Selection */}
            <div>
              <label id="decision-label" className="block text-sm font-medium mb-3">
                Decision *
              </label>
              <div className="flex gap-4" role="radiogroup" aria-labelledby="decision-label">
                <button
                  type="button"
                  role="radio"
                  aria-checked={decision === 'approve'}
                  onClick={() => setDecision('approve')}
                  className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${
                    decision === 'approve'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border hover:border-green-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className="font-semibold text-lg mb-1">Approve Appeal</div>
                  <div className="text-xs text-muted-foreground">
                    Overturn the original decision
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={decision === 'reject'}
                  onClick={() => setDecision('reject')}
                  className={`flex-1 p-4 border-2 rounded-lg text-center transition-all ${
                    decision === 'reject'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-border hover:border-red-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className="font-semibold text-lg mb-1">Reject Appeal</div>
                  <div className="text-xs text-muted-foreground">
                    Uphold the original decision
                  </div>
                </button>
              </div>
            </div>

            {/* Resolution Explanation */}
            <div>
              <label htmlFor="resolution" className="block text-sm font-medium mb-2">
                Resolution Explanation (Optional)
              </label>
              <TextArea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Provide an explanation for your decision..."
                rows={4}
                maxLength={2000}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {resolution.length}/2000 characters
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
              disabled={isSubmitting || !decision}
              loading={isSubmitting}
            >
              Submit Decision
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  );
}
