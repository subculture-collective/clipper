import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
/**
 * Skeleton component for loading placeholders with animated shimmer
 */
export const Skeleton = React.forwardRef(({ className, variant = 'rectangular', width, height, animate = true, style, ...props }, ref) => {
    const variantClasses = {
        text: 'h-4 rounded',
        circular: 'rounded-full',
        rectangular: 'rounded-lg',
    };
    return (_jsx("div", { ref: ref, className: cn('bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden', variantClasses[variant], className), style: {
            width: width || (variant === 'text' ? '100%' : undefined),
            height: height || (variant === 'text' ? undefined : '100%'),
            ...style,
        }, "aria-busy": "true", "aria-live": "polite", ...props, children: animate && (_jsx("div", { className: "absolute inset-0 -translate-x-full animate-shimmer", style: {
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            } })) }));
});
Skeleton.displayName = 'Skeleton';
