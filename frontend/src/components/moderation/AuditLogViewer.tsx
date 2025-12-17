import { useEffect, useState, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import {
    getModerationAuditLogs,
    type ModerationDecisionWithDetails,
} from '../../lib/moderation-api';

export function AuditLogViewer() {
    const [logs, setLogs] = useState<ModerationDecisionWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({
        moderator_id: '',
        action: '',
        start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
        limit: 50,
        offset: 0,
    });

    const loadLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getModerationAuditLogs(filters);
            setLogs(response.data);
            setTotal(response.meta.total);
        } catch (err) {
            setError('Failed to load audit logs');
            console.error('Audit logs error:', err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleExportCSV = () => {
        if (logs.length === 0) return;

        // Create CSV header
        const headers = [
            'Timestamp',
            'Moderator',
            'Action',
            'Content Type',
            'Content ID',
            'Reason',
        ];

        // Create CSV rows
        const rows = logs.map((log) => [
            format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
            log.moderator_name,
            log.action,
            log.content_type,
            log.content_id,
            log.reason || '',
        ]);

        // Combine into CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map((row) =>
                row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            ),
        ].join('\n');

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute(
            'download',
            `moderation-audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
        );
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePageChange = (newOffset: number) => {
        setFilters({ ...filters, offset: newOffset });
    };

    const currentPage = Math.floor(filters.offset / filters.limit) + 1;
    const totalPages = Math.ceil(total / filters.limit);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-lg text-gray-600">Loading audit logs...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-red-800">{error}</p>
                <button
                    onClick={loadLogs}
                    className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
                <button
                    onClick={handleExportCSV}
                    disabled={logs.length === 0}
                    className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                    Export to CSV
                </button>
            </div>

            {/* Filters */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div>
                        <label
                            htmlFor="action-filter"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Action
                        </label>
                        <select
                            id="action-filter"
                            value={filters.action}
                            onChange={(e) =>
                                setFilters({ ...filters, action: e.target.value, offset: 0 })
                            }
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="">All Actions</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                            <option value="escalate">Escalate</option>
                        </select>
                    </div>
                    <div>
                        <label
                            htmlFor="start-date-filter"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Start Date
                        </label>
                        <input
                            id="start-date-filter"
                            type="date"
                            value={filters.start_date}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    start_date: e.target.value,
                                    offset: 0,
                                })
                            }
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="end-date-filter"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            End Date
                        </label>
                        <input
                            id="end-date-filter"
                            type="date"
                            value={filters.end_date}
                            onChange={(e) =>
                                setFilters({ ...filters, end_date: e.target.value, offset: 0 })
                            }
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="limit-filter"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Per Page
                        </label>
                        <select
                            id="limit-filter"
                            value={filters.limit}
                            onChange={(e) =>
                                setFilters({
                                    ...filters,
                                    limit: parseInt(e.target.value),
                                    offset: 0,
                                })
                            }
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Moderator
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Action
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Content Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Reason
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-6 py-4 text-center text-sm text-gray-500"
                                >
                                    No audit logs found
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {format(
                                            new Date(log.created_at),
                                            'yyyy-MM-dd HH:mm:ss'
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {log.moderator_name}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                log.action === 'approve'
                                                    ? 'bg-green-100 text-green-800'
                                                    : log.action === 'reject'
                                                      ? 'bg-red-100 text-red-800'
                                                      : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                        >
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {log.content_type}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {log.reason || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {filters.offset + 1} to{' '}
                        {Math.min(filters.offset + filters.limit, total)} of {total} results
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() =>
                                handlePageChange(
                                    Math.max(0, filters.offset - filters.limit)
                                )
                            }
                            disabled={filters.offset === 0}
                            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                        >
                            Previous
                        </button>
                        <span className="flex items-center px-4 text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() =>
                                handlePageChange(filters.offset + filters.limit)
                            }
                            disabled={filters.offset + filters.limit >= total}
                            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
