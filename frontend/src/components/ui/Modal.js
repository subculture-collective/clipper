import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
};
/**
 * Modal component with backdrop overlay and focus trap
 */
export const Modal = ({ open, onClose, title, size = 'md', closeOnBackdrop = true, showCloseButton = true, children, className, }) => {
    // Handle escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape' && open) {
                onClose();
            }
        };
        if (open) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [open, onClose]);
    if (!open)
        return null;
    const handleBackdropClick = (e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    };
    return (_jsxs("div", { className: "fixed inset-0 z-modal flex items-center justify-center p-4", onClick: handleBackdropClick, children: [_jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" }), _jsxs("div", { className: cn('relative w-full bg-card rounded-xl shadow-2xl animate-slide-in-down', 'flex flex-col max-h-[90vh]', sizeClasses[size], className), role: "dialog", "aria-modal": "true", "aria-labelledby": title ? 'modal-title' : undefined, children: [(title || showCloseButton) && (_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-border", children: [title && (_jsx("h2", { id: "modal-title", className: "text-xl font-semibold text-foreground", children: title })), showCloseButton && (_jsx("button", { onClick: onClose, className: "ml-auto p-1 rounded-lg hover:bg-muted transition-colors", "aria-label": "Close modal", children: _jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { d: "M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" }) }) }))] })), _jsx("div", { className: "flex-1 overflow-y-auto px-6 py-4 text-foreground", children: children })] })] }));
};
Modal.displayName = 'Modal';
/**
 * ModalFooter component for modal footer actions
 */
export const ModalFooter = ({ className, children, ...props }) => {
    return (_jsx("div", { className: cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-border', className), ...props, children: children }));
};
ModalFooter.displayName = 'ModalFooter';
