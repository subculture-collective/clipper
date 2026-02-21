export interface Comment {
  id: string;
  clip_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  vote_score: number;
  reply_count: number;
  is_edited: boolean;
  is_removed: boolean;
  created_at: string;
  updated_at: string;
  // Enriched from joins
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}
