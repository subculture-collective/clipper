import { Play, Pause, SkipForward, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { useState } from 'react';

export interface HostControlsProps {
  isPlaying: boolean;
  currentPosition: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  onSkip?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Host control panel for watch party playback control.
 * Only visible to hosts and co-hosts.
 */
export function HostControls({
  isPlaying,
  currentPosition,
  onPlay,
  onPause,
  onSeek,
  onSkip,
  disabled = false,
  className = '',
}: HostControlsProps) {
  const [seekInput, setSeekInput] = useState('');

  const handleSeekSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const position = parseFloat(seekInput);
    if (!isNaN(position) && position >= 0) {
      onSeek(position);
      setSeekInput('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-surface-secondary rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-content-primary mb-3">
        Host Controls
      </h3>
      
      <div className="flex items-center gap-2 mb-3">
        {/* Play/Pause button */}
        {isPlaying ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            disabled={disabled}
            title="Pause for everyone"
          >
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onPlay}
            disabled={disabled}
            title="Play for everyone"
          >
            <Play className="w-4 h-4 mr-1" />
            Play
          </Button>
        )}

        {/* Skip button - only show when onSkip handler is provided (playlist support) */}
        {onSkip && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={disabled}
            title="Skip to next clip"
          >
            <SkipForward className="w-4 h-4 mr-1" />
            Skip
          </Button>
        )}
      </div>

      {/* Current position display */}
      <div className="text-xs text-content-secondary mb-2 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>Current: {formatTime(currentPosition)}</span>
      </div>

      {/* Seek control */}
      <form onSubmit={handleSeekSubmit} className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.1"
          value={seekInput}
          onChange={(e) => setSeekInput(e.target.value)}
          placeholder="Seek to (seconds)"
          disabled={disabled}
          className="flex-1 px-2 py-1 text-sm bg-surface-primary border border-border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-content-primary placeholder-content-tertiary"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={disabled || !seekInput}
        >
          Seek
        </Button>
      </form>

      <p className="text-xs text-content-tertiary mt-2">
        Note: Twitch embed doesn't support programmatic control. These commands update the party state for future players.
      </p>
    </div>
  );
}
