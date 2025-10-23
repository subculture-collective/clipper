import apiClient from './api';
import type {
  SearchRequest,
  SearchResponse,
  SearchSuggestion,
} from '../types/search';

export const searchApi = {
  // Universal search
  async search(params: SearchRequest): Promise<SearchResponse> {
    const response = await apiClient.get<SearchResponse>('/search', {
      params: {
        q: params.query,
        type: params.type,
        sort: params.sort,
        game_id: params.gameId,
        creator_id: params.creatorId,
        language: params.language,
        tags: params.tags,
        min_votes: params.minVotes,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        page: params.page || 1,
        limit: params.limit || 20,
      },
    });
    return response.data;
  },

  // Get autocomplete suggestions
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    const response = await apiClient.get<{
      query: string;
      suggestions: SearchSuggestion[];
    }>('/search/suggestions', {
      params: { q: query },
    });
    return response.data.suggestions;
  },
};
