import { useState } from 'react';
import { ModerationAnalyticsDashboard } from '../../components/moderation/ModerationAnalyticsDashboard';
import { AuditLogViewer } from '../../components/moderation/AuditLogViewer';

type TabType = 'analytics' | 'audit';

export default function AdminModerationAnalyticsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('analytics');

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Moderation Analytics & Audit Logs
                    </h1>
                    <p className="mt-2 text-gray-600">
                        View analytics, trends, and audit logs for moderation actions
                    </p>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('analytics')}
                            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                                activeTab === 'analytics'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            Analytics Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                                activeTab === 'audit'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            Audit Logs
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="rounded-lg bg-white p-6 shadow">
                    {activeTab === 'analytics' ? (
                        <ModerationAnalyticsDashboard />
                    ) : (
                        <AuditLogViewer />
                    )}
                </div>
            </div>
        </div>
    );
}
