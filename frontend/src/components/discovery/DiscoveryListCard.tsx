import { Link } from 'react-router-dom';
import { Bookmark, Users } from 'lucide-react';
import type { DiscoveryListWithStats } from '../../types/discoveryList';
import { cn } from '../../lib/utils';

interface DiscoveryListCardProps {
  list: DiscoveryListWithStats;
  showPreviewClips?: boolean;
}

export function DiscoveryListCard({
  list,
  showPreviewClips = true,
}: DiscoveryListCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <Link
      to={`/discover/lists/${list.slug}`}
      className="block bg-card border border-border rounded-xl hover:shadow-lg transition-all hover:border-primary-500/30 overflow-hidden group"
    >
      {/* Preview Clips Thumbnails */}
      {showPreviewClips && list.preview_clips && list.preview_clips.length > 0 && (
        <div className="grid grid-cols-2 gap-1 p-2">
          {list.preview_clips.slice(0, 4).map((clip, idx) => (
            <div
              key={clip.id}
              className={cn(
                'aspect-video rounded-lg overflow-hidden bg-accent',
                list.preview_clips!.length === 1 && 'col-span-2',
                list.preview_clips!.length === 3 && idx === 0 && 'col-span-2'
              )}
            >
              {clip.thumbnail_url ? (
                <img
                  src={clip.thumbnail_url}
                  alt={clip.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent to-accent/50" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* List Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg mb-1 line-clamp-1 group-hover:text-primary-500 transition-colors">
              {list.name}
            </h3>
            {list.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {list.description}
              </p>
            )}
          </div>
          {list.is_featured && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-500/10 text-primary-500 border border-primary-500/20 shrink-0">
              Featured
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <span>{formatNumber(list.clip_count)} clips</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" aria-hidden="true" />
            <span>{formatNumber(list.follower_count)} followers</span>
          </div>
          {list.is_bookmarked && (
            <div className="flex items-center gap-1.5 ml-auto">
              <Bookmark className="w-4 h-4 fill-current text-primary-500" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
