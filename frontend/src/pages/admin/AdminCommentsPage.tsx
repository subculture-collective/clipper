import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Alert,
    Badge,
    Button,
    Card,
    Container,
    Modal,
    Spinner,
    TextArea,
} from '../../components';
import { useAuth } from '../../context/AuthContext';
import {
    approveQueueItem,
    bulkModerate,
    getModerationQueue,
    getModerationStats,
    rejectQueueItem,
    type ModerationQueueItem,
    type ModerationQueueStats,
} from '../../lib/moderation-api';

// Helper function to extract error message from API error
function getErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const apiError = error as { response?: { data?: { error?: string } } };
        return apiError.response?.data?.error || 'An error occurred';
    }
    return 'An error occurred';
}

export function AdminCommentsPage() {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<ModerationQueueItem[]>([]);
    const [stats, setStats] = useState<ModerationQueueStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Filters - fixed to comments only
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    
    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Rejection modal state
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Data loaders
    const loadQueue = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getModerationQueue(
                statusFilter,
                'comment', // Fixed to comment content type
                50
            );
            setItems(response.data || []);
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to load comment moderation queue');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    const loadStats = useCallback(async () => {
        try {
            const response = await getModerationStats();
            setStats(response.data);
        } catch (err: unknown) {
            console.error('Failed to load stats:', err);
        }
    }, []);

    // Bulk action handlers
    const handleBulkApprove = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const result = await bulkModerate({
                item_ids: Array.from(selectedIds),
                action: 'approve',
            });
            setSuccess(
                `${result.processed} of ${result.total} comments approved successfully!`
            );
            setSelectedIds(new Set());
            loadQueue();
            loadStats();
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to approve comments');
        }
    }, [selectedIds, loadQueue, loadStats]);

    const handleBulkReject = useCallback(async () => {
        if (selectedIds.size === 0) return;

        try {
            const result = await bulkModerate({
                item_ids: Array.from(selectedIds),
                action: 'reject',
            });
            setSuccess(
                `${result.processed} of ${result.total} comments rejected successfully!`
            );
            setSelectedIds(new Set());
            loadQueue();
            loadStats();
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to reject comments');
        }
    }, [selectedIds, loadQueue, loadStats]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Only handle shortcuts when not in an input field
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            if (e.key === 'a' && selectedIds.size > 0) {
                e.preventDefault();
                handleBulkApprove();
            } else if (e.key === 'r' && selectedIds.size > 0) {
                e.preventDefault();
                handleBulkReject();
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [selectedIds, handleBulkApprove, handleBulkReject]);

    useEffect(() => {
        if (!isAuthenticated || !isAdmin) {
            navigate('/');
            return;
        }

        loadQueue();
        loadStats();
    }, [isAuthenticated, isAdmin, navigate, loadQueue, loadStats]);

    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [statusFilter]);

    // Auto-dismiss success messages after 5 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const handleApprove = async (itemId: string) => {
        try {
            await approveQueueItem(itemId);
            setSuccess('Comment approved successfully!');
            loadQueue();
            loadStats();
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to approve comment');
        }
    };

    const openRejectModal = (itemId: string) => {
        setSelectedItemId(itemId);
        setRejectModalOpen(true);
        setRejectionReason('');
    };

    const handleReject = async () => {
        if (!selectedItemId) {
            return;
        }

        try {
            await rejectQueueItem(selectedItemId, rejectionReason || undefined);
            setSuccess('Comment rejected successfully!');
            setRejectModalOpen(false);
            setSelectedItemId(null);
            setRejectionReason('');
            loadQueue();
            loadStats();
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Failed to reject comment');
        }
    };

    const toggleSelection = (itemId: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedIds(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map((item) => item.id)));
        }
    };

    if (!isAuthenticated || !isAdmin) {
        return null;
    }

    // Filter stats to show only comment-related counts
    const commentStats = stats
        ? {
              total_pending: stats.by_content_type?.comment || 0,
              high_priority: items.filter((i) => i.priority >= 75).length,
          }
        : null;

    return (
        <Container className='py-8'>
            <div className='max-w-6xl mx-auto'>
                <div className='mb-6'>
                    <h1 className='mb-2 text-3xl font-bold'>
                        Comment Moderation Queue
                    </h1>
                    <p className='text-muted-foreground'>
                        Review and moderate flagged comments with bulk actions
                    </p>
                    <p className='text-muted-foreground text-sm mt-2'>
                        Keyboard shortcuts: A to approve • R to reject (when comments selected)
                    </p>
                </div>

                {error && (
                    <Alert
                        variant='error'
                        className='mb-6'
                    >
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert
                        variant='success'
                        className='mb-6'
                    >
                        {success}
                    </Alert>
                )}

                {/* Stats */}
                {commentStats && (
                    <Card className='p-4 mb-6'>
                        <div className='gap-6 grid grid-cols-2'>
                            <div>
                                <div className='text-2xl font-bold'>
                                    {commentStats.total_pending}
                                </div>
                                <div className='text-muted-foreground text-sm'>
                                    Pending Comments
                                </div>
                            </div>
                            <div>
                                <div className='text-2xl font-bold text-yellow-600'>
                                    {commentStats.high_priority}
                                </div>
                                <div className='text-muted-foreground text-sm'>
                                    High Priority
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Filters */}
                <Card className='p-4 mb-6'>
                    <div className='flex gap-4 items-center'>
                        <div className='flex-1'>
                            <label className='block mb-2 text-sm font-medium'>
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className='bg-background-secondary border-border focus:ring-primary focus:border-primary block px-3 py-2 w-full rounded border'
                            >
                                <option value='pending'>Pending</option>
                                <option value='approved'>Approved</option>
                                <option value='rejected'>Rejected</option>
                                <option value='escalated'>Escalated</option>
                            </select>
                        </div>
                        <div className='self-end'>
                            <Button
                                onClick={() => {
                                    loadQueue();
                                    loadStats();
                                }}
                                variant='secondary'
                                disabled={isLoading}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <Card className='bg-blue-50 dark:bg-blue-900/20 p-4 mb-4'>
                        <div className='flex justify-between items-center'>
                            <span className='font-medium'>
                                {selectedIds.size} comment{selectedIds.size !== 1 ? 's' : ''} selected
                            </span>
                            <div className='space-x-2'>
                                <Button
                                    onClick={handleBulkApprove}
                                    variant='primary'
                                    className='hover:bg-green-700 bg-green-600'
                                >
                                    Approve All (A)
                                </Button>
                                <Button
                                    onClick={handleBulkReject}
                                    className='bg-red-600/90 hover:bg-red-600 text-white'
                                >
                                    Reject All (R)
                                </Button>
                                <Button
                                    onClick={() => setSelectedIds(new Set())}
                                    variant='secondary'
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Queue Items */}
                <Card className='p-6'>
                    {isLoading ? (
                        <div className='flex justify-center py-12'>
                            <Spinner size='lg' />
                        </div>
                    ) : !items || items.length === 0 ? (
                        <div className='py-12 text-center'>
                            <p className='text-muted-foreground'>
                                No comments in the moderation queue.
                            </p>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            {/* Select All */}
                            <div className='flex items-center gap-2 pb-2 border-b'>
                                <input
                                    type='checkbox'
                                    checked={selectedIds.size === items.length && items.length > 0}
                                    onChange={toggleSelectAll}
                                    className='rounded'
                                />
                                <span className='text-sm font-medium'>
                                    Select All
                                </span>
                            </div>

                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className='bg-background-secondary hover:bg-background-tertiary p-4 rounded-lg transition-colors'
                                >
                                    <div className='flex gap-4 items-start'>
                                        {/* Checkbox */}
                                        <input
                                            type='checkbox'
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelection(item.id)}
                                            className='mt-1 rounded'
                                        />

                                        {/* Content */}
                                        <div className='flex-1'>
                                            <div className='flex gap-2 items-center mb-2'>
                                                <Badge variant='default'>
                                                    Comment
                                                </Badge>
                                                <Badge
                                                    variant={
                                                        item.priority >= 75
                                                            ? 'error'
                                                            : item.priority >= 50
                                                            ? 'warning'
                                                            : 'default'
                                                    }
                                                >
                                                    Priority: {item.priority}
                                                </Badge>
                                                {item.auto_flagged && (
                                                    <Badge variant='warning'>
                                                        Auto-flagged
                                                    </Badge>
                                                )}
                                                {item.report_count > 0 && (
                                                    <Badge variant='error'>
                                                        {item.report_count} report{item.report_count !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className='text-muted-foreground space-y-1 text-sm'>
                                                <p>
                                                    <span className='font-medium'>Reason:</span> {item.reason}
                                                </p>
                                                <p>
                                                    <span className='font-medium'>Comment ID:</span>{' '}
                                                    {item.content_id}
                                                </p>
                                                <p>
                                                    <span className='font-medium'>Created:</span>{' '}
                                                    {new Date(item.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {statusFilter === 'pending' && (
                                            <div className='flex gap-2'>
                                                <Button
                                                    onClick={() => handleApprove(item.id)}
                                                    variant='primary'
                                                    size='sm'
                                                    className='hover:bg-green-700 bg-green-600'
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    onClick={() => openRejectModal(item.id)}
                                                    size='sm'
                                                    className='bg-red-600/90 hover:bg-red-600 text-white'
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Reject Modal */}
            {rejectModalOpen && (
                <Modal
                    open={rejectModalOpen}
                    onClose={() => {
                        setRejectModalOpen(false);
                        setSelectedItemId(null);
                        setRejectionReason('');
                    }}
                    title='Reject Comment'
                >
                    <div className='space-y-4'>
                        <p className='text-muted-foreground'>
                            Please provide a reason for rejecting this comment (optional).
                        </p>
                        <TextArea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder='Reason for rejection...'
                            rows={4}
                        />
                        <div className='flex gap-3'>
                            <Button
                                onClick={handleReject}
                                className='hover:bg-red-700 flex-1 bg-red-600'
                            >
                                Reject Comment
                            </Button>
                            <Button
                                onClick={() => {
                                    setRejectModalOpen(false);
                                    setSelectedItemId(null);
                                    setRejectionReason('');
                                }}
                                variant='secondary'
                                className='flex-1'
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </Container>
    );
}
