export interface Collection {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  visibility: 'private' | 'public' | 'unlisted';
  share_token?: string;
  view_count: number;
  like_count: number;
  follower_count: number;
  is_curated: boolean;
  is_featured: boolean;
  clip_count: number;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}
