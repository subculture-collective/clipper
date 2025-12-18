import { Link } from 'react-router-dom';
import { Button } from '../ui';

interface StreamInfo {
  streamer_username: string;
  is_live: boolean;
  title?: string | null;
  game_name?: string | null;
  viewer_count: number;
  thumbnail_url?: string | null;
  started_at?: string | null;
  last_went_offline?: string | null;
}

interface StreamOfflineScreenProps {
  channel: string;
  streamInfo?: StreamInfo | null;
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function StreamOfflineScreen({ channel, streamInfo }: StreamOfflineScreenProps) {
  return (
    <div className="w-full aspect-video bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col items-center justify-center text-center p-8">
      <div className="max-w-2xl">
        {/* Offline Icon */}
        <div className="text-6xl mb-6 opacity-50">📺</div>

        {/* Offline Message */}
        <h2 className="text-3xl font-bold mb-3 text-white">
          {channel} is offline
        </h2>

        {/* Last Streamed Info */}
        {streamInfo?.last_went_offline ? (
          <p className="text-gray-400 dark:text-gray-500 mb-8 text-lg">
            Last streamed {formatRelativeTime(streamInfo.last_went_offline)}
          </p>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 mb-8 text-lg">
            Check back later for the next stream
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              window.open(`https://twitch.tv/${channel}`, '_blank', 'noopener,noreferrer');
            }}
          >
            <span className="mr-2">📣</span>
            Visit on Twitch
          </Button>

          <Link to={`/clips?streamer=${channel}`}>
            <Button variant="secondary" size="lg">
              <span className="mr-2">🎬</span>
              View Recent Clips
            </Button>
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-600">
          <p>This page will automatically update when {channel} goes live</p>
        </div>
      </div>
    </div>
  );
}
