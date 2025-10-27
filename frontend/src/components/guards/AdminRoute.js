import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
export function AdminRoute({ children }) {
    const { isAuthenticated, isModeratorOrAdmin, isLoading } = useAuth();
    if (isLoading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" }) }));
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (!isModeratorOrAdmin) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-4xl font-bold text-error-500 mb-4", children: "403" }), _jsx("p", { className: "text-xl text-muted-foreground", children: "Access Denied" }), _jsx("p", { className: "text-muted-foreground mt-2", children: "You don't have permission to access this page." })] }) }));
    }
    return _jsx(_Fragment, { children: children });
}
