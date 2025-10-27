import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
/**
 * Toggle/Switch component with smooth animation
 */
export const Toggle = React.forwardRef(({ className, label, helperText, id, disabled, checked, ...props }, ref) => {
    const toggleId = id || `toggle-${Math.random().toString(36).substring(2, 9)}`;
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("label", { htmlFor: toggleId, className: cn('relative inline-flex items-center cursor-pointer', disabled && 'opacity-50 cursor-not-allowed'), children: [_jsx("input", { ref: ref, type: "checkbox", id: toggleId, className: "sr-only peer", disabled: disabled, checked: checked, "aria-describedby": helperText ? `${toggleId}-helper` : undefined, ...props }), _jsx("div", { className: cn('w-11 h-6 rounded-full transition-colors duration-200', 'bg-neutral-300 dark:bg-neutral-600', 'peer-checked:bg-primary-500', 'peer-focus:ring-2 peer-focus:ring-primary-500 peer-focus:ring-offset-2', 'peer-disabled:cursor-not-allowed', className), children: _jsx("div", { className: cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200', 'bg-white shadow-md', checked && 'translate-x-5') }) })] }), label && (_jsx("label", { htmlFor: toggleId, className: cn('text-sm font-medium text-foreground cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed'), children: label }))] }), helperText && (_jsx("p", { id: `${toggleId}-helper`, className: "text-sm text-muted-foreground ml-14", children: helperText }))] }));
});
Toggle.displayName = 'Toggle';
