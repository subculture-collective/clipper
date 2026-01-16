/**
 * Ban reason template types for reusable ban reasons
 */

export interface BanReasonTemplate {
  id: string;
  name: string;
  reason: string;
  duration_seconds?: number | null;
  is_default: boolean;
  broadcaster_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  usage_count: number;
  last_used_at?: string | null;
}

export interface CreateBanReasonTemplateRequest {
  name: string;
  reason: string;
  duration_seconds?: number | null;
  broadcaster_id?: string | null;
}

export interface UpdateBanReasonTemplateRequest {
  name?: string;
  reason?: string;
  duration_seconds?: number | null;
}

export interface BanReasonTemplatesResponse {
  templates: BanReasonTemplate[];
}
