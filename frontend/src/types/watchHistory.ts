import { Clip } from './clip';

export interface WatchHistoryEntry {
  id: string;
  user_id: string;
  clip_id: string;
  clip?: Clip;
  progress_seconds: number;
  duration_seconds: number;
  progress_percent: number;
  completed: boolean;
  session_id: string;
  watched_at: string;
  created_at: string;
  updated_at: string;
}

export interface WatchHistoryResponse {
  history: WatchHistoryEntry[];
  total: number;
}

export interface ResumePositionResponse {
  has_progress: boolean;
  progress_seconds: number;
  completed: boolean;
}

export interface RecordWatchProgressRequest {
  clip_id: string;
  progress_seconds: number;
  duration_seconds: number;
  session_id: string;
}
