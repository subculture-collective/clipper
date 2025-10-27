import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
export function UserMenu() {
    const { user, logout, isModeratorOrAdmin } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);
    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        navigate('/');
    };
    if (!user)
        return null;
    return (_jsxs("div", { className: "relative", ref: menuRef, children: [_jsxs("button", { onClick: () => setIsOpen(!isOpen), className: "flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted transition-colors", "aria-expanded": isOpen, "aria-haspopup": "true", children: [user.avatar_url ? (_jsx("img", { src: user.avatar_url, alt: user.username, className: "w-8 h-8 rounded-full" })) : (_jsx("div", { className: "w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold", children: user.username.charAt(0).toUpperCase() })), _jsx("span", { className: "hidden md:inline text-sm font-medium", children: user.username }), _jsx("svg", { className: `w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`, fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }) })] }), isOpen && (_jsxs("div", { className: "absolute right-0 mt-2 w-56 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50", children: [_jsxs("div", { className: "px-4 py-3 border-b border-border", children: [_jsx("p", { className: "font-semibold", children: user.display_name }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["@", user.username] }), _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [user.karma_points, " karma"] })] }), _jsxs("div", { className: "py-1", children: [_jsx(Link, { to: "/profile", className: "block px-4 py-2 text-sm hover:bg-muted transition-colors", onClick: () => setIsOpen(false), children: "\uD83D\uDC64 Profile" }), _jsx(Link, { to: "/settings", className: "block px-4 py-2 text-sm hover:bg-muted transition-colors", onClick: () => setIsOpen(false), children: "\u2699\uFE0F Settings" }), _jsx(Link, { to: "/favorites", className: "block px-4 py-2 text-sm hover:bg-muted transition-colors", onClick: () => setIsOpen(false), children: "\u2B50 Favorites" }), isModeratorOrAdmin && (_jsxs(_Fragment, { children: [_jsx("div", { className: "border-t border-border my-1" }), _jsx(Link, { to: "/admin/dashboard", className: "block px-4 py-2 text-sm hover:bg-muted transition-colors text-primary-600", onClick: () => setIsOpen(false), children: "\uD83D\uDEE1\uFE0F Admin Panel" })] })), _jsx("div", { className: "border-t border-border my-1" }), _jsx("button", { onClick: handleLogout, className: "block w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors text-error-600", children: "\uD83D\uDEAA Logout" })] })] }))] }));
}
