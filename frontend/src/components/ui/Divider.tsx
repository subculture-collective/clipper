import React from 'react';
import { cn } from '@/lib/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Divider orientation
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Text label to display
   */
  label?: string;
  /**
   * Label position
   * @default 'center'
   */
  labelPosition?: 'left' | 'center' | 'right';
}

/**
 * Divider component for separating content
 */
export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      className,
      orientation = 'horizontal',
      label,
      labelPosition = 'center',
      ...props
    },
    ref
  ) => {
    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          className={cn('w-px h-full bg-border', className)}
          role="separator"
          aria-orientation="vertical"
          {...props}
        />
      );
    }

    if (label) {
      const labelPositionClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
      };

      return (
        <div
          ref={ref}
          className={cn('flex items-center gap-4', labelPositionClasses[labelPosition], className)}
          role="separator"
          aria-orientation="horizontal"
          {...props}
        >
          {labelPosition !== 'left' && <div className="flex-1 h-px bg-border" />}
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          {labelPosition !== 'right' && <div className="flex-1 h-px bg-border" />}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn('w-full h-px bg-border', className)}
        role="separator"
        aria-orientation="horizontal"
        {...props}
      />
    );
  }
);

Divider.displayName = 'Divider';
