import { Toast, ToastContainer } from '@/components/ui/Toast';
import { createContext, useCallback, useContext, useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
const ToastContext = createContext(undefined);
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const removeToast = useCallback((id) => {
        setToasts((prevToasts) =>
            prevToasts.filter((toast) => toast.id !== id)
        );
    }, []);
    const showToast = useCallback(
        (message, variant = 'info', duration = 3000) => {
            const id = `toast-${Date.now()}-${Math.random()}`;
            const newToast = {
                id,
                variant,
                message,
                duration,
            };
            setToasts((prevToasts) => [...prevToasts, newToast]);
        },
        []
    );
    const success = useCallback(
        (message, duration) => {
            showToast(message, 'success', duration);
        },
        [showToast]
    );
    const error = useCallback(
        (message, duration) => {
            showToast(message, 'error', duration);
        },
        [showToast]
    );
    const warning = useCallback(
        (message, duration) => {
            showToast(message, 'warning', duration);
        },
        [showToast]
    );
    const info = useCallback(
        (message, duration) => {
            showToast(message, 'info', duration);
        },
        [showToast]
    );
    return _jsxs(ToastContext.Provider, {
        value: { showToast, success, error, warning, info },
        children: [
            children,
            _jsx(ToastContainer, {
                children: toasts.map((toast) =>
                    _jsx(
                        Toast,
                        {
                            id: toast.id,
                            variant: toast.variant,
                            message: toast.message,
                            duration: toast.duration,
                            onDismiss: removeToast,
                        },
                        toast.id
                    )
                ),
            }),
        ],
    });
};
// Export the hook in a separate export to satisfy react-refresh
export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
