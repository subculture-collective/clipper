import React from 'react';
import { cn } from '@/lib/utils';

export interface VerifiedBadgeProps {
  /**
   * Size of the badge
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to show a tooltip explaining verification
   * @default true
   */
  showTooltip?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * VerifiedBadge component for displaying verification status
 * Shows a checkmark badge for verified creators
 */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'md',
  showTooltip = true,
  className,
}) => {
  const tooltipText = 'Verified Creator - This account has been verified by Clipper administrators as authentic';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        className
      )}
      title={showTooltip ? tooltipText : undefined}
      aria-label="Verified creator"
      role="img"
    >
      <svg
        className={cn(
          'fill-current text-blue-500 dark:text-blue-400',
          sizeClasses[size]
        )}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Verification badge icon - checkmark in a shield/badge */}
        <path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5zm-1 14.4l-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z" />
      </svg>
    </span>
  );
};
