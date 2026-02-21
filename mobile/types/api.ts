export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SearchResults {
  clips: import('./clip').Clip[];
  creators: import('./user').User[];
  games: import('./clip').Game[];
  tags: import('./clip').Tag[];
}

export interface SearchSuggestion {
  text: string;
  type: 'clip' | 'creator' | 'game' | 'tag';
}

export interface ApiError {
  error: string;
  message: string;
  status_code: number;
}
