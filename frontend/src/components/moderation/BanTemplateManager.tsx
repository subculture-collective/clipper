import { useState, useEffect } from 'react';
import { Button, Modal, ModalFooter, Alert, Input, TextArea } from '../ui';
import {
    getBanReasonTemplates,
    createBanReasonTemplate,
    updateBanReasonTemplate,
    deleteBanReasonTemplate,
    getBanReasonTemplateStats,
    type BanReasonTemplate,
    type CreateBanReasonTemplateRequest,
    type UpdateBanReasonTemplateRequest,
} from '../../lib/moderation-api';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, BarChart3 } from 'lucide-react';

export interface BanTemplateManagerProps {
    /**
     * Twitch broadcaster ID for channel-specific templates
     */
    broadcasterID?: string;
    /**
     * Whether to show usage statistics
     */
    showStats?: boolean;
}

/**
 * BanTemplateManager component for managing ban reason templates
 * 
 * Features:
 * - View all templates (default + custom)
 * - Create new templates
 * - Edit existing templates
 * - Delete custom templates
 * - View usage statistics
 */
export function BanTemplateManager({
    broadcasterID,
    showStats = true,
}: BanTemplateManagerProps) {
    const toast = useToast();
    const [templates, setTemplates] = useState<BanReasonTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<BanReasonTemplate | null>(null);
    
    // Form states
    const [formName, setFormName] = useState('');
    const [formReason, setFormReason] = useState('');
    const [formDuration, setFormDuration] = useState<string>('');
    const [formIsPermanent, setFormIsPermanent] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Stats
    const [stats, setStats] = useState<BanReasonTemplate[]>([]);

    // Load templates
    const loadTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getBanReasonTemplates(broadcasterID, true);
            setTemplates(response.templates);
        } catch (err) {
            setError('Failed to load templates');
            toast.error('Failed to load ban templates');
        } finally {
            setLoading(false);
        }
    };

    // Load stats
    const loadStats = async () => {
        try {
            const response = await getBanReasonTemplateStats(broadcasterID);
            setStats(response.templates);
        } catch (err) {
            toast.error('Failed to load template statistics');
        }
    };

    useEffect(() => {
        loadTemplates();
    }, [broadcasterID]);

    const resetForm = () => {
        setFormName('');
        setFormReason('');
        setFormDuration('');
        setFormIsPermanent(true);
        setSelectedTemplate(null);
    };

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            const request: CreateBanReasonTemplateRequest = {
                name: formName,
                reason: formReason,
                duration_seconds: formIsPermanent ? null : parseInt(formDuration, 10),
                broadcaster_id: broadcasterID,
            };
            await createBanReasonTemplate(request);
            toast.success('Template created successfully');
            setShowCreateModal(false);
            resetForm();
            loadTemplates();
        } catch (err) {
            toast.error('Failed to create template');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedTemplate) return;
        
        setSubmitting(true);
        try {
            const request: UpdateBanReasonTemplateRequest = {
                name: formName,
                reason: formReason,
                duration_seconds: formIsPermanent ? null : parseInt(formDuration, 10),
            };
            await updateBanReasonTemplate(selectedTemplate.id, request);
            toast.success('Template updated successfully');
            setShowEditModal(false);
            resetForm();
            loadTemplates();
        } catch (err) {
            toast.error('Failed to update template');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedTemplate) return;
        
        setSubmitting(true);
        try {
            await deleteBanReasonTemplate(selectedTemplate.id);
            toast.success('Template deleted successfully');
            setShowDeleteModal(false);
            resetForm();
            loadTemplates();
        } catch (err) {
            toast.error('Failed to delete template');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (template: BanReasonTemplate) => {
        setSelectedTemplate(template);
        setFormName(template.name);
        setFormReason(template.reason);
        if (template.duration_seconds === null || template.duration_seconds === undefined) {
            setFormIsPermanent(true);
            setFormDuration('');
        } else {
            setFormIsPermanent(false);
            setFormDuration(template.duration_seconds.toString());
        }
        setShowEditModal(true);
    };

    const openDeleteModal = (template: BanReasonTemplate) => {
        setSelectedTemplate(template);
        setShowDeleteModal(true);
    };

    const openStatsModal = async () => {
        await loadStats();
        setShowStatsModal(true);
    };

    const formatDuration = (seconds?: number | null) => {
        if (seconds === null || seconds === undefined) return 'Permanent';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
        return `${Math.round(seconds / 86400)}d`;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Ban Reason Templates</h2>
                <div className="flex gap-2">
                    {showStats && (
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<BarChart3 className="h-4 w-4" />}
                            onClick={openStatsModal}
                        >
                            View Stats
                        </Button>
                    )}
                    <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Plus className="h-4 w-4" />}
                        onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                    >
                        Create Template
                    </Button>
                </div>
            </div>

            {error && (
                <Alert variant="error" role="alert">
                    {error}
                </Alert>
            )}

            {loading ? (
                <div className="text-center py-8">Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No templates found. Create your first template to get started.
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white">
                                        {template.name}
                                    </h3>
                                    {template.is_default && (
                                        <span className="text-xs text-blue-600 dark:text-blue-400">
                                            Default
                                        </span>
                                    )}
                                </div>
                                {!template.is_default && (
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEditModal(template)}
                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            aria-label="Edit template"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(template)}
                                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                            aria-label="Delete template"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {template.reason}
                            </p>
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>Duration: {formatDuration(template.duration_seconds)}</span>
                                <span>Used: {template.usage_count} times</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Modal
                open={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    resetForm();
                }}
                title="Create Ban Reason Template"
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="template-name" className="block text-sm font-medium mb-2">
                            Template Name
                        </label>
                        <Input
                            id="template-name"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="e.g., Spam"
                            maxLength={100}
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="template-reason" className="block text-sm font-medium mb-2">
                            Ban Reason
                        </label>
                        <TextArea
                            id="template-reason"
                            value={formReason}
                            onChange={(e) => setFormReason(e.target.value)}
                            placeholder="Enter the ban reason text..."
                            rows={3}
                            maxLength={1000}
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Ban Duration
                        </label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="permanent-create"
                                    checked={formIsPermanent}
                                    onChange={() => setFormIsPermanent(true)}
                                    disabled={submitting}
                                />
                                <label htmlFor="permanent-create">Permanent</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="temporary-create"
                                    checked={!formIsPermanent}
                                    onChange={() => setFormIsPermanent(false)}
                                    disabled={submitting}
                                />
                                <label htmlFor="temporary-create">Temporary</label>
                            </div>
                        </div>
                        {!formIsPermanent && (
                            <div className="mt-2">
                                <Input
                                    type="number"
                                    value={formDuration}
                                    onChange={(e) => setFormDuration(e.target.value)}
                                    placeholder="Duration in seconds"
                                    min={1}
                                    max={1209600}
                                    disabled={submitting}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Max: 1,209,600 seconds (14 days)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowCreateModal(false);
                            resetForm();
                        }}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreate}
                        loading={submitting}
                        disabled={!formName || !formReason || (!formIsPermanent && !formDuration)}
                    >
                        Create Template
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Modal */}
            <Modal
                open={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    resetForm();
                }}
                title="Edit Ban Reason Template"
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="template-name-edit" className="block text-sm font-medium mb-2">
                            Template Name
                        </label>
                        <Input
                            id="template-name-edit"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            maxLength={100}
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label htmlFor="template-reason-edit" className="block text-sm font-medium mb-2">
                            Ban Reason
                        </label>
                        <TextArea
                            id="template-reason-edit"
                            value={formReason}
                            onChange={(e) => setFormReason(e.target.value)}
                            rows={3}
                            maxLength={1000}
                            disabled={submitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Ban Duration
                        </label>
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="permanent-edit"
                                    checked={formIsPermanent}
                                    onChange={() => setFormIsPermanent(true)}
                                    disabled={submitting}
                                />
                                <label htmlFor="permanent-edit">Permanent</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="temporary-edit"
                                    checked={!formIsPermanent}
                                    onChange={() => setFormIsPermanent(false)}
                                    disabled={submitting}
                                />
                                <label htmlFor="temporary-edit">Temporary</label>
                            </div>
                        </div>
                        {!formIsPermanent && (
                            <div className="mt-2">
                                <Input
                                    type="number"
                                    value={formDuration}
                                    onChange={(e) => setFormDuration(e.target.value)}
                                    placeholder="Duration in seconds"
                                    min={1}
                                    max={1209600}
                                    disabled={submitting}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowEditModal(false);
                            resetForm();
                        }}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleEdit}
                        loading={submitting}
                        disabled={!formName || !formReason || (!formIsPermanent && !formDuration)}
                    >
                        Save Changes
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    resetForm();
                }}
                title="Delete Template"
            >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Are you sure you want to delete the template &quot;{selectedTemplate?.name}&quot;? 
                    This action cannot be undone.
                </p>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowDeleteModal(false);
                            resetForm();
                        }}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        loading={submitting}
                    >
                        Delete Template
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Stats Modal */}
            <Modal
                open={showStatsModal}
                onClose={() => setShowStatsModal(false)}
                title="Template Usage Statistics"
            >
                <div className="space-y-4">
                    {stats.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            No usage statistics available yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {stats.map((template) => (
                                <div
                                    key={template.id}
                                    className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded"
                                >
                                    <div>
                                        <p className="font-medium">{template.name}</p>
                                        {template.last_used_at && (
                                            <p className="text-xs text-gray-500">
                                                Last used: {new Date(template.last_used_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{template.usage_count}</p>
                                        <p className="text-xs text-gray-500">times used</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setShowStatsModal(false)}
                    >
                        Close
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
