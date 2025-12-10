import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryListApi } from '../lib/discovery-list-api';
import { useAuth } from './useAuth';

export function useDiscoveryLists(params?: {
  featured?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['discovery-lists', params],
    queryFn: () => discoveryListApi.listDiscoveryLists(params),
  });
}

export function useDiscoveryList(idOrSlug: string) {
  return useQuery({
    queryKey: ['discovery-list', idOrSlug],
    queryFn: () => discoveryListApi.getDiscoveryList(idOrSlug),
    enabled: !!idOrSlug,
  });
}

export function useDiscoveryListClips(
  listId: string,
  params?: { limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ['discovery-list-clips', listId, params],
    queryFn: () => discoveryListApi.getDiscoveryListClips(listId, params),
    enabled: !!listId,
  });
}

export function useFollowDiscoveryList() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: (listId: string) => discoveryListApi.followDiscoveryList(listId),
    onSuccess: (_data, listId) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['discovery-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['discovery-lists'] });
      queryClient.invalidateQueries({ queryKey: ['user-followed-lists'] });
    },
    onError: (error) => {
      console.error('Failed to follow discovery list:', error);
    },
  });
}

export function useUnfollowDiscoveryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) =>
      discoveryListApi.unfollowDiscoveryList(listId),
    onSuccess: (_data, listId) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['discovery-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['discovery-lists'] });
      queryClient.invalidateQueries({ queryKey: ['user-followed-lists'] });
    },
    onError: (error) => {
      console.error('Failed to unfollow discovery list:', error);
    },
  });
}

export function useBookmarkDiscoveryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) =>
      discoveryListApi.bookmarkDiscoveryList(listId),
    onSuccess: (_data, listId) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['discovery-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['discovery-lists'] });
    },
    onError: (error) => {
      console.error('Failed to bookmark discovery list:', error);
    },
  });
}

export function useUnbookmarkDiscoveryList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) =>
      discoveryListApi.unbookmarkDiscoveryList(listId),
    onSuccess: (_data, listId) => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['discovery-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['discovery-lists'] });
    },
    onError: (error) => {
      console.error('Failed to unbookmark discovery list:', error);
    },
  });
}

export function useUserFollowedLists(params?: {
  limit?: number;
  offset?: number;
}) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['user-followed-lists', params],
    queryFn: () => discoveryListApi.getUserFollowedLists(params),
    enabled: isAuthenticated,
  });
}
