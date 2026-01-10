import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    Input,
    Modal,
    ModalFooter,
    Spinner,
    Avatar,
} from '../ui';
import {
    addChannelModerator,
    listChannelModerators,
    removeChannelModerator,
    updateModeratorPermissions,
    type ChannelModerator,
} from '../../lib/moderation-api';
import { searchUsersAutocomplete, type UserSuggestion } from '../../lib/user-api';
import { getErrorMessage } from '../../lib/error-utils';

export interface ModeratorManagerProps {
    /**
     * Channel ID to manage moderators for
     */
    channelId: string;
    /**
     * Whether the current user can manage moderators
     */
    canManage?: boolean;
}

/**
 * ModeratorManager component for managing channel moderators
 * 
 * Features:
 * - List current moderators with pagination
 * - Search and add new moderators
 * - Remove moderators with confirmation
 * - Edit moderator permissions
 * - Search/filter moderators
 * - Loading states and error handling
 * - Responsive design
 * - Accessibility (ARIA labels, keyboard navigation)
 */
export function ModeratorManager({ channelId, canManage = false }: ModeratorManagerProps) {
    // State
    const [moderators, setModerators] = useState<ChannelModerator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Pagination
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [limit] = useState(20);

    // Search/filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredModerators, setFilteredModerators] = useState<ChannelModerator[]>([]);

    // Add moderator modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
    const [isAddingModerator, setIsAddingModerator] = useState(false);

    // Remove moderator modal
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [moderatorToRemove, setModeratorToRemove] = useState<ChannelModerator | null>(null);
    const [isRemovingModerator, setIsRemovingModerator] = useState(false);

    // Edit permissions modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [moderatorToEdit, setModeratorToEdit] = useState<ChannelModerator | null>(null);
    const [newRole, setNewRole] = useState<'moderator' | 'admin'>('moderator');
    const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

    // Load moderators
    const loadModerators = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listChannelModerators(channelId, limit, offset);
            setModerators(response.data || []);
            setTotal(response.meta.total || 0);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to load moderators'));
        } finally {
            setIsLoading(false);
        }
    }, [channelId, limit, offset]);

    // Load moderators on mount and when dependencies change
    useEffect(() => {
        loadModerators();
    }, [loadModerators]);

    // Filter moderators based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredModerators(moderators);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = moderators.filter(
            (mod) =>
                mod.username?.toLowerCase().includes(query) ||
                mod.display_name?.toLowerCase().includes(query)
        );
        setFilteredModerators(filtered);
    }, [moderators, searchQuery]);

    // Search users for adding as moderator
    const searchUsers = useCallback(async (query: string) => {
        if (!query.trim()) {
            setUserSuggestions([]);
            return;
        }

        try {
            const suggestions = await searchUsersAutocomplete(query, 10);
            setUserSuggestions(suggestions);
        } catch (err: unknown) {
            console.error('Failed to search users:', err);
            setUserSuggestions([]);
        }
    }, []);

    // Debounce user search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchUsers(userSearchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [userSearchQuery, searchUsers]);

    // Handle add moderator
    const handleAddModerator = useCallback(async () => {
        if (!selectedUser) return;

        try {
            setIsAddingModerator(true);
            setError(null);
            await addChannelModerator({
                userId: selectedUser.id,
                channelId,
            });
            setSuccess(`Successfully added ${selectedUser.username} as a moderator`);
            setShowAddModal(false);
            setSelectedUser(null);
            setUserSearchQuery('');
            setUserSuggestions([]);
            await loadModerators();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to add moderator'));
        } finally {
            setIsAddingModerator(false);
        }
    }, [selectedUser, channelId, loadModerators]);

    // Handle remove moderator
    const handleRemoveModerator = useCallback(async () => {
        if (!moderatorToRemove) return;

        try {
            setIsRemovingModerator(true);
            setError(null);
            await removeChannelModerator(moderatorToRemove.id);
            setSuccess(
                `Successfully removed ${moderatorToRemove.username || 'moderator'} from moderators`
            );
            setShowRemoveModal(false);
            setModeratorToRemove(null);
            await loadModerators();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to remove moderator'));
        } finally {
            setIsRemovingModerator(false);
        }
    }, [moderatorToRemove, loadModerators]);

    // Handle update permissions
    const handleUpdatePermissions = useCallback(async () => {
        if (!moderatorToEdit) return;

        try {
            setIsUpdatingPermissions(true);
            setError(null);
            await updateModeratorPermissions(moderatorToEdit.id, { role: newRole });
            setSuccess(
                `Successfully updated ${moderatorToEdit.username || 'moderator'}'s permissions to ${newRole}`
            );
            setShowEditModal(false);
            setModeratorToEdit(null);
            await loadModerators();
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Failed to update permissions'));
        } finally {
            setIsUpdatingPermissions(false);
        }
    }, [moderatorToEdit, newRole, loadModerators]);

    // Open remove modal
    const openRemoveModal = (moderator: ChannelModerator) => {
        setModeratorToRemove(moderator);
        setShowRemoveModal(true);
    };

    // Open edit modal
    const openEditModal = (moderator: ChannelModerator) => {
        setModeratorToEdit(moderator);
        setNewRole(moderator.role === 'admin' ? 'admin' : 'moderator');
        setShowEditModal(true);
    };

    // Pagination handlers
    const handlePreviousPage = () => {
        setOffset(Math.max(0, offset - limit));
    };

    const handleNextPage = () => {
        if (offset + limit < total) {
            setOffset(offset + limit);
        }
    };

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = offset + limit < total;
    const hasPreviousPage = offset > 0;

    return (
        <div className="space-y-4" role="region" aria-label="Moderator Management">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Moderators</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage moderators for this channel
                    </p>
                </div>
                {canManage && (
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="primary"
                        aria-label="Add new moderator"
                    >
                        Add Moderator
                    </Button>
                )}
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="error" onClose={() => setError(null)} role="alert">
                    {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)} role="alert">
                    {success}
                </Alert>
            )}

            {/* Search */}
            <div className="flex items-center gap-2">
                <Input
                    type="text"
                    placeholder="Search moderators..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                    aria-label="Search moderators"
                />
            </div>

            {/* Moderators list */}
            <Card>
                {isLoading ? (
                    <div className="flex justify-center items-center py-12" role="status">
                        <Spinner size="lg" aria-label="Loading moderators" />
                    </div>
                ) : filteredModerators.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">
                            {searchQuery ? 'No moderators found matching your search' : 'No moderators yet'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full" role="table">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4 font-semibold text-foreground" scope="col">
                                        User
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-foreground" scope="col">
                                        Role
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-foreground" scope="col">
                                        Added On
                                    </th>
                                    {canManage && (
                                        <th className="text-right py-3 px-4 font-semibold text-foreground" scope="col">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredModerators.map((moderator) => (
                                    <tr
                                        key={moderator.id}
                                        className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={moderator.avatar_url}
                                                    alt={moderator.username || 'User'}
                                                    size="sm"
                                                />
                                                <div>
                                                    <div className="font-medium text-foreground">
                                                        {moderator.display_name || moderator.username}
                                                    </div>
                                                    {moderator.username && moderator.display_name && (
                                                        <div className="text-sm text-muted-foreground">
                                                            @{moderator.username}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <Badge
                                                variant={
                                                    moderator.role === 'owner'
                                                        ? 'default'
                                                        : moderator.role === 'admin'
                                                          ? 'success'
                                                          : 'info'
                                                }
                                            >
                                                {moderator.role}
                                            </Badge>
                                        </td>
                                        <td className="py-3 px-4 text-muted-foreground">
                                            {new Date(moderator.assigned_at).toLocaleDateString()}
                                        </td>
                                        {canManage && (
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {moderator.role !== 'owner' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => openEditModal(moderator)}
                                                                aria-label={`Edit ${moderator.username || 'moderator'} permissions`}
                                                            >
                                                                Edit
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="danger"
                                                                onClick={() => openRemoveModal(moderator)}
                                                                aria-label={`Remove ${moderator.username || 'moderator'}`}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
                <div
                    className="flex items-center justify-between"
                    role="navigation"
                    aria-label="Pagination"
                >
                    <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages} ({total} total)
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePreviousPage}
                            disabled={!hasPreviousPage}
                            aria-label="Previous page"
                        >
                            Previous
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleNextPage}
                            disabled={!hasNextPage}
                            aria-label="Next page"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Add Moderator Modal */}
            <Modal
                open={showAddModal}
                onClose={() => {
                    setShowAddModal(false);
                    setSelectedUser(null);
                    setUserSearchQuery('');
                    setUserSuggestions([]);
                }}
                title="Add Moderator"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <label htmlFor="user-search" className="block text-sm font-medium mb-2">
                            Search for user
                        </label>
                        <Input
                            id="user-search"
                            type="text"
                            placeholder="Enter username..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            autoComplete="off"
                            aria-label="Search for user to add as moderator"
                            aria-autocomplete="list"
                            aria-controls="user-suggestions"
                        />
                    </div>

                    {/* User suggestions */}
                    {userSuggestions.length > 0 && (
                        <div
                            id="user-suggestions"
                            className="border border-border rounded-lg max-h-64 overflow-y-auto"
                            role="listbox"
                            aria-label="User suggestions"
                        >
                            {userSuggestions.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setUserSearchQuery(user.username);
                                        setUserSuggestions([]);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                                    role="option"
                                    aria-selected={selectedUser?.id === user.id}
                                >
                                    <Avatar src={user.avatar_url} alt={user.username} size="sm" />
                                    <div>
                                        <div className="font-medium text-foreground">
                                            {user.display_name}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            @{user.username}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Selected user */}
                    {selectedUser && (
                        <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                                <Avatar
                                    src={selectedUser.avatar_url}
                                    alt={selectedUser.username}
                                    size="sm"
                                />
                                <div>
                                    <div className="font-medium text-foreground">
                                        {selectedUser.display_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        @{selectedUser.username}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowAddModal(false);
                            setSelectedUser(null);
                            setUserSearchQuery('');
                            setUserSuggestions([]);
                        }}
                        disabled={isAddingModerator}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddModerator}
                        disabled={!selectedUser || isAddingModerator}
                        loading={isAddingModerator}
                    >
                        Add Moderator
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Remove Moderator Modal */}
            <Modal
                open={showRemoveModal}
                onClose={() => {
                    setShowRemoveModal(false);
                    setModeratorToRemove(null);
                }}
                title="Remove Moderator"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-foreground">
                        Are you sure you want to remove{' '}
                        <strong>{moderatorToRemove?.username || 'this user'}</strong> as a moderator?
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This action cannot be undone. They will lose all moderator permissions for this
                        channel.
                    </p>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowRemoveModal(false);
                            setModeratorToRemove(null);
                        }}
                        disabled={isRemovingModerator}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleRemoveModerator}
                        disabled={isRemovingModerator}
                        loading={isRemovingModerator}
                    >
                        Remove
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Permissions Modal */}
            <Modal
                open={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setModeratorToEdit(null);
                }}
                title="Edit Moderator Permissions"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-foreground mb-4">
                            Update permissions for{' '}
                            <strong>{moderatorToEdit?.username || 'this user'}</strong>
                        </p>
                        <label htmlFor="role-select" className="block text-sm font-medium mb-2">
                            Role
                        </label>
                        <select
                            id="role-select"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as 'moderator' | 'admin')}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                            aria-label="Select moderator role"
                        >
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                        </select>
                        <p className="text-sm text-muted-foreground mt-2">
                            {newRole === 'admin'
                                ? 'Admins have full moderation permissions and can manage other moderators.'
                                : 'Moderators can perform basic moderation actions like banning users and deleting messages.'}
                        </p>
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setShowEditModal(false);
                            setModeratorToEdit(null);
                        }}
                        disabled={isUpdatingPermissions}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleUpdatePermissions}
                        disabled={isUpdatingPermissions}
                        loading={isUpdatingPermissions}
                    >
                        Update
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
