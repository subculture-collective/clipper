interface LiveIndicatorProps {
  viewerCount: number;
}

function formatViewerCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

export function LiveIndicator({ viewerCount }: LiveIndicatorProps) {
  return (
    <div className="absolute top-4 left-4 bg-red-600 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-lg z-10">
      {/* Pulsing Live Dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>

      {/* LIVE Text */}
      <span className="font-bold text-sm text-white uppercase">LIVE</span>

      {/* Viewer Count */}
      <span className="text-xs text-white/90 font-medium">
        {formatViewerCount(viewerCount)} viewers
      </span>
    </div>
  );
}
