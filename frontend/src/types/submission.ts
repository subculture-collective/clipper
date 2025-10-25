export interface ClipSubmission {
  id: string;
  user_id: string;
  twitch_clip_id: string;
  twitch_clip_url: string;
  title?: string;
  custom_title?: string;
  tags?: string[];
  is_nsfw: boolean;
  submission_reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Metadata from Twitch
  creator_name?: string;
  creator_id?: string;
  broadcaster_name?: string;
  broadcaster_id?: string;
  broadcaster_name_override?: string;
  game_id?: string;
  game_name?: string;
  thumbnail_url?: string;
  duration?: number;
  view_count: number;
}

export interface ClipSubmissionWithUser extends ClipSubmission {
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    karma_points: number;
    role: string;
  };
}

export interface SubmitClipRequest {
  clip_url: string;
  custom_title?: string;
  tags?: string[];
  is_nsfw: boolean;
  submission_reason?: string;
  broadcaster_name_override?: string;
}

export interface SubmissionStats {
  user_id: string;
  total_submissions: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  approval_rate: number;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  submission: ClipSubmission;
}

export interface SubmissionListResponse {
  success: boolean;
  data: ClipSubmission[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ModerationQueueResponse {
  success: boolean;
  data: ClipSubmissionWithUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SubmissionStatsResponse {
  success: boolean;
  data: SubmissionStats;
}

export interface ApprovalRequest {
  id: string;
}

export interface RejectionRequest {
  id: string;
  reason: string;
}
