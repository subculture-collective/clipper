import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Shield, Edit, Eye, Trash2 } from 'lucide-react';
import type { PlaylistCollaborator, AddCollaboratorRequest } from '@/types/playlist';

interface CollaboratorManagerProps {
    playlistId: string;
    isOwner: boolean;
    canManageCollaborators: boolean;
}

export function CollaboratorManager({ playlistId, isOwner, canManageCollaborators }: CollaboratorManagerProps) {
    const [collaborators, setCollaborators] = useState<PlaylistCollaborator[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCollaboratorUserId, setNewCollaboratorUserId] = useState('');
    const [newCollaboratorPermission, setNewCollaboratorPermission] = useState<'view' | 'edit' | 'admin'>('edit');
    const [submitting, setSubmitting] = useState(false);

    const fetchCollaborators = useCallback(async () => {
        try {
            setLoading(true);
            setError(null); // Clear any previous errors
            const response = await fetch(`/api/v1/playlists/${playlistId}/collaborators`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch collaborators');
            }

            const data = await response.json();
            if (data.success) {
                setCollaborators(data.data || []);
            } else {
                throw new Error(data.error?.message || 'Failed to fetch collaborators');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [playlistId]);

    useEffect(() => {
        fetchCollaborators();
    }, [fetchCollaborators]);

    const addCollaborator = async () => {
        if (!newCollaboratorUserId.trim()) {
            setError('Please enter a user ID');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const requestBody: AddCollaboratorRequest = {
                user_id: newCollaboratorUserId.trim(),
                permission: newCollaboratorPermission,
            };

            const response = await fetch(`/api/v1/playlists/${playlistId}/collaborators`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error?.message || 'Failed to add collaborator');
            }

            // Reset form and refresh list
            setNewCollaboratorUserId('');
            setNewCollaboratorPermission('edit');
            setShowAddForm(false);
            await fetchCollaborators();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const removeCollaborator = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this collaborator?')) {
            return;
        }

        try {
            setError(null); // Clear any previous errors
            const response = await fetch(`/api/v1/playlists/${playlistId}/collaborators/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error?.message || 'Failed to remove collaborator');
            }

            await fetchCollaborators();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const updatePermission = async (userId: string, newPermission: 'view' | 'edit' | 'admin') => {
        try {
            setError(null); // Clear any previous errors
            const response = await fetch(`/api/v1/playlists/${playlistId}/collaborators/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ permission: newPermission }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error?.message || 'Failed to update permission');
            }

            await fetchCollaborators();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const getPermissionIcon = (permission: string) => {
        switch (permission) {
            case 'admin':
                return <Shield className="h-4 w-4 text-red-400" />;
            case 'edit':
                return <Edit className="h-4 w-4 text-blue-400" />;
            case 'view':
                return <Eye className="h-4 w-4 text-green-400" />;
            default:
                return null;
        }
    };

    const getPermissionLabel = (permission: string) => {
        switch (permission) {
            case 'admin':
                return 'Admin';
            case 'edit':
                return 'Can Edit';
            case 'view':
                return 'View Only';
            default:
                return permission;
        }
    };

    return (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">Collaborators</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                        {collaborators.length === 0 
                            ? 'No collaborators yet' 
                            : `${collaborators.length} collaborator${collaborators.length === 1 ? '' : 's'}`
                        }
                    </p>
                </div>
                {canManageCollaborators && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add
                    </button>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Add Collaborator Form */}
            {showAddForm && canManageCollaborators && (
                <div className="mb-6 bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                User ID
                            </label>
                            <input
                                type="text"
                                value={newCollaboratorUserId}
                                onChange={(e) => setNewCollaboratorUserId(e.target.value)}
                                placeholder="Enter user UUID"
                                className="w-full bg-zinc-900 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-purple-500"
                                disabled={submitting}
                            />
                            <p className="text-xs text-zinc-500 mt-1">
                                Enter the user's UUID. You can find this in their profile URL.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Permission Level
                            </label>
                            <select
                                value={newCollaboratorPermission}
                                onChange={(e) => setNewCollaboratorPermission(e.target.value as 'view' | 'edit' | 'admin')}
                                className="w-full bg-zinc-900 text-white px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-purple-500"
                                disabled={submitting}
                            >
                                <option value="view">View Only</option>
                                <option value="edit">Can Edit</option>
                                {isOwner && <option value="admin">Admin</option>}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={addCollaborator}
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                {submitting ? 'Adding...' : 'Add Collaborator'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setError(null);
                                }}
                                disabled={submitting}
                                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Collaborators List */}
            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
                    <p className="mt-4 text-zinc-400">Loading collaborators...</p>
                </div>
            ) : collaborators.length === 0 ? (
                <div className="text-center py-8">
                    <UserPlus className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">No collaborators yet</p>
                    {canManageCollaborators && (
                        <p className="text-sm text-zinc-500 mt-2">
                            Add collaborators to work on this playlist together
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {collaborators.map((collab) => (
                        <div
                            key={collab.id}
                            className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Avatar */}
                                {collab.user?.avatar_url ? (
                                    <img
                                        src={collab.user.avatar_url}
                                        alt={collab.user.display_name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {collab.user?.display_name?.charAt(0) || '?'}
                                    </div>
                                )}

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">
                                        {collab.user?.display_name || 'Unknown User'}
                                    </p>
                                    <p className="text-sm text-zinc-400 truncate">
                                        @{collab.user?.username || collab.user_id}
                                    </p>
                                </div>
                            </div>

                            {/* Permission Badge and Actions */}
                            <div className="flex items-center gap-2">
                                {canManageCollaborators ? (
                                    <select
                                        value={collab.permission}
                                        onChange={(e) => updatePermission(collab.user_id, e.target.value as 'view' | 'edit' | 'admin')}
                                        className="bg-zinc-900 text-white px-3 py-1 rounded text-sm border border-zinc-700 focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="view">View Only</option>
                                        <option value="edit">Can Edit</option>
                                        {isOwner && <option value="admin">Admin</option>}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded text-sm">
                                        {getPermissionIcon(collab.permission)}
                                        <span className="text-zinc-300">{getPermissionLabel(collab.permission)}</span>
                                    </div>
                                )}

                                {canManageCollaborators && (
                                    <button
                                        onClick={() => removeCollaborator(collab.user_id)}
                                        className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                                        title="Remove collaborator"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
