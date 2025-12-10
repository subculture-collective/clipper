import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { categoryApi } from '../../lib/category-api';
import type { Category } from '../../types/category';

export function CategoriesNav() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryApi.listCategories();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading || categories.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-hide">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-nowrap text-sm transition-colors"
            >
              {category.icon && <span>{category.icon}</span>}
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
