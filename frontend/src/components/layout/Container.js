import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
    default: 'max-w-7xl',
};
/**
 * Container component provides consistent max-width wrapper with responsive padding
 */
export const Container = React.forwardRef(({ className, maxWidth = 'default', center = true, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('w-full px-4 sm:px-6 lg:px-8', maxWidthClasses[maxWidth], center && 'mx-auto', className), ...props, children: children }));
});
Container.displayName = 'Container';
