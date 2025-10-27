import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Input } from '../ui';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { LanguageSwitcher } from './LanguageSwitcher';
export function Header() {
    const { t } = useTranslation();
    const { isAuthenticated, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
        }
    };
    const handleLogout = async () => {
        await logout();
        setMobileMenuOpen(false);
        navigate('/');
    };
    return (_jsx("header", { className: "sticky top-0 z-50 bg-background border-b border-border", children: _jsxs("div", { className: "container mx-auto px-4", children: [_jsxs("div", { className: "flex items-center justify-between h-16", children: [_jsx(Link, { to: "/", className: "flex items-center gap-2", children: _jsx("div", { className: "text-2xl font-bold text-gradient", children: "Clipper" }) }), _jsxs("nav", { className: "hidden md:flex items-center gap-1", children: [_jsx(Link, { to: "/", children: _jsx(Button, { variant: "ghost", size: "sm", children: t('nav.hot') }) }), _jsx(Link, { to: "/new", children: _jsx(Button, { variant: "ghost", size: "sm", children: t('nav.new') }) }), _jsx(Link, { to: "/top", children: _jsx(Button, { variant: "ghost", size: "sm", children: t('nav.top') }) }), _jsx(Link, { to: "/rising", children: _jsx(Button, { variant: "ghost", size: "sm", children: t('nav.rising') }) }), _jsx(Link, { to: "/leaderboards", children: _jsxs(Button, { variant: "ghost", size: "sm", children: ["\uD83C\uDFC6 ", t('nav.leaderboards')] }) })] }), _jsx("form", { onSubmit: handleSearch, className: "hidden md:block flex-1 max-w-md mx-4", children: _jsx(Input, { type: "search", placeholder: t('nav.search'), value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "hidden md:flex", children: _jsx(LanguageSwitcher, {}) }), _jsxs("div", { className: "hidden md:flex gap-1", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => setTheme('light'), className: theme === 'light' ? 'bg-primary-100 dark:bg-primary-900' : '', title: t('theme.light'), children: "\u2600\uFE0F" }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setTheme('dark'), className: theme === 'dark' ? 'bg-primary-100 dark:bg-primary-900' : '', title: t('theme.dark'), children: "\uD83C\uDF19" })] }), isAuthenticated ? (_jsxs("div", { className: "hidden md:flex items-center gap-2", children: [_jsx(Link, { to: "/submit", children: _jsx(Button, { variant: "primary", size: "sm", children: t('nav.submit') }) }), _jsx(NotificationBell, {}), _jsx(UserMenu, {})] })) : (_jsx(Link, { to: "/login", className: "hidden md:block", children: _jsx(Button, { variant: "primary", size: "sm", children: t('nav.login') }) })), _jsx(Button, { variant: "ghost", size: "sm", className: "md:hidden", onClick: () => setMobileMenuOpen(!mobileMenuOpen), children: mobileMenuOpen ? '✕' : '☰' })] })] }), mobileMenuOpen && (_jsxs("div", { className: "md:hidden py-4 border-t border-border", children: [_jsxs("nav", { className: "flex flex-col gap-2 mb-4", children: [_jsx(Link, { to: "/", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.hot') }) }), _jsx(Link, { to: "/new", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.new') }) }), _jsx(Link, { to: "/top", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.top') }) }), _jsx(Link, { to: "/rising", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.rising') }) })] }), _jsx("form", { onSubmit: handleSearch, className: "mb-4", children: _jsx(Input, { type: "search", placeholder: t('nav.search'), value: searchQuery, onChange: (e) => setSearchQuery(e.target.value) }) }), isAuthenticated ? (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(Link, { to: "/submit", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "primary", size: "sm", className: "w-full", children: t('nav.submit') }) }), _jsx(Link, { to: "/favorites", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.favorites') }) }), _jsx(Link, { to: "/profile", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.profile') }) }), _jsx(Link, { to: "/settings", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start", children: t('nav.settings') }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "w-full justify-start text-error-600", onClick: handleLogout, children: t('nav.logout') })] })) : (_jsx(Link, { to: "/login", onClick: () => setMobileMenuOpen(false), children: _jsx(Button, { variant: "primary", size: "sm", className: "w-full", children: t('nav.login') }) }))] }))] }) }));
}
