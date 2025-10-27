import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
};
const statusClasses = {
    online: 'bg-success-500',
    offline: 'bg-neutral-400',
    away: 'bg-warning-500',
    busy: 'bg-error-500',
};
/**
 * Avatar component with image fallback and status indicator
 */
export const Avatar = React.forwardRef(({ className, src, alt, fallback, size = 'md', status, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);
    const showImage = src && !imageError;
    return (_jsxs("div", { ref: ref, className: cn('relative inline-flex', className), ...props, children: [_jsx("div", { className: cn('rounded-full overflow-hidden flex items-center justify-center', 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-100', 'font-medium', sizeClasses[size]), children: showImage ? (_jsx("img", { src: src, alt: alt || 'Avatar', className: "h-full w-full object-cover", onError: () => setImageError(true) })) : (_jsx("span", { children: fallback || '?' })) }), status && (_jsx("span", { className: cn('absolute bottom-0 right-0 block rounded-full ring-2 ring-background', statusClasses[status], size === 'xs' && 'h-1.5 w-1.5', size === 'sm' && 'h-2 w-2', size === 'md' && 'h-2.5 w-2.5', size === 'lg' && 'h-3 w-3', size === 'xl' && 'h-4 w-4'), "aria-label": `Status: ${status}` }))] }));
});
Avatar.displayName = 'Avatar';
