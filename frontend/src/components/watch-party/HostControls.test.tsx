import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HostControls } from './HostControls';

describe('HostControls', () => {
  it('renders play button when not playing', () => {
    const onPlay = vi.fn();
    render(
      <HostControls
        isPlaying={false}
        currentPosition={0}
        onPlay={onPlay}
        onPause={vi.fn()}
        onSeek={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeInTheDocument();
    
    fireEvent.click(playButton);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('renders pause button when playing', () => {
    const onPause = vi.fn();
    render(
      <HostControls
        isPlaying={true}
        currentPosition={0}
        onPlay={vi.fn()}
        onPause={onPause}
        onSeek={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    const pauseButton = screen.getByRole('button', { name: /pause/i });
    expect(pauseButton).toBeInTheDocument();
    
    fireEvent.click(pauseButton);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('calls onSeek with correct position', () => {
    const onSeek = vi.fn();
    render(
      <HostControls
        isPlaying={false}
        currentPosition={0}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onSeek={onSeek}
        onSkip={vi.fn()}
      />
    );

    const seekInput = screen.getByPlaceholderText(/seek to/i);
    const seekButton = screen.getByRole('button', { name: /^seek$/i });

    fireEvent.change(seekInput, { target: { value: '42.5' } });
    fireEvent.click(seekButton);

    expect(onSeek).toHaveBeenCalledWith(42.5);
  });

  it('disables controls when disabled prop is true', () => {
    render(
      <HostControls
        isPlaying={false}
        currentPosition={0}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onSeek={vi.fn()}
        onSkip={vi.fn()}
        disabled={true}
      />
    );

    const playButton = screen.getByRole('button', { name: /play/i });
    const skipButton = screen.getByRole('button', { name: /skip/i });
    
    expect(playButton).toBeDisabled();
    expect(skipButton).toBeDisabled();
  });

  it('displays current position in MM:SS format', () => {
    render(
      <HostControls
        isPlaying={false}
        currentPosition={125.5}
        onPlay={vi.fn()}
        onPause={vi.fn()}
        onSeek={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByText(/2:05/)).toBeInTheDocument();
  });
});
