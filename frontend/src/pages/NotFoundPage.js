import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { Container, Button } from '../components';
export function NotFoundPage() {
    return (_jsx(Container, { className: "py-16", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-6xl font-bold text-error-500 mb-4", children: "404" }), _jsx("h2", { className: "text-2xl font-semibold mb-2", children: "Page Not Found" }), _jsx("p", { className: "text-muted-foreground mb-8", children: "The page you're looking for doesn't exist or has been moved." }), _jsx(Link, { to: "/", children: _jsx(Button, { variant: "primary", children: "Go Home" }) })] }) }));
}
