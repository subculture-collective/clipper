import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import {
    useQueue,
    useQueueCount,
    useAddToQueue,
    useRemoveFromQueue,
    useClearQueue,
} from './useQueue';
import * as apiClient from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
        patch: vi.fn(),
    },
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
            mutations: {
                retry: false,
            },
        },
    });

    return ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useQueue hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useQueue', () => {
        it('should fetch queue successfully', async () => {
            const mockQueue = {
                items: [
                    {
                        id: 'item-1',
                        user_id: 'user-1',
                        clip_id: 'clip-1',
                        position: 1,
                        added_at: '2024-01-01T00:00:00Z',
                        created_at: '2024-01-01T00:00:00Z',
                        updated_at: '2024-01-01T00:00:00Z',
                    },
                ],
                total: 1,
            };

            vi.mocked(apiClient.apiClient.get).mockResolvedValue({
                data: { data: mockQueue },
            } as never);

            const { result } = renderHook(() => useQueue(100, true), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual(mockQueue);
            expect(apiClient.apiClient.get).toHaveBeenCalledWith(
                '/queue?limit=100',
            );
        });

        it('should not fetch when disabled', () => {
            const { result } = renderHook(() => useQueue(100, false), {
                wrapper: createWrapper(),
            });

            expect(result.current.fetchStatus).toBe('idle');
            expect(apiClient.apiClient.get).not.toHaveBeenCalled();
        });
    });

    describe('useQueueCount', () => {
        it('should fetch queue count successfully', async () => {
            vi.mocked(apiClient.apiClient.get).mockResolvedValue({
                data: { data: { count: 5 } },
            } as never);

            const { result } = renderHook(() => useQueueCount(true), {
                wrapper: createWrapper(),
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toBe(5);
            expect(apiClient.apiClient.get).toHaveBeenCalledWith(
                '/queue/count',
            );
        });
    });

    describe('useAddToQueue', () => {
        it('should add to queue successfully', async () => {
            vi.mocked(apiClient.apiClient.post).mockResolvedValue({
                data: {},
            } as never);

            const { result } = renderHook(() => useAddToQueue(), {
                wrapper: createWrapper(),
            });

            result.current.mutate({
                clip_id: 'clip-1',
                at_end: true,
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(apiClient.apiClient.post).toHaveBeenCalledWith('/queue', {
                clip_id: 'clip-1',
                at_end: true,
            });
        });

        it('should optimistically update queue count', async () => {
            vi.mocked(apiClient.apiClient.post).mockResolvedValue({
                data: {},
            } as never);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count
            queryClient.setQueryData(['queue', 'count'], 3);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useAddToQueue(), { wrapper });

            result.current.mutate({
                clip_id: 'clip-1',
                at_end: true,
            });

            // Wait for onMutate to run
            await waitFor(() => {
                const updatedCount = queryClient.getQueryData([
                    'queue',
                    'count',
                ]);
                expect(updatedCount).toBe(4);
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
        });

        it('should rollback queue count on error', async () => {
            const error = new Error('Failed to add to queue');
            vi.mocked(apiClient.apiClient.post).mockRejectedValue(error);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count
            queryClient.setQueryData(['queue', 'count'], 3);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useAddToQueue(), { wrapper });

            result.current.mutate({
                clip_id: 'clip-1',
                at_end: true,
            });

            await waitFor(() => expect(result.current.isError).toBe(true));

            // Verify rollback happened
            const rolledBackCount = queryClient.getQueryData([
                'queue',
                'count',
            ]);
            expect(rolledBackCount).toBe(3);
            expect(result.current.error).toEqual(error);
        });

        it('should optimistically update all queue queries with different limits', async () => {
            vi.mocked(apiClient.apiClient.post).mockResolvedValue({
                data: {},
            } as never);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate multiple queue caches with different limits
            queryClient.setQueryData(['queue', 20], {
                items: [],
                total: 2,
            });
            queryClient.setQueryData(['queue', 100], {
                items: [],
                total: 2,
            });
            queryClient.setQueryData(['queue', 'count'], 2);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useAddToQueue(), { wrapper });

            result.current.mutate({
                clip_id: 'clip-1',
                at_end: true,
            });

            // Wait for onMutate to run
            await waitFor(() => {
                const updatedCount = queryClient.getQueryData([
                    'queue',
                    'count',
                ]);
                expect(updatedCount).toBe(3);
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            // Verify both queue caches are preserved in snapshot
            const queue20 = queryClient.getQueryData(['queue', 20]);
            const queue100 = queryClient.getQueryData(['queue', 100]);
            expect(queue20).toBeDefined();
            expect(queue100).toBeDefined();
        });
    });

    describe('useRemoveFromQueue', () => {
        it('should remove from queue successfully', async () => {
            vi.mocked(apiClient.apiClient.delete).mockResolvedValue({
                data: {},
            } as never);

            const { result } = renderHook(() => useRemoveFromQueue(), {
                wrapper: createWrapper(),
            });

            result.current.mutate('item-1');

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(apiClient.apiClient.delete).toHaveBeenCalledWith(
                '/queue/item-1',
            );
        });

        it('should optimistically update queue count', async () => {
            vi.mocked(apiClient.apiClient.delete).mockResolvedValue({
                data: {},
            } as never);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count
            queryClient.setQueryData(['queue', 'count'], 5);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useRemoveFromQueue(), {
                wrapper,
            });

            result.current.mutate('item-1');

            // Wait for onMutate to run
            await waitFor(() => {
                const updatedCount = queryClient.getQueryData([
                    'queue',
                    'count',
                ]);
                expect(updatedCount).toBe(4);
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
        });

        it('should rollback queue count on error', async () => {
            const error = new Error('Failed to remove from queue');
            vi.mocked(apiClient.apiClient.delete).mockRejectedValue(error);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count
            queryClient.setQueryData(['queue', 'count'], 5);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useRemoveFromQueue(), {
                wrapper,
            });

            result.current.mutate('item-1');

            await waitFor(() => expect(result.current.isError).toBe(true));

            // Verify rollback happened
            const rolledBackCount = queryClient.getQueryData([
                'queue',
                'count',
            ]);
            expect(rolledBackCount).toBe(5);
            expect(result.current.error).toEqual(error);
        });

        it('should rollback all queue queries on error with multiple limits', async () => {
            const error = new Error('Failed to remove from queue');
            vi.mocked(apiClient.apiClient.delete).mockRejectedValue(error);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate multiple queue caches with different limits
            const mockQueue20 = { items: [], total: 5 };
            const mockQueue100 = { items: [], total: 5 };
            queryClient.setQueryData(['queue', 20], mockQueue20);
            queryClient.setQueryData(['queue', 100], mockQueue100);
            queryClient.setQueryData(['queue', 'count'], 5);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useRemoveFromQueue(), {
                wrapper,
            });

            result.current.mutate('item-1');

            await waitFor(() => expect(result.current.isError).toBe(true));

            // Verify all queue caches were rolled back
            const rolledBackCount = queryClient.getQueryData([
                'queue',
                'count',
            ]);
            expect(rolledBackCount).toBe(5);
            
            const rolledBackQueue20 = queryClient.getQueryData(['queue', 20]);
            const rolledBackQueue100 = queryClient.getQueryData(['queue', 100]);
            expect(rolledBackQueue20).toEqual(mockQueue20);
            expect(rolledBackQueue100).toEqual(mockQueue100);
            expect(result.current.error).toEqual(error);
        });

        it('should not decrement count below 0', async () => {
            vi.mocked(apiClient.apiClient.delete).mockResolvedValue({
                data: {},
            } as never);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count with 0
            queryClient.setQueryData(['queue', 'count'], 0);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useRemoveFromQueue(), {
                wrapper,
            });

            result.current.mutate('item-1');

            // Count should remain 0, not go negative
            const updatedCount = queryClient.getQueryData(['queue', 'count']);
            expect(updatedCount).toBe(0);

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
        });
    });

    describe('useClearQueue', () => {
        it('should clear queue successfully', async () => {
            vi.mocked(apiClient.apiClient.delete).mockResolvedValue({
                data: {},
            } as never);

            const { result } = renderHook(() => useClearQueue(), {
                wrapper: createWrapper(),
            });

            result.current.mutate();

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(apiClient.apiClient.delete).toHaveBeenCalledWith('/queue');
        });

        it('should optimistically update queue count to 0', async () => {
            vi.mocked(apiClient.apiClient.delete).mockResolvedValue({
                data: {},
            } as never);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count
            queryClient.setQueryData(['queue', 'count'], 10);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useClearQueue(), { wrapper });

            result.current.mutate();

            // Wait for onMutate to run
            await waitFor(() => {
                const updatedCount = queryClient.getQueryData([
                    'queue',
                    'count',
                ]);
                expect(updatedCount).toBe(0);
            });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
        });

        it('should rollback queue count on error', async () => {
            const error = new Error('Failed to clear queue');
            vi.mocked(apiClient.apiClient.delete).mockRejectedValue(error);

            const queryClient = new QueryClient({
                defaultOptions: {
                    queries: { retry: false },
                    mutations: { retry: false },
                },
            });

            // Pre-populate the count
            queryClient.setQueryData(['queue', 'count'], 10);

            const wrapper = ({ children }: { children: ReactNode }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                );

            const { result } = renderHook(() => useClearQueue(), { wrapper });

            result.current.mutate();

            await waitFor(() => expect(result.current.isError).toBe(true));

            // Verify rollback happened
            const rolledBackCount = queryClient.getQueryData([
                'queue',
                'count',
            ]);
            expect(rolledBackCount).toBe(10);
            expect(result.current.error).toEqual(error);
        });
    });
});
