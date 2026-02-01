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
        onMutate: async () => {
            // Cancel any outgoing refetches to avoid race conditions
            await queryClient.cancelQueries({ queryKey: ['queue'] });

            // Snapshot all queue queries (handles different limits like 20, 100, etc.)
            const previousQueues = queryClient.getQueriesData({
                queryKey: ['queue'],
            });

            // Optimistically update the count
            const currentCount = queryClient.getQueryData(['queue', 'count']);
            if (typeof currentCount === 'number') {
                queryClient.setQueryData(['queue', 'count'], currentCount + 1);
            }

            // Return context with the snapshot values
            return { previousQueues };
        },
        onError: (_err, _variables, context) => {
            // Rollback all queue queries to their previous state
            if (context?.previousQueues) {
                context.previousQueues.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSuccess: () => {
            // Invalidate to ensure data is fresh from server
            queryClient.invalidateQueries({ queryKey: ['queue'] });
        },
    });
};

export const useRemoveFromQueue = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeFromQueue,
        onMutate: async () => {
            // Cancel any outgoing refetches to avoid race conditions
            await queryClient.cancelQueries({ queryKey: ['queue'] });

            // Snapshot all queue queries (handles different limits like 20, 100, etc.)
            const previousQueues = queryClient.getQueriesData({
                queryKey: ['queue'],
            });

            // Optimistically update the count
            const currentCount = queryClient.getQueryData(['queue', 'count']);
            if (typeof currentCount === 'number' && currentCount > 0) {
                queryClient.setQueryData(['queue', 'count'], currentCount - 1);
            }

            // Return context with the snapshot values
            return { previousQueues };
        },
        onError: (_err, _variables, context) => {
            // Rollback all queue queries to their previous state
            if (context?.previousQueues) {
                context.previousQueues.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSuccess: () => {
            // Invalidate to ensure data is fresh from server
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
        onMutate: async () => {
            // Cancel any outgoing refetches to avoid race conditions
            await queryClient.cancelQueries({ queryKey: ['queue'] });

            // Snapshot all queue queries (handles different limits like 20, 100, etc.)
            const previousQueues = queryClient.getQueriesData({
                queryKey: ['queue'],
            });

            // Optimistically update to empty
            queryClient.setQueryData(['queue', 'count'], 0);

            // Return context with the snapshot values
            return { previousQueues };
        },
        onError: (_err, _variables, context) => {
            // Rollback all queue queries to their previous state
            if (context?.previousQueues) {
                context.previousQueues.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSuccess: () => {
            // Invalidate to ensure data is fresh from server
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
