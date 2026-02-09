import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Zap, X } from 'lucide-react';
import {
    Container,
    Card,
    CardHeader,
    CardBody,
    Button,
    Spinner,
} from '@/components';
import { playlistScriptApi } from '@/lib/playlist-script-api';
import type {
    PlaylistScript,
    PlaylistScriptSort,
    PlaylistScriptTimeframe,
    UpdatePlaylistScriptRequest,
} from '@/types/playlistScript';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

const defaultForm: {
    name: string;
    description: string;
    sort: PlaylistScriptSort;
    timeframe: PlaylistScriptTimeframe;
    clip_limit: number;
    visibility: 'private' | 'public' | 'unlisted';
    is_active: boolean;
} = {
    name: '',
    description: '',
    sort: 'top',
    timeframe: 'day',
    clip_limit: 10,
    visibility: 'public',
    is_active: true,
};

export function AdminPlaylistScriptsPage() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
    const [form, setForm] = useState(defaultForm);

    const { data: scripts, isLoading } = useQuery({
        queryKey: ['admin', 'playlist-scripts'],
        queryFn: () => playlistScriptApi.listScripts(),
    });

    const createMutation = useMutation({
        mutationFn: playlistScriptApi.createScript,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin', 'playlist-scripts'],
            });
            showToast('Playlist script created', 'success');
            setForm(defaultForm);
        },
        onError: () => showToast('Failed to create script', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: UpdatePlaylistScriptRequest;
        }) => playlistScriptApi.updateScript(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin', 'playlist-scripts'],
            });
            showToast('Playlist script updated', 'success');
            setEditingScriptId(null);
            setForm(defaultForm);
        },
        onError: () => showToast('Failed to update script', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => playlistScriptApi.deleteScript(id),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['admin', 'playlist-scripts'],
            });
            showToast('Playlist script deleted', 'success');
        },
        onError: () => showToast('Failed to delete script', 'error'),
    });

    const generateMutation = useMutation({
        mutationFn: (id: string) => playlistScriptApi.generatePlaylist(id),
        onSuccess: data => {
            queryClient.invalidateQueries({
                queryKey: ['admin', 'playlist-scripts'],
            });
            showToast('Playlist generated', 'success');
            if (data?.id) {
                window.open(`/playlists/${data.id}`, '_blank');
            }
        },
        onError: () => showToast('Failed to generate playlist', 'error'),
    });

    const isEditing = useMemo(
        () => Boolean(editingScriptId),
        [editingScriptId],
    );

    const handleEdit = (script: PlaylistScript) => {
        setEditingScriptId(script.id);
        setForm({
            name: script.name,
            description: script.description || '',
            sort: script.sort,
            timeframe: script.timeframe || 'day',
            clip_limit: script.clip_limit,
            visibility: script.visibility,
            is_active: script.is_active,
        });
    };

    const handleSubmit = () => {
        if (!form.name.trim()) {
            showToast('Name is required', 'error');
            return;
        }

        if (isEditing && editingScriptId) {
            updateMutation.mutate({
                id: editingScriptId,
                data: {
                    name: form.name,
                    description: form.description || undefined,
                    sort: form.sort,
                    timeframe: form.timeframe,
                    clip_limit: form.clip_limit,
                    visibility: form.visibility,
                    is_active: form.is_active,
                },
            });
            return;
        }

        createMutation.mutate({
            name: form.name,
            description: form.description || undefined,
            sort: form.sort,
            timeframe: form.timeframe,
            clip_limit: form.clip_limit,
            visibility: form.visibility,
            is_active: form.is_active,
        });
    };

    if (isLoading) {
        return (
            <Container className='py-8 flex justify-center'>
                <Spinner size='xl' />
            </Container>
        );
    }

    return (
        <Container className='py-8 space-y-6'>
            <div className='flex justify-between items-center'>
                <div>
                    <h1 className='text-3xl font-bold mb-2'>
                        Playlist Scripts
                    </h1>
                    <p className='text-muted-foreground'>
                        Automate playlists like daily top 10s and trending
                        picks.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <h2 className='text-xl font-semibold'>
                            {isEditing ? 'Edit Script' : 'Create Script'}
                        </h2>
                        {isEditing && (
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                    setEditingScriptId(null);
                                    setForm(defaultForm);
                                }}
                            >
                                <X className='w-4 h-4 mr-2' />
                                Cancel edit
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardBody>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div>
                            <label className='block text-sm font-medium mb-2'>
                                Name
                            </label>
                            <input
                                value={form.name}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        name: e.target.value,
                                    }))
                                }
                                className='w-full px-4 py-2 bg-background border border-border rounded-lg'
                                placeholder='Daily Top 10'
                            />
                        </div>
                        <div>
                            <label className='block text-sm font-medium mb-2'>
                                Visibility
                            </label>
                            <select
                                value={form.visibility}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        visibility: e.target
                                            .value as typeof form.visibility,
                                    }))
                                }
                                className='w-full px-4 py-2 bg-background border border-border rounded-lg'
                            >
                                <option value='public'>Public</option>
                                <option value='unlisted'>Unlisted</option>
                                <option value='private'>Private</option>
                            </select>
                        </div>
                        <div className='md:col-span-2'>
                            <label className='block text-sm font-medium mb-2'>
                                Description
                            </label>
                            <textarea
                                value={form.description}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                rows={3}
                                className='w-full px-4 py-2 bg-background border border-border rounded-lg'
                                placeholder='Auto-generated playlist of top clips'
                            />
                        </div>
                        <div>
                            <label className='block text-sm font-medium mb-2'>
                                Sort
                            </label>
                            <select
                                value={form.sort}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        sort: e.target
                                            .value as PlaylistScriptSort,
                                    }))
                                }
                                className='w-full px-4 py-2 bg-background border border-border rounded-lg'
                            >
                                <option value='top'>Top</option>
                                <option value='trending'>Trending</option>
                                <option value='hot'>Hot</option>
                                <option value='popular'>Popular</option>
                                <option value='new'>New</option>
                                <option value='rising'>Rising</option>
                                <option value='discussed'>Discussed</option>
                            </select>
                        </div>
                        <div>
                            <label className='block text-sm font-medium mb-2'>
                                Timeframe
                            </label>
                            <select
                                value={form.timeframe}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        timeframe: e.target
                                            .value as PlaylistScriptTimeframe,
                                    }))
                                }
                                className='w-full px-4 py-2 bg-background border border-border rounded-lg'
                            >
                                <option value='hour'>Last hour</option>
                                <option value='day'>Last day</option>
                                <option value='week'>Last week</option>
                                <option value='month'>Last month</option>
                                <option value='year'>Last year</option>
                            </select>
                        </div>
                        <div>
                            <label className='block text-sm font-medium mb-2'>
                                Clip limit
                            </label>
                            <input
                                type='number'
                                min={1}
                                max={100}
                                value={form.clip_limit}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        clip_limit: Number(e.target.value),
                                    }))
                                }
                                className='w-full px-4 py-2 bg-background border border-border rounded-lg'
                            />
                        </div>
                        <div className='flex items-center gap-3'>
                            <label className='text-sm font-medium'>
                                Active
                            </label>
                            <input
                                type='checkbox'
                                checked={form.is_active}
                                onChange={e =>
                                    setForm(prev => ({
                                        ...prev,
                                        is_active: e.target.checked,
                                    }))
                                }
                                className='h-4 w-4'
                            />
                        </div>
                    </div>

                    <div className='mt-4 flex justify-end'>
                        <Button onClick={handleSubmit}>
                            {isEditing ?
                                <>
                                    <Pencil className='w-4 h-4 mr-2' />
                                    Update Script
                                </>
                            :   <>
                                    <Plus className='w-4 h-4 mr-2' />
                                    Create Script
                                </>
                            }
                        </Button>
                    </div>
                </CardBody>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className='text-xl font-semibold'>Existing Scripts</h2>
                </CardHeader>
                <CardBody>
                    {!scripts || scripts.length === 0 ?
                        <div className='text-center py-12 text-muted-foreground'>
                            <p className='text-lg'>No scripts yet</p>
                            <p className='text-sm mt-2'>
                                Create your first script above.
                            </p>
                        </div>
                    :   <div className='overflow-x-auto'>
                            <table className='w-full'>
                                <thead className='border-b border-border'>
                                    <tr>
                                        <th className='text-left py-3 px-4 font-semibold'>
                                            Name
                                        </th>
                                        <th className='text-left py-3 px-4 font-semibold'>
                                            Rule
                                        </th>
                                        <th className='text-left py-3 px-4 font-semibold'>
                                            Visibility
                                        </th>
                                        <th className='text-left py-3 px-4 font-semibold'>
                                            Status
                                        </th>
                                        <th className='text-left py-3 px-4 font-semibold'>
                                            Last Run
                                        </th>
                                        <th className='text-right py-3 px-4 font-semibold'>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scripts.map(script => (
                                        <tr
                                            key={script.id}
                                            className='border-b border-border hover:bg-accent transition-colors'
                                        >
                                            <td className='py-3 px-4'>
                                                <div className='font-medium'>
                                                    {script.name}
                                                </div>
                                                {script.description && (
                                                    <div className='text-sm text-muted-foreground line-clamp-1'>
                                                        {script.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className='py-3 px-4 text-sm'>
                                                {script.sort} ·{' '}
                                                {script.timeframe || 'all time'}{' '}
                                                · {script.clip_limit}
                                            </td>
                                            <td className='py-3 px-4 text-sm capitalize'>
                                                {script.visibility}
                                            </td>
                                            <td className='py-3 px-4'>
                                                <span
                                                    className={cn(
                                                        'px-2 py-1 rounded text-xs font-medium',
                                                        script.is_active ?
                                                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        :   'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
                                                    )}
                                                >
                                                    {script.is_active ?
                                                        'Active'
                                                    :   'Inactive'}
                                                </span>
                                            </td>
                                            <td className='py-3 px-4 text-sm text-muted-foreground'>
                                                {script.last_run_at ?
                                                    new Date(
                                                        script.last_run_at,
                                                    ).toLocaleString()
                                                :   'Never'}
                                            </td>
                                            <td className='py-3 px-4'>
                                                <div className='flex justify-end gap-2'>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() =>
                                                            generateMutation.mutate(
                                                                script.id,
                                                            )
                                                        }
                                                        title='Generate playlist'
                                                    >
                                                        <Zap className='w-4 h-4' />
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() =>
                                                            handleEdit(script)
                                                        }
                                                        title='Edit script'
                                                    >
                                                        <Pencil className='w-4 h-4' />
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() =>
                                                            deleteMutation.mutate(
                                                                script.id,
                                                            )
                                                        }
                                                        title='Delete script'
                                                    >
                                                        <Trash2 className='w-4 h-4' />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    }
                </CardBody>
            </Card>
        </Container>
    );
}
