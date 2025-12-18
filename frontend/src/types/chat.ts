/**
 * Chat-related type definitions
 */

export interface Channel {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  channel_type: 'public' | 'private' | 'direct';
  is_active: boolean;
  max_participants?: number;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  content: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TypingUser {
  user_id: string;
  username: string;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_joined' | 'user_left' | 'presence';
  data: ChatMessage | TypingUser | UserPresence;
}

export interface UserPresence {
  user_id: string;
  username: string;
  status: 'online' | 'offline' | 'away';
}
