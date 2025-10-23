import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { Alert } from '../ui/Alert';
import { submitReport } from '@/lib/report-api';
import type { CreateReportRequest } from '@/types/report';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  reportableType: 'clip' | 'comment' | 'user';
  reportableId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading content' },
  { value: 'harassment', label: 'Harassment or hate speech' },
  { value: 'nsfw', label: 'NSFW or inappropriate content' },
  { value: 'violence', label: 'Violence or threats' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other' },
] as const;

export function ReportModal({ open, onClose, reportableType, reportableId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: CreateReportRequest = {
        reportable_type: reportableType,
        reportable_id: reportableId,
        reason: selectedReason as CreateReportRequest['reason'],
        description: description.trim() || undefined,
      };

      await submitReport(data);
      setSuccess(true);
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        // Reset form
        setSelectedReason('');
        setDescription('');
        setSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !success) {
      setSelectedReason('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Report ${reportableType}`}
      size="md"
    >
      {success ? (
        <div className="py-8 text-center">
          <div className="mb-4 text-green-500">
            <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Thank you for your report</h3>
          <p className="text-muted-foreground">
            Our moderation team will review this report shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" onDismiss={() => setError(null)}>
              {error}
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Reason for reporting *
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mr-3"
                  />
                  <span>{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Additional details (optional)
            </label>
            <TextArea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide any additional context that might help our moderators..."
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={!selectedReason || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            False reports may result in action against your account
          </p>
        </form>
      )}
    </Modal>
  );
}
