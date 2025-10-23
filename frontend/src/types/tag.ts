export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  usage_count: number;
  created_at: string;
}

export interface TagListResponse {
  tags: Tag[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface TagSearchResponse {
  tags: Tag[];
}

export interface TagDetailResponse {
  tag: Tag;
  clip_count: number;
}

export interface ClipTagsResponse {
  tags: Tag[];
}

export interface AddTagsRequest {
  tag_slugs: string[];
}
