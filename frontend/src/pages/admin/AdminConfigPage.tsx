import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { configApi } from '@/lib/config-api';
import type { EngagementConfig, PresetProfile } from '@/lib/config-api';

export default function AdminConfigPage() {
    const queryClient = useQueryClient();
    const [localConfig, setLocalConfig] = useState<EngagementConfig | null>(
        null
    );
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [presetDescription, setPresetDescription] = useState('');

    const {
        data: config,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['admin-engagement-config'],
        queryFn: configApi.getEngagementConfig,
    });

    const { data: savedPresets = [] } = useQuery({
        queryKey: ['admin-presets'],
        queryFn: configApi.getPresets,
    });

    const builtInPresets: Array<{ name: string; cfg: EngagementConfig }> =
        useMemo(() => {
            const make = (name: string, cfg: EngagementConfig) => ({
                name,
                cfg,
            });
            return [
                make('Balanced', {
                    vote_weight: 3.0,
                    comment_weight: 2.0,
                    favorite_weight: 1.5,
                    view_weight: 0.1,
                }),
                make('Comments Focus', {
                    vote_weight: 2.0,
                    comment_weight: 3.5,
                    favorite_weight: 1.2,
                    view_weight: 0.08,
                }),
                make('Votes Focus', {
                    vote_weight: 4.0,
                    comment_weight: 1.5,
                    favorite_weight: 1.2,
                    view_weight: 0.08,
                }),
                make('Favorites Focus', {
                    vote_weight: 2.5,
                    comment_weight: 1.8,
                    favorite_weight: 2.5,
                    view_weight: 0.05,
                }),
                make('Views Light', {
                    vote_weight: 3.0,
                    comment_weight: 2.0,
                    favorite_weight: 1.5,
                    view_weight: 0.02,
                }),
            ];
        }, []);

    const allPresets = useMemo(() => {
        const userPresets = savedPresets.map((p: PresetProfile) => ({
            id: p.id,
            name: p.name,
            cfg: {
                vote_weight: p.vote_weight,
                comment_weight: p.comment_weight,
                favorite_weight: p.favorite_weight,
                view_weight: p.view_weight,
            },
            isUserDefined: !p.is_system,
        }));
        const builtIn = builtInPresets.map(p => ({
            ...p,
            isUserDefined: false,
        }));
        return [...builtIn, ...userPresets];
    }, [builtInPresets, savedPresets]);

    const savePresetMutation = useMutation({
        mutationFn: (data: {
            name: string;
            description?: string;
            config: EngagementConfig;
        }) =>
            configApi.createPreset({
                name: data.name,
                description: data.description,
                vote_weight: data.config.vote_weight,
                comment_weight: data.config.comment_weight,
                favorite_weight: data.config.favorite_weight,
                view_weight: data.config.view_weight,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
            setSuccessMessage('Preset saved successfully');
            setShowSavePresetModal(false);
            setPresetName('');
            setPresetDescription('');
            setTimeout(() => setSuccessMessage(''), 5000);
        },
        onError: (err: Error) => {
            setErrorMessage(
                (err as { response?: { data?: { error?: string } } }).response
                    ?.data?.error || 'Failed to save preset'
            );
        },
    });

    const deletePresetMutation = useMutation({
        mutationFn: (id: string) => configApi.deletePreset(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-presets'] });
            setSuccessMessage('Preset deleted successfully');
            setTimeout(() => setSuccessMessage(''), 5000);
        },
        onError: (err: Error) => {
            setErrorMessage(
                (err as { response?: { data?: { error?: string } } }).response
                    ?.data?.error || 'Failed to delete preset'
            );
        },
    });

    const getCurrentPresetName = (
        cfg: EngagementConfig | null | undefined
    ): string => {
        if (!cfg) return 'None';
        const match = allPresets.find(
            p =>
                p.cfg.vote_weight === cfg.vote_weight &&
                p.cfg.comment_weight === cfg.comment_weight &&
                p.cfg.favorite_weight === cfg.favorite_weight &&
                p.cfg.view_weight === cfg.view_weight
        );
        return match ? match.name : 'Custom';
    };

    const applyPreset = (cfg: EngagementConfig) => {
        setLocalConfig({ ...cfg });
    };

    const handleSaveAsPreset = () => {
        if (!currentConfig) return;
        if (!presetName.trim()) {
            setErrorMessage('Preset name is required');
            return;
        }
        savePresetMutation.mutate({
            name: presetName.trim(),
            description: presetDescription.trim() || undefined,
            config: currentConfig,
        });
    };

    const updateMutation = useMutation({
        mutationFn: configApi.updateEngagementConfig,
        onSuccess: data => {
            queryClient.invalidateQueries({
                queryKey: ['admin-engagement-config'],
            });
            setSuccessMessage(data.message);
            setErrorMessage('');
            setLocalConfig(null);
            setTimeout(() => setSuccessMessage(''), 5000);
        },
        onError: (err: Error) => {
            setErrorMessage(
                (err as { response?: { data?: { error?: string } } }).response
                    ?.data?.error || 'Failed to update configuration'
            );
            setSuccessMessage('');
        },
    });

    const currentConfig = localConfig || config;

    const handleInputChange = (
        field: keyof EngagementConfig,
        value: string
    ) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        setLocalConfig({
            ...(currentConfig || {
                vote_weight: 0,
                comment_weight: 0,
                favorite_weight: 0,
                view_weight: 0,
            }),
            [field]: numValue,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentConfig) return;

        // Validate all weights are non-negative
        const weights = [
            currentConfig.vote_weight,
            currentConfig.comment_weight,
            currentConfig.favorite_weight,
            currentConfig.view_weight,
        ];

        if (weights.some(w => w < 0)) {
            setErrorMessage('All weights must be non-negative');
            return;
        }

        if (weights.every(w => w === 0)) {
            setErrorMessage('At least one weight must be positive');
            return;
        }

        updateMutation.mutate(currentConfig);
    };

    const handleReset = () => {
        setLocalConfig(null);
        setErrorMessage('');
        setSuccessMessage('');
    };

    if (isLoading) {
        return (
            <div className='max-w-4xl mx-auto px-4 py-8'>
                <div className='flex items-center justify-center py-12'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500'></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='max-w-4xl mx-auto px-4 py-8'>
                <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
                    Failed to load configuration. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className='max-w-4xl mx-auto px-4 py-8'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold text-white mb-2'>
                    Engagement Scoring Configuration
                </h1>
                <p className='text-gray-400'>
                    Adjust the weights used to calculate engagement scores for
                    clips. Changes will trigger a recalculation of all clip
                    engagement scores.
                </p>
                <p className='text-sm text-gray-500 mb-4'>
                    Pick a preset to quickly populate values, then tweak as
                    needed.
                </p>
            </div>

            {successMessage && (
                <div className='mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-800'>
                    {successMessage}
                </div>
            )}

            {errorMessage && (
                <div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800'>
                    {errorMessage}
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className='bg-gray-800 rounded-lg p-6 space-y-6'
            >
                <div className='mb-6'>
                    <div className='flex items-center justify-between mb-3'>
                        <label className='text-sm font-medium text-gray-300'>
                            Quick Presets
                        </label>
                        <div className='flex items-center gap-2'>
                            <span className='text-sm text-purple-400 font-medium'>
                                Current: {getCurrentPresetName(currentConfig)}
                            </span>
                            <button
                                type='button'
                                onClick={() => setShowSavePresetModal(true)}
                                className='px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700'
                            >
                                Save as Preset
                            </button>
                        </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        {allPresets.map(p => (
                            <div
                                key={p.name}
                                className='flex items-center gap-1'
                            >
                                <button
                                    type='button'
                                    onClick={() => applyPreset(p.cfg)}
                                    className='px-3 py-1.5 text-sm bg-gray-700 text-gray-200 rounded-lg hover:bg-purple-600 hover:text-white transition-colors'
                                >
                                    {p.name}
                                </button>
                                {p.isUserDefined && 'id' in p && (
                                    <button
                                        type='button'
                                        onClick={() =>
                                            deletePresetMutation.mutate(
                                                p.id as string
                                            )
                                        }
                                        className='px-2 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700'
                                        title='Delete preset'
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div>
                        <label
                            htmlFor='vote_weight'
                            className='block text-sm font-medium text-gray-300 mb-2'
                        >
                            Vote Weight
                        </label>
                        <input
                            id='vote_weight'
                            type='number'
                            step='0.1'
                            min='0'
                            value={currentConfig?.vote_weight ?? 0}
                            onChange={e =>
                                handleInputChange('vote_weight', e.target.value)
                            }
                            className='w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                        />
                        <p className='mt-1 text-xs text-gray-500'>
                            Weight for upvotes/downvotes
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor='comment_weight'
                            className='block text-sm font-medium text-gray-300 mb-2'
                        >
                            Comment Weight
                        </label>
                        <input
                            id='comment_weight'
                            type='number'
                            step='0.1'
                            min='0'
                            value={currentConfig?.comment_weight ?? 0}
                            onChange={e =>
                                handleInputChange(
                                    'comment_weight',
                                    e.target.value
                                )
                            }
                            className='w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                        />
                        <p className='mt-1 text-xs text-gray-500'>
                            Weight for comments
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor='favorite_weight'
                            className='block text-sm font-medium text-gray-300 mb-2'
                        >
                            Favorite Weight
                        </label>
                        <input
                            id='favorite_weight'
                            type='number'
                            step='0.1'
                            min='0'
                            value={currentConfig?.favorite_weight ?? 0}
                            onChange={e =>
                                handleInputChange(
                                    'favorite_weight',
                                    e.target.value
                                )
                            }
                            className='w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                        />
                        <p className='mt-1 text-xs text-gray-500'>
                            Weight for favorites
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor='view_weight'
                            className='block text-sm font-medium text-gray-300 mb-2'
                        >
                            View Weight
                        </label>
                        <input
                            id='view_weight'
                            type='number'
                            step='0.01'
                            min='0'
                            value={currentConfig?.view_weight ?? 0}
                            onChange={e =>
                                handleInputChange('view_weight', e.target.value)
                            }
                            className='w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                        />
                        <p className='mt-1 text-xs text-gray-500'>
                            Weight for clip views
                        </p>
                    </div>
                </div>

                <div className='bg-gray-700 rounded-lg p-4'>
                    <h3 className='text-sm font-medium text-gray-300 mb-2'>
                        Current Formula
                    </h3>
                    <code className='text-xs text-purple-400 block overflow-x-auto'>
                        engagement_score = (vote_count ×{' '}
                        {currentConfig?.vote_weight ?? 0}) + (comment_count ×{' '}
                        {currentConfig?.comment_weight ?? 0}) + (favorite_count
                        × {currentConfig?.favorite_weight ?? 0}) + (view_count ×{' '}
                        {currentConfig?.view_weight ?? 0})
                    </code>
                </div>

                <div className='flex items-center justify-end gap-4'>
                    <button
                        type='button'
                        onClick={handleReset}
                        disabled={!localConfig || updateMutation.isPending}
                        className='px-6 py-2 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                        Reset
                    </button>
                    <button
                        type='submit'
                        disabled={!localConfig || updateMutation.isPending}
                        className='px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                    >
                        {updateMutation.isPending ?
                            <>
                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                                Updating...
                            </>
                        :   'Save Changes'}
                    </button>
                </div>
            </form>

            <div className='mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                <h3 className='text-sm font-medium text-yellow-800 mb-2'>
                    ⚠️ Important Notes
                </h3>
                <ul className='text-sm text-yellow-700 space-y-1 list-disc list-inside'>
                    <li>
                        Saving changes will trigger a recalculation of
                        engagement scores for all clips
                    </li>
                    <li>
                        This operation may take several seconds depending on the
                        number of clips
                    </li>
                    <li>Changes take effect immediately after saving</li>
                    <li>All weights must be non-negative numbers</li>
                    <li>At least one weight must be positive</li>
                </ul>
            </div>

            {showSavePresetModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
                    <div className='bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4'>
                        <h3 className='text-lg font-semibold text-white mb-4'>
                            Save as Preset
                        </h3>
                        <div className='space-y-4'>
                            <div>
                                <label
                                    htmlFor='preset-name'
                                    className='block text-sm font-medium text-gray-300 mb-2'
                                >
                                    Preset Name
                                </label>
                                <input
                                    id='preset-name'
                                    type='text'
                                    value={presetName}
                                    onChange={e =>
                                        setPresetName(e.target.value)
                                    }
                                    className='w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                                    placeholder='e.g., My Custom Preset'
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor='preset-description'
                                    className='block text-sm font-medium text-gray-300 mb-2'
                                >
                                    Description (optional)
                                </label>
                                <textarea
                                    id='preset-description'
                                    value={presetDescription}
                                    onChange={e =>
                                        setPresetDescription(e.target.value)
                                    }
                                    className='w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500'
                                    rows={3}
                                    placeholder='Describe this preset...'
                                />
                            </div>
                            <div className='flex justify-end gap-3'>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setShowSavePresetModal(false);
                                        setPresetName('');
                                        setPresetDescription('');
                                    }}
                                    className='px-4 py-2 text-gray-300 hover:text-white'
                                >
                                    Cancel
                                </button>
                                <button
                                    type='button'
                                    onClick={handleSaveAsPreset}
                                    disabled={savePresetMutation.isPending}
                                    className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50'
                                >
                                    {savePresetMutation.isPending ?
                                        'Saving...'
                                    :   'Save Preset'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
