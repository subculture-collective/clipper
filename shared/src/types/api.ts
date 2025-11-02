/**
 * API request and response types
 */

import type { Clip, User, Comment } from './models';

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    nextPage?: number | null;
  };
}

export interface ApiError {
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

// Clip API
export interface ListClipsParams {
  page?: number;
  perPage?: number;
  sort?: 'hot' | 'new' | 'top';
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
  game?: string;
  broadcaster?: string;
}

export interface CreateClipInput {
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
}

// Comment API
export interface CreateCommentInput {
  clipId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

// Vote API
export interface VoteInput {
  direction: 'up' | 'down';
}

// Search API
export interface SearchParams {
  query: string;
  type?: 'clips' | 'users' | 'all';
  page?: number;
  perPage?: number;
}

export interface SearchResults {
  clips?: Clip[];
  users?: User[];
}
