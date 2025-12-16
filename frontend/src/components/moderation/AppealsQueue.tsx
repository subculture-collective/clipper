import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { getAdminAppeals, type ModerationAppeal } from '@/lib/moderation-api';
import { AppealResolutionModal } from './AppealResolutionModal';
import { getErrorMessage } from '@/lib/error-utils';

interface AppealsQueueProps {
  initialStatus?: 'pending' | 'approved' | 'rejected';
}

export function AppealsQueue({ initialStatus = 'pending' }: AppealsQueueProps) {
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(initialStatus);
  const [selectedAppeal, setSelectedAppeal] = useState<ModerationAppeal | null>(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);

  const loadAppeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAdminAppeals(status);
      setAppeals(response.data || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load appeals'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppeals();
  }, [status]);

  const handleResolveClick = (appeal: ModerationAppeal) => {
    setSelectedAppeal(appeal);
    setResolutionModalOpen(true);
  };

  const handleResolutionSuccess = () => {
    loadAppeals();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appeals Queue</h2>
        <div className="flex gap-2">
          <Button
            variant={status === 'pending' ? 'primary' : 'secondary'}
            onClick={() => setStatus('pending')}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={status === 'approved' ? 'primary' : 'secondary'}
            onClick={() => setStatus('approved')}
            size="sm"
          >
            Approved
          </Button>
          <Button
            variant={status === 'rejected' ? 'primary' : 'secondary'}
            onClick={() => setStatus('rejected')}
            size="sm"
          >
            Rejected
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : appeals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No {status} appeals found
        </div>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <div
              key={appeal.id}
              className="border border-border rounded-lg p-6 bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      {appeal.username || 'Unknown User'}
                    </h3>
                    {getStatusBadge(appeal.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Appeal ID: {appeal.id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted: {formatDate(appeal.created_at)}
                  </p>
                </div>
                {appeal.status === 'pending' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleResolveClick(appeal)}
                  >
                    Review
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Original Decision:
                  </p>
                  <p className="text-sm">
                    Action: <span className="font-medium">{appeal.decision_action}</span>
                    {appeal.decision_reason && ` - ${appeal.decision_reason}`}
                  </p>
                  <p className="text-sm">
                    Content: <span className="font-medium">{appeal.content_type}</span> (ID: {appeal.content_id})
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Appeal Reason:
                  </p>
                  <p className="text-sm bg-muted p-3 rounded">
                    {appeal.reason}
                  </p>
                </div>

                {appeal.resolution && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Resolution:
                    </p>
                    <p className="text-sm bg-muted p-3 rounded">
                      {appeal.resolution}
                    </p>
                    {appeal.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Resolved: {formatDate(appeal.resolved_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAppeal && (
        <AppealResolutionModal
          open={resolutionModalOpen}
          onClose={() => {
            setResolutionModalOpen(false);
            setSelectedAppeal(null);
          }}
          appeal={selectedAppeal}
          onSuccess={handleResolutionSuccess}
        />
      )}
    </div>
  );
}
