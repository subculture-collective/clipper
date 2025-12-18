import React, { useState, useEffect, useCallback } from 'react';
import { ReactionAnimation } from '@/types/watchParty';

interface ReactionOverlayProps {
  partyId: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  onSendReaction: (emoji: string, videoTimestamp?: number) => void;
  className?: string;
}

// Default emoji reactions
const DEFAULT_REACTIONS = ['🔥', '😂', '❤️', '👍', '🎉', '😮'];

/**
 * ReactionOverlay component for emoji reactions on video player
 */
export function ReactionOverlay({
  partyId,
  videoRef,
  onSendReaction,
  className = '',
}: ReactionOverlayProps) {
  const [reactions, setReactions] = useState<ReactionAnimation[]>([]);
  const [cooldown, setCooldown] = useState<Record<string, boolean>>({});

  // Add a new reaction animation
  const addReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const x = Math.random() * 80 + 10; // Random X position between 10% and 90%
    const y = 0; // Start from bottom

    const reaction: ReactionAnimation = {
      id,
      emoji,
      x,
      y,
      timestamp: Date.now(),
    };

    setReactions((prev) => [...prev, reaction]);

    // Remove reaction after animation completes (3 seconds)
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  }, []);

  // Handle reaction button click
  const handleReactionClick = useCallback(
    (emoji: string) => {
      // Check cooldown (prevent spam)
      if (cooldown[emoji]) return;

      // Get current video timestamp
      const videoTimestamp = videoRef.current?.currentTime;

      // Send reaction to server
      onSendReaction(emoji, videoTimestamp);

      // Add local animation
      addReaction(emoji);

      // Set cooldown for 1 second
      setCooldown((prev) => ({ ...prev, [emoji]: true }));
      setTimeout(() => {
        setCooldown((prev) => ({ ...prev, [emoji]: false }));
      }, 1000);
    },
    [videoRef, onSendReaction, addReaction, cooldown]
  );

  // Listen for reactions from other users
  useEffect(() => {
    // This would be called from the parent component
    // when a reaction event is received via WebSocket
    const handleExternalReaction = (emoji: string) => {
      addReaction(emoji);
    };

    // Expose method to parent
    (window as any)[`addReactionToParty_${partyId}`] = handleExternalReaction;

    return () => {
      delete (window as any)[`addReactionToParty_${partyId}`];
    };
  }, [partyId, addReaction]);

  return (
    <div className={`relative w-full h-full pointer-events-none ${className}`}>
      {/* Floating reactions */}
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl animate-float-up pointer-events-none"
          style={{
            left: `${reaction.x}%`,
            bottom: '10%',
            animation: 'floatUp 3s ease-out forwards',
          }}
        >
          {reaction.emoji}
        </div>
      ))}

      {/* Reaction buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 pointer-events-auto">
        {DEFAULT_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReactionClick(emoji)}
            disabled={cooldown[emoji]}
            className={`
              w-12 h-12 rounded-full bg-gray-900/80 backdrop-blur-sm
              flex items-center justify-center text-2xl
              hover:bg-gray-800/90 hover:scale-110
              active:scale-95
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              border-2 border-gray-700
            `}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// CSS animation for floating reactions (add to your global styles)
const floatUpKeyframes = `
@keyframes floatUp {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-50px) scale(1.2);
    opacity: 0.8;
  }
  100% {
    transform: translateY(-100px) scale(0.8);
    opacity: 0;
  }
}
`;

// Add keyframes to document if not already present
if (typeof document !== 'undefined') {
  const styleId = 'reaction-float-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = floatUpKeyframes;
    document.head.appendChild(style);
  }
}
