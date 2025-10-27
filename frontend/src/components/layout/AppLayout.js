import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
export function AppLayout() {
    const location = useLocation();
    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);
    return (_jsxs("div", { className: "min-h-screen flex flex-col bg-background text-foreground transition-theme", children: [_jsx(Header, {}), _jsx("main", { className: "flex-1", children: _jsx(Outlet, {}) }), _jsx(Footer, {})] }));
}
