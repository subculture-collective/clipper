import { Button } from '@/components/ui';
import { useToast } from '@/hooks';
import {
    useCreatePlaylist,
    useDeletePlaylist,
    usePlaylists,
    useUpdatePlaylist,
} from '@/hooks/usePlaylist';
import type { CreatePlaylistRequest, Playlist } from '@/types/playlist';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { PlaylistCard } from './PlaylistCard';

export function PlaylistManager() {
    const { data, isLoading } = usePlaylists();
    const createMutation = useCreatePlaylist();
    const updateMutation = useUpdatePlaylist();
    const deleteMutation = useDeletePlaylist();
    const toast = useToast();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
    const [formData, setFormData] = useState<CreatePlaylistRequest>({
        title: '',
        description: '',
        visibility: 'private',
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('Playlist title is required');
            return;
        }

        try {
            await createMutation.mutateAsync(formData);
            toast.success('Playlist created successfully');
            setShowCreateForm(false);
            setFormData({ title: '', description: '', visibility: 'private' });
        } catch {
            toast.error('Failed to create playlist');
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlaylist) return;

        try {
            await updateMutation.mutateAsync({
                id: editingPlaylist.id,
                data: formData,
            });
            toast.success('Playlist updated successfully');
            setEditingPlaylist(null);
            setFormData({ title: '', description: '', visibility: 'private' });
        } catch {
            toast.error('Failed to update playlist');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this playlist?')) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(id);
            toast.success('Playlist deleted successfully');
        } catch {
            toast.error('Failed to delete playlist');
        }
    };

    const startEdit = (playlist: Playlist) => {
        setEditingPlaylist(playlist);
        setFormData({
            title: playlist.title,
            description: playlist.description || '',
            visibility: playlist.visibility,
        });
        setShowCreateForm(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-zinc-100">My Playlists</h2>
                <Button
                    onClick={() => {
                        setShowCreateForm(!showCreateForm);
                        setEditingPlaylist(null);
                        setFormData({ title: '', description: '', visibility: 'private' });
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Playlist
                </Button>
            </div>

            {/* Create/Edit Form */}
            {(showCreateForm || editingPlaylist) && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                        {editingPlaylist ? 'Edit Playlist' : 'Create New Playlist'}
                    </h3>
                    <form onSubmit={editingPlaylist ? handleUpdate : handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) =>
                                    setFormData({ ...formData, title: e.target.value })
                                }
                                maxLength={100}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                maxLength={500}
                                rows={3}
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">
                                Visibility
                            </label>
                            <select
                                value={formData.visibility}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        visibility: e.target.value as 'private' | 'public' | 'unlisted',
                                    })
                                }
                                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="private">Private - Only you can see it</option>
                                <option value="unlisted">Unlisted - Anyone with link can see it</option>
                                <option value="public">Public - Anyone can discover it</option>
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingPlaylist ? 'Update' : 'Create'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setEditingPlaylist(null);
                                    setFormData({ title: '', description: '', visibility: 'private' });
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Playlists Grid */}
            {isLoading ? (
                <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : !data?.data || data.data.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <p>You don't have any playlists yet.</p>
                    <p className="text-sm">Click "Create Playlist" to get started!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.data.map((playlist) => (
                        <div key={playlist.id} className="relative group">
                            <PlaylistCard playlist={playlist} />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        startEdit(playlist);
                                    }}
                                    className="p-2 bg-zinc-900/90 rounded-lg hover:bg-zinc-800 transition"
                                >
                                    <Edit2 className="h-4 w-4 text-zinc-400" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDelete(playlist.id);
                                    }}
                                    className="p-2 bg-zinc-900/90 rounded-lg hover:bg-red-900/50 transition"
                                >
                                    <Trash2 className="h-4 w-4 text-red-400" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
