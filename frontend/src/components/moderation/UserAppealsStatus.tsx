import { useState, useEffect, useCallback } from 'react';
import { Alert } from '../ui/Alert';
import { getUserAppeals, type ModerationAppeal } from '@/lib/moderation-api';
import { getErrorMessage } from '@/lib/error-utils';

export function UserAppealsStatus() {
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getUserAppeals();
      setAppeals(response.data || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load appeals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error">
        {error}
      </Alert>
    );
  }

  if (appeals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>You haven't submitted any appeals yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-6">My Appeals</h2>
      
      {appeals.map((appeal) => (
        <div
          key={appeal.id}
          className="border border-border rounded-lg p-6 bg-card"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg">
                  Appeal for {appeal.decision_action ?? 'Unknown'} Action
                </h3>
                {getStatusBadge(appeal.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Submitted: {formatDate(appeal.created_at)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Original Decision:
              </p>
              <p className="text-sm">
                {appeal.decision_reason || 'No reason provided'}
              </p>
              <p className="text-sm text-muted-foreground">
                Content: {appeal.content_type ?? 'Unknown'} (ID: {appeal.content_id ?? 'N/A'})
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Your Appeal:
              </p>
              <p className="text-sm bg-muted p-3 rounded">
                {appeal.reason}
              </p>
            </div>

            {appeal.status === 'pending' && (
              <Alert type="info">
                Your appeal is being reviewed by our moderation team. 
                We'll notify you once a decision has been made.
              </Alert>
            )}

            {appeal.status === 'approved' && (
              <div>
                <Alert type="success">
                  Your appeal has been approved. The original decision has been overturned.
                </Alert>
                {appeal.resolution && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Moderator's Note:
                    </p>
                    <p className="text-sm bg-muted p-3 rounded">
                      {appeal.resolution}
                    </p>
                  </div>
                )}
                {appeal.resolved_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved: {formatDate(appeal.resolved_at)}
                  </p>
                )}
              </div>
            )}

            {appeal.status === 'rejected' && (
              <div>
                <Alert type="error">
                  Your appeal has been rejected. The original decision stands.
                </Alert>
                {appeal.resolution && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Moderator's Note:
                    </p>
                    <p className="text-sm bg-muted p-3 rounded">
                      {appeal.resolution}
                    </p>
                  </div>
                )}
                {appeal.resolved_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resolved: {formatDate(appeal.resolved_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
