import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import * as filterPresetApi from '@/lib/filter-preset-api';
import type {
    CreateFilterPresetRequest,
    UpdateFilterPresetRequest,
} from '@/types/clip';

/**
 * Hook to fetch all filter presets for a user
 */
export const useFilterPresets = (userId?: string) => {
    return useQuery({
        queryKey: ['filterPresets', userId],
        queryFn: () => filterPresetApi.fetchFilterPresets(userId!),
        enabled: !!userId,
    });
};

/**
 * Hook to create a filter preset
 */
export const useCreateFilterPreset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            userId,
            data,
        }: {
            userId: string;
            data: CreateFilterPresetRequest;
        }) => filterPresetApi.createFilterPreset(userId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['filterPresets', variables.userId],
            });
        },
    });
};

/**
 * Hook to update a filter preset
 */
export const useUpdateFilterPreset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            userId,
            presetId,
            data,
        }: {
            userId: string;
            presetId: string;
            data: UpdateFilterPresetRequest;
        }) => filterPresetApi.updateFilterPreset(userId, presetId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['filterPresets', variables.userId],
            });
        },
    });
};

/**
 * Hook to delete a filter preset
 */
export const useDeleteFilterPreset = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            userId,
            presetId,
        }: {
            userId: string;
            presetId: string;
        }) => filterPresetApi.deleteFilterPreset(userId, presetId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['filterPresets', variables.userId],
            });
        },
    });
};
