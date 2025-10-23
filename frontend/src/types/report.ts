export interface Report {
  id: string;
  reporter_id: string;
  reportable_type: 'clip' | 'comment' | 'user';
  reportable_id: string;
  reason: 'spam' | 'harassment' | 'nsfw' | 'violence' | 'copyright' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ReportWithDetails extends Report {
  reporter?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    karma_points: number;
    role: string;
  };
  related_reports?: Report[];
}

export interface CreateReportRequest {
  reportable_type: 'clip' | 'comment' | 'user';
  reportable_id: string;
  reason: 'spam' | 'harassment' | 'nsfw' | 'violence' | 'copyright' | 'other';
  description?: string;
}

export interface UpdateReportRequest {
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  action?: 'remove_content' | 'warn_user' | 'ban_user' | 'mark_false';
}

export interface ReportListResponse {
  data: Report[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
