import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
    Queue,
    QueueResponse,
    QueueCountResponse,
    AddToQueueRequest,
    ReorderQueueRequest,
} from '@/types/queue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// API functions
const fetchQueue = async (limit = 100): Promise<Queue> => {
    const response = await fetch(
        `${API_BASE_URL}/queue?limit=${limit}`,
        {
            credentials: 'include',
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch queue');
    }
    const result: QueueResponse = await response.json();
    return result.data;
};

const fetchQueueCount = async (): Promise<number> => {
    const response = await fetch(
        `${API_BASE_URL}/queue/count`,
        {
            credentials: 'include',
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch queue count');
    }
    const result: QueueCountResponse = await response.json();
    return result.data.count;
};

const addToQueue = async (data: AddToQueueRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/queue`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to add to queue');
    }
};

const removeFromQueue = async (itemId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/queue/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to remove from queue');
    }
};

const reorderQueue = async (data: ReorderQueueRequest): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/queue/reorder`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error('Failed to reorder queue');
    }
};

const clearQueue = async (): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/queue`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to clear queue');
    }
};

const markAsPlayed = async (itemId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/queue/${itemId}/played`, {
        method: 'POST',
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('Failed to mark as played');
    }
};

// React Query hooks
export const useQueue = (limit = 100) => {
    return useQuery({
        queryKey: ['queue', limit],
        queryFn: () => fetchQueue(limit),
    });
};

export const useQueueCount = () => {
    return useQuery({
        queryKey: ['queue', 'count'],
        queryFn: fetchQueueCount,
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
