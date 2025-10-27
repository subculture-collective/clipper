import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const variantClasses = {
    default: 'bg-card border border-border',
    elevated: 'bg-card shadow-lg',
    outlined: 'bg-transparent border-2 border-border',
};
/**
 * Card component with header, body, and footer sections
 */
export const Card = React.forwardRef(({ className, variant = 'default', clickable = false, hover = false, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('rounded-xl transition-all duration-200', variantClasses[variant], clickable && 'cursor-pointer', hover && 'hover:shadow-xl hover:scale-[1.02]', className), ...props, children: children }));
});
Card.displayName = 'Card';
/**
 * CardHeader component for card header section
 */
export const CardHeader = React.forwardRef(({ className, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('px-6 py-4 border-b border-border', className), ...props, children: children }));
});
CardHeader.displayName = 'CardHeader';
/**
 * CardBody component for card body section
 */
export const CardBody = React.forwardRef(({ className, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('px-6 py-4', className), ...props, children: children }));
});
CardBody.displayName = 'CardBody';
/**
 * CardFooter component for card footer section
 */
export const CardFooter = React.forwardRef(({ className, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('px-6 py-4 border-t border-border', className), ...props, children: children }));
});
CardFooter.displayName = 'CardFooter';
