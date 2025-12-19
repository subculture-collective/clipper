/**
 * Forum type definitions
 * Based on backend API types from forum_handler.go
 */

export interface ForumThread {
  id: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  game_id?: string;
  game_name?: string;
  tags: string[];
  view_count: number;
  reply_count: number;
  locked: boolean;
  locked_at?: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: string;
  user_id: string;
  username: string;
  thread_id: string;
  parent_reply_id?: string;
  content: string;
  depth: number;
  path: string;
  created_at: string;
  updated_at: string;
  replies?: ForumReply[];
  is_deleted?: boolean;
}

export interface CreateThreadRequest {
  title: string;
  content: string;
  game_id?: string;
  tags?: string[];
}

export interface CreateReplyRequest {
  content: string;
  parent_reply_id?: string;
}

export interface UpdateReplyRequest {
  content: string;
}

export interface ForumThreadsResponse {
  threads: ForumThread[];
  total: number;
  page: number;
  limit: number;
}

export interface ForumThreadDetailResponse {
  thread: ForumThread;
  replies: ForumReply[];
}

export interface ForumSearchResponse {
  threads: ForumThread[];
  replies: ForumReply[];
  total: number;
}

export type ForumSort = 'newest' | 'most-replied' | 'trending' | 'hot';

export interface ForumFilters {
  game_id?: string;
  tags?: string[];
  sort?: ForumSort;
  search?: string;
}
