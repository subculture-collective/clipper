export interface WatchParty {
  id: string;
  host_user_id: string;
  title: string;
  playlist_id?: string;
  current_clip_id?: string;
  current_position_seconds: number;
  is_playing: boolean;
  visibility: 'public' | 'friends' | 'invite' | 'private';
  invite_code: string;
  max_participants: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  participants?: WatchPartyParticipant[];
  active_participant_count?: number;
}

export interface WatchPartyParticipant {
  id: string;
  party_id: string;
  user_id: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  role: 'host' | 'co-host' | 'viewer';
  joined_at: string;
  left_at?: string;
  last_sync_at?: string;
  sync_offset_ms: number;
}

export interface WatchPartyMessage {
  id: string;
  watch_party_id: string;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  message: string;
  created_at: string;
}

export interface WatchPartyReaction {
  id: string;
  watch_party_id: string;
  user_id: string;
  username?: string;
  emoji: string;
  video_timestamp?: number;
  created_at: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface SendReactionRequest {
  emoji: string;
  video_timestamp?: number;
}

export interface UpdateWatchPartySettingsRequest {
  visibility?: 'public' | 'friends' | 'invite';
  password?: string;
}

export interface WatchPartyHistoryEntry {
  id: string;
  host_user_id: string;
  title: string;
  visibility: string;
  participant_count: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
}

export interface JoinWatchPartyRequest {
  password?: string;
}

export interface WatchPartyCommand {
  type: 'play' | 'pause' | 'seek' | 'skip' | 'sync-request' | 'chat' | 'reaction' | 'typing';
  party_id: string;
  position?: number;
  clip_id?: string;
  message?: string;
  emoji?: string;
  video_timestamp?: number;
  is_typing?: boolean;
  timestamp: number;
}

export interface WatchPartySyncEvent {
  type: 'sync' | 'play' | 'pause' | 'seek' | 'skip' | 'participant-joined' | 'participant-left' | 'chat_message' | 'reaction' | 'typing';
  party_id: string;
  clip_id?: string;
  position: number;
  is_playing: boolean;
  server_timestamp: number;
  participant?: {
    user_id: string;
    display_name: string;
    avatar_url?: string;
    role: string;
  };
  chat_message?: WatchPartyMessage;
  reaction?: WatchPartyReaction;
  user_id?: string;
  is_typing?: boolean;
}

export interface ReactionAnimation {
  id: string;
  emoji: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface WatchPartyAnalytics {
  party_id: string;
  unique_viewers: number;
  peak_concurrent: number;
  current_viewers: number;
  avg_duration_seconds: number;
  chat_messages: number;
  reactions: number;
  total_engagement: number;
}

export interface HostStats {
  total_parties_hosted: number;
  total_viewers: number;
  avg_viewers_per_party: number;
  total_chat_messages: number;
  total_reactions: number;
}
