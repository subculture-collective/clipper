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
          className="absolute text-4xl animate-float-up"
          style={{
            left: `${reaction.x}%`,
            top: `${reaction.y}%`,
            animation: 'floatUp 3s ease-out forwards',
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      {/* Inline animation styles */}
      <style>
        {`
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
        `}
      </style>
    </div>
  );
}
