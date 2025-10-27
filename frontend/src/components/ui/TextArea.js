import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
/**
 * TextArea component with auto-resize and character counter options
 */
export const TextArea = React.forwardRef(({ className, label, error, helperText, fullWidth = false, showCount = false, autoResize = false, id, disabled, maxLength, value, onChange, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const [internalValue, setInternalValue] = React.useState(value || '');
    const textareaRef = React.useRef(null);
    const currentValue = value !== undefined ? value : internalValue;
    const currentLength = String(currentValue).length;
    React.useEffect(() => {
        if (autoResize && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [currentValue, autoResize]);
    const handleChange = (e) => {
        if (value === undefined) {
            setInternalValue(e.target.value);
        }
        onChange?.(e);
    };
    const setRefs = (element) => {
        textareaRef.current = element;
        if (typeof ref === 'function') {
            ref(element);
        }
        else if (ref) {
            ref.current = element;
        }
    };
    return (_jsxs("div", { className: cn('flex flex-col gap-1.5', fullWidth && 'w-full'), children: [label && (_jsx("label", { htmlFor: textareaId, className: "text-sm font-medium text-foreground", children: label })), _jsx("textarea", { ref: setRefs, id: textareaId, className: cn('w-full px-3 py-2 rounded-lg border transition-colors resize-none', 'bg-background text-foreground', 'placeholder:text-muted-foreground', 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent', 'disabled:opacity-50 disabled:cursor-not-allowed', error
                    ? 'border-error-500 focus:ring-error-500'
                    : 'border-border hover:border-primary-300', autoResize ? 'overflow-hidden' : 'min-h-[100px]', className), disabled: disabled, maxLength: maxLength, value: value, onChange: handleChange, "aria-invalid": error ? 'true' : 'false', "aria-describedby": error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined, ...props }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [error && (_jsx("p", { id: `${textareaId}-error`, className: "text-sm text-error-500", children: error })), helperText && !error && (_jsx("p", { id: `${textareaId}-helper`, className: "text-sm text-muted-foreground", children: helperText }))] }), showCount && maxLength && (_jsxs("span", { className: "text-sm text-muted-foreground", children: [currentLength, "/", maxLength] }))] })] }));
});
TextArea.displayName = 'TextArea';
