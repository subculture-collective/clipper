import type { Clip } from './clip';
import type { User } from '../lib/auth-api';
import type { Tag } from './tag';

export interface SearchRequest {
  query: string;
  type?: 'clips' | 'creators' | 'games' | 'tags' | 'all';
  sort?: 'relevance' | 'recent' | 'popular';
  gameId?: string;
  creatorId?: string;
  language?: string;
  tags?: string[];
  minVotes?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultsByType;
  counts: SearchCounts;
  facets?: SearchFacets;
  meta: SearchMeta;
}

export interface SearchResultsByType {
  clips?: Clip[];
  creators?: User[];
  games?: Game[];
  tags?: Tag[];
}

export interface SearchCounts {
  clips: number;
  creators: number;
  games: number;
  tags: number;
}

export interface SearchFacets {
  languages?: FacetBucket[];
  games?: FacetBucket[];
  tags?: FacetBucket[];
  date_range?: DateRangeFacet;
}

export interface FacetBucket {
  key: string;
  label?: string;
  count: number;
}

export interface DateRangeFacet {
  last_hour: number;
  last_day: number;
  last_week: number;
  last_month: number;
  older: number;
}

export interface SearchMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface Game {
  id: string;
  name: string;
  clip_count: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'game' | 'creator' | 'tag';
}

export interface SearchFilters {
  gameId?: string;
  creatorId?: string;
  language?: string;
  tags?: string[];
  minVotes?: number;
  dateFrom?: string;
  dateTo?: string;
}
