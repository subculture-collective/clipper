import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
    Queue,
    QueueResponse,
    QueueCountResponse,
    AddToQueueRequest,
    ReorderQueueRequest,
} from '@/types/queue';

// API functions using apiClient for proper CSRF token handling
const fetchQueue = async (limit = 100): Promise<Queue> => {
    const response = await apiClient.get<QueueResponse>(
        `/queue?limit=${limit}`,
    );
    return response.data.data;
};

const fetchQueueCount = async (): Promise<number> => {
    const response = await apiClient.get<QueueCountResponse>('/queue/count');
    return response.data.data.count;
};

const addToQueue = async (data: AddToQueueRequest): Promise<void> => {
    await apiClient.post('/queue', data);
};

const removeFromQueue = async (itemId: string): Promise<void> => {
    await apiClient.delete(`/queue/${itemId}`);
};

const reorderQueue = async (data: ReorderQueueRequest): Promise<void> => {
    await apiClient.patch('/queue/reorder', data);
};

const clearQueue = async (): Promise<void> => {
    await apiClient.delete('/queue');
};

const markAsPlayed = async (itemId: string): Promise<void> => {
    await apiClient.post(`/queue/${itemId}/played`);
};

// React Query hooks
export const useQueue = (limit = 100, enabled = true) => {
    return useQuery({
        queryKey: ['queue', limit],
        queryFn: () => fetchQueue(limit),
        enabled,
    });
};

export const useQueueCount = (enabled = true) => {
    return useQuery({
        queryKey: ['queue', 'count'],
        queryFn: fetchQueueCount,
        enabled,
    });
};

export const useAddToQueue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addToQueue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
};

export const useRemoveFromQueue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeFromQueue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
};

export const useReorderQueue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: reorderQueue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
};

export const useClearQueue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: clearQueue,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
};

export const useMarkAsPlayed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markAsPlayed,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
};
