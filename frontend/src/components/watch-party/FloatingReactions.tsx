import type { ReactionAnimation } from '@/types/watchParty';

interface FloatingReactionsProps {
  reactions: ReactionAnimation[];
  className?: string;
}

/**
 * Simple component to display floating reaction animations.
 * Used in watch parties to show reactions from all participants.
 */
export function FloatingReactions({ reactions, className = '' }: FloatingReactionsProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-4xl"
          style={{
            left: `${reaction.x}%`,
            top: `${reaction.y}%`,
            animation: 'floatUp 3s ease-out forwards',
          }}
        >
          {reaction.emoji}
        </div>
      ))}
    </div>
  );
}

// CSS animation for floating reactions (add to document if not already present)
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

// Add keyframes to document if not already present (singleton pattern)
if (typeof document !== 'undefined') {
  const styleId = 'floating-reactions-animation';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = floatUpKeyframes;
    document.head.appendChild(style);
  }
}
