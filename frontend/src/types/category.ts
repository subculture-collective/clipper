// Category represents a high-level content category
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// CategoryListResponse represents the response for listing categories
export interface CategoryListResponse {
  categories: Category[];
}

// CategoryDetailResponse represents the response for a single category
export interface CategoryDetailResponse {
  category: Category;
}
