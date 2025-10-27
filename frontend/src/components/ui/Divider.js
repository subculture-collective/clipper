import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
/**
 * Divider component for separating content
 */
export const Divider = React.forwardRef(({ className, orientation = 'horizontal', label, labelPosition = 'center', ...props }, ref) => {
    if (orientation === 'vertical') {
        return (_jsx("div", { ref: ref, className: cn('w-px h-full bg-border', className), role: "separator", "aria-orientation": "vertical", ...props }));
    }
    if (label) {
        const labelPositionClasses = {
            left: 'justify-start',
            center: 'justify-center',
            right: 'justify-end',
        };
        return (_jsxs("div", { ref: ref, className: cn('flex items-center gap-4', labelPositionClasses[labelPosition], className), role: "separator", "aria-orientation": "horizontal", ...props, children: [labelPosition !== 'left' && _jsx("div", { className: "flex-1 h-px bg-border" }), _jsx("span", { className: "text-sm text-muted-foreground font-medium", children: label }), labelPosition !== 'right' && _jsx("div", { className: "flex-1 h-px bg-border" })] }));
    }
    return (_jsx("div", { ref: ref, className: cn('w-full h-px bg-border', className), role: "separator", "aria-orientation": "horizontal", ...props }));
});
Divider.displayName = 'Divider';
