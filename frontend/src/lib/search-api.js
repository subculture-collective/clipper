import apiClient from './api';
export const searchApi = {
    // Universal search
    async search(params) {
        const response = await apiClient.get('/search', {
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
    async getSuggestions(query) {
        const response = await apiClient.get('/search/suggestions', {
            params: { q: query },
        });
        return response.data.suggestions;
    },
};
