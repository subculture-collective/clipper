import { cn } from '@/lib/utils';
import type { VideoQuality } from '@/lib/adaptive-bitrate';

export interface QualitySelectorProps {
  value: VideoQuality;
  onChange: (quality: VideoQuality) => void;
  availableQualities: VideoQuality[];
  className?: string;
}

const qualityLabels: Record<VideoQuality, string> = {
  '480p': '480p',
  '720p': '720p',
  '1080p': '1080p',
  '2K': '2K',
  '4K': '4K',
  'auto': 'Auto',
};

/**
 * Quality selector dropdown for video player
 * Allows users to manually select video quality or enable auto quality
 */
export function QualitySelector({
  value,
  onChange,
  availableQualities,
  className,
}: QualitySelectorProps) {
  return (
    <div className={cn('relative inline-block', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as VideoQuality)}
        className={cn(
          'appearance-none bg-black/60 hover:bg-black/80 text-white',
          'px-3 py-2 pr-8 rounded transition-colors cursor-pointer',
          'text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-white/50',
          'min-w-[80px]'
        )}
        aria-label="Select video quality"
      >
        {availableQualities.map((quality) => (
          <option key={quality} value={quality}>
            {qualityLabels[quality]}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
