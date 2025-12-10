import type { Clip } from './clip';

export interface DiscoveryList {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryListWithStats extends DiscoveryList {
  clip_count: number;
  follower_count: number;
  is_following: boolean;
  is_bookmarked: boolean;
  preview_clips?: Clip[];
}

export interface DiscoveryListClip {
  id: string;
  list_id: string;
  clip_id: string;
  display_order: number;
  added_at: string;
}
