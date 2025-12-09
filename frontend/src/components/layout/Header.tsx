import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Button, Input } from '../ui';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

export function Header() {
    const { t } = useTranslation();
    const { isAuthenticated, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const mobileSearchInputRef = useRef<HTMLInputElement>(null);

    const handleSearch = (e: React.FormEvent) => {
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

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: '/',
            callback: () => {
                if (mobileMenuOpen && mobileSearchInputRef.current) {
                    mobileSearchInputRef.current.focus();
                } else if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            },
            description: 'Focus search',
        },
        {
            key: 'Escape',
            callback: () => {
                if (mobileMenuOpen) {
                    setMobileMenuOpen(false);
                }
            },
            description: 'Close mobile menu',
        },
    ]);

    return (
        <header className='sticky top-0 z-50 bg-background border-b border-border'>
            <div className='container mx-auto px-4'>
                <div className='flex items-center justify-between h-16'>
                    {/* Logo */}
                    <Link
                        to='/'
                        className='flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-md'
                        aria-label='clpr home'
                    >
                        <div className='text-2xl font-bold text-gradient'>
                            clpr
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav
                        className='hidden md:flex items-center gap-1'
                        aria-label='Main navigation'
                    >
                        <Link to='/'>
                            <Button
                                variant='ghost'
                                size='sm'
                            >
                                {t('nav.hot')}
                            </Button>
                        </Link>
                        <Link to='/new'>
                            <Button
                                variant='ghost'
                                size='sm'
                            >
                                {t('nav.new')}
                            </Button>
                        </Link>
                        <Link to='/top'>
                            <Button
                                variant='ghost'
                                size='sm'
                            >
                                {t('nav.top')}
                            </Button>
                        </Link>
                        <Link to='/rising'>
                            <Button
                                variant='ghost'
                                size='sm'
                            >
                                {t('nav.rising')}
                            </Button>
                        </Link>
                        <Link to='/discover/scraped'>
                            <Button
                                variant='ghost'
                                size='sm'
                            >
                                🔍 {t('nav.discover')}
                            </Button>
                        </Link>
                        <Link to='/leaderboards'>
                            <Button
                                variant='ghost'
                                size='sm'
                            >
                                🏆 {t('nav.leaderboards')}
                            </Button>
                        </Link>
                    </nav>

                    {/* Search Bar */}
                    <form
                        onSubmit={handleSearch}
                        className='hidden md:block flex-1 max-w-md mx-4'
                        role='search'
                        aria-label='Search clips'
                    >
                        <Input
                            ref={searchInputRef}
                            type='search'
                            placeholder={`${t(
                                'nav.search'
                            )} (Press / to focus)`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label='Search clips'
                        />
                    </form>

                    {/* Right Side Actions */}
                    <div className='flex items-center gap-2'>
                        {/* Language Switcher */}
                        <div className='hidden md:flex'>
                            <LanguageSwitcher />
                        </div>

                        {/* Theme Toggle */}
                        <div
                            className='hidden md:flex gap-1'
                            role='group'
                            aria-label='Theme selection'
                        >
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setTheme('light')}
                                className={
                                    theme === 'light'
                                        ? 'bg-primary-100 dark:bg-primary-900'
                                        : ''
                                }
                                title={t('theme.light')}
                                aria-label={t('theme.light')}
                                aria-pressed={theme === 'light'}
                            >
                                ☀️
                            </Button>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setTheme('dark')}
                                className={
                                    theme === 'dark'
                                        ? 'bg-primary-100 dark:bg-primary-900'
                                        : ''
                                }
                                title={t('theme.dark')}
                                aria-label={t('theme.dark')}
                                aria-pressed={theme === 'dark'}
                            >
                                🌙
                            </Button>
                        </div>

                        {/* User Menu or Login */}
                        {isAuthenticated ? (
                            <div className='hidden md:flex items-center gap-2'>
                                <Link to='/submit'>
                                    <Button
                                        variant='primary'
                                        size='sm'
                                    >
                                        {t('nav.submit')}
                                    </Button>
                                </Link>
                                <NotificationBell />
                                <UserMenu />
                            </div>
                        ) : (
                            <Link
                                to='/login'
                                className='hidden md:block'
                            >
                                <Button
                                    variant='primary'
                                    size='sm'
                                >
                                    {t('nav.login')}
                                </Button>
                            </Link>
                        )}

                        {/* Mobile Menu Button */}
                        <Button
                            variant='ghost'
                            size='sm'
                            className='md:hidden'
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={
                                mobileMenuOpen ? 'Close menu' : 'Open menu'
                            }
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? '✕' : '☰'}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div
                        className='md:hidden py-4 border-t border-border'
                        role='navigation'
                        aria-label='Mobile navigation'
                    >
                        <nav className='flex flex-col gap-2 mb-4'>
                            <Link
                                to='/'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    {t('nav.hot')}
                                </Button>
                            </Link>
                            <Link
                                to='/new'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    {t('nav.new')}
                                </Button>
                            </Link>
                            <Link
                                to='/top'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    {t('nav.top')}
                                </Button>
                            </Link>
                            <Link
                                to='/rising'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    {t('nav.rising')}
                                </Button>
                            </Link>
                            <Link
                                to='/discover/scraped'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    🔍 {t('nav.discover')}
                                </Button>
                            </Link>
                        </nav>

                        <form
                            onSubmit={handleSearch}
                            className='mb-4'
                            role='search'
                            aria-label='Search clips'
                        >
                            <Input
                                ref={mobileSearchInputRef}
                                type='search'
                                placeholder={`${t(
                                    'nav.search'
                                )} (Press / to focus)`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-label='Search clips'
                            />
                        </form>

                        {isAuthenticated ? (
                            <div className='flex flex-col gap-2'>
                                <Link
                                    to='/submit'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='primary'
                                        size='sm'
                                        className='w-full'
                                    >
                                        {t('nav.submit')}
                                    </Button>
                                </Link>
                                <Link
                                    to='/favorites'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        {t('nav.favorites')}
                                    </Button>
                                </Link>
                                <Link
                                    to='/profile'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        {t('nav.profile')}
                                    </Button>
                                </Link>
                                <Link
                                    to='/settings'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        {t('nav.settings')}
                                    </Button>
                                </Link>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start text-error-600'
                                    onClick={handleLogout}
                                >
                                    {t('nav.logout')}
                                </Button>
                            </div>
                        ) : (
                            <Link
                                to='/login'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='primary'
                                    size='sm'
                                    className='w-full'
                                >
                                    {t('nav.login')}
                                </Button>
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
