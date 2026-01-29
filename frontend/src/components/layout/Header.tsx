import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Button } from '../ui';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

export function Header() {
    const { t } = useTranslation();
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await logout();
        setMobileMenuOpen(false);
        navigate('/');
    };

    // Close More menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                moreMenuRef.current &&
                !moreMenuRef.current.contains(event.target as Node)
            ) {
                setMoreMenuOpen(false);
            }
        };

        if (moreMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [moreMenuOpen]);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: 'Escape',
            callback: () => {
                if (mobileMenuOpen) setMobileMenuOpen(false);
                if (moreMenuOpen) setMoreMenuOpen(false);
            },
            description: 'Close menus',
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

                    {/* Navigation (desktop) */}
                    <nav
                        className='hidden md:flex items-center gap-1'
                        aria-label='Main navigation'
                        data-testid='main-nav'
                    >
                        <Link to='/'>
                            <Button variant='ghost' size='sm'>
                                🏠 Feed
                            </Button>
                        </Link>
                        <Link to='/discover'>
                            <Button variant='ghost' size='sm'>
                                🔍 Discover
                            </Button>
                        </Link>

                        {/* More dropdown */}
                        <div className='relative' ref={moreMenuRef}>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                                aria-expanded={moreMenuOpen}
                                aria-haspopup='true'
                            >
                                ⋯ More
                                <svg
                                    className={`w-4 h-4 ml-1 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`}
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                >
                                    <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M19 9l-7 7-7-7'
                                    />
                                </svg>
                            </Button>

                            {moreMenuOpen && (
                                <div
                                    className='absolute left-0 mt-1 w-48 bg-background border border-border rounded-md shadow-lg overflow-hidden z-50'
                                    role='menu'
                                >
                                    <Link
                                        to='/leaderboards'
                                        className='block px-4 py-2 text-sm hover:bg-muted transition-colors'
                                        onClick={() => setMoreMenuOpen(false)}
                                        role='menuitem'
                                    >
                                        🏆 {t('nav.leaderboards')}
                                    </Link>
                                    <Link
                                        to='/playlists/discover'
                                        className='block px-4 py-2 text-sm hover:bg-muted transition-colors'
                                        onClick={() => setMoreMenuOpen(false)}
                                        role='menuitem'
                                    >
                                        🎵 Playlists
                                    </Link>
                                    <Link
                                        to='/watch-parties/browse'
                                        className='block px-4 py-2 text-sm hover:bg-muted transition-colors'
                                        onClick={() => setMoreMenuOpen(false)}
                                        role='menuitem'
                                    >
                                        👥 Watch Parties
                                    </Link>
                                    {isAuthenticated && (
                                        <Link
                                            to='/discover/live'
                                            className='block px-4 py-2 text-sm hover:bg-muted transition-colors'
                                            onClick={() =>
                                                setMoreMenuOpen(false)
                                            }
                                            role='menuitem'
                                        >
                                            🔴 Live
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </nav>

                    {/* Right Side Actions */}
                    <div className='flex items-center gap-2'>
                        {/* User Menu or Login */}
                        {isAuthenticated ?
                            <div className='hidden md:flex items-center gap-2'>
                                <Link to='/submit'>
                                    <Button variant='primary' size='sm'>
                                        {t('nav.submit')}
                                    </Button>
                                </Link>
                                <NotificationBell />
                                <UserMenu />
                            </div>
                        :   <Link to='/login' className='hidden md:block'>
                                <Button
                                    variant='primary'
                                    size='sm'
                                    data-testid='login-button'
                                    aria-label='Login'
                                >
                                    {t('nav.login')}
                                </Button>
                            </Link>
                        }

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
                            data-testid='mobile-menu-toggle'
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
                        <nav className='flex flex-col gap-1 mb-4'>
                            <Link
                                to='/'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                    data-testid='mobile-nav-home'
                                >
                                    🏠 Feed
                                </Button>
                            </Link>
                            <Link
                                to='/discover'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    🔍 Discover
                                </Button>
                            </Link>

                            <div className='border-t border-border my-2'></div>
                            <p className='px-3 text-xs text-muted-foreground uppercase tracking-wide'>
                                Explore
                            </p>

                            <Link
                                to='/leaderboards'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    🏆 {t('nav.leaderboards')}
                                </Button>
                            </Link>
                            <Link
                                to='/playlists/discover'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    🎵 Playlists
                                </Button>
                            </Link>
                            <Link
                                to='/watch-parties/browse'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start'
                                >
                                    👥 Watch Parties
                                </Button>
                            </Link>
                            {isAuthenticated && (
                                <Link
                                    to='/discover/live'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        🔴 Live
                                    </Button>
                                </Link>
                            )}
                        </nav>

                        {isAuthenticated ?
                            <div className='flex flex-col gap-1'>
                                <div className='border-t border-border my-2'></div>
                                <p className='px-3 text-xs text-muted-foreground uppercase tracking-wide'>
                                    Your Stuff
                                </p>

                                <Link
                                    to='/submit'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='primary'
                                        size='sm'
                                        className='w-full'
                                    >
                                        ✨ {t('nav.submit')}
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
                                        ⭐ {t('nav.favorites')}
                                    </Button>
                                </Link>
                                <Link
                                    to='/playlists'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        📋 My Playlists
                                    </Button>
                                </Link>
                                <Link
                                    to='/watch-history'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        🕒 Watch History
                                    </Button>
                                </Link>

                                <div className='border-t border-border my-2'></div>
                                <p className='px-3 text-xs text-muted-foreground uppercase tracking-wide'>
                                    Account
                                </p>

                                <Link
                                    to='/profile'
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='w-full justify-start'
                                    >
                                        👤 {t('nav.profile')}
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
                                        ⚙️ {t('nav.settings')}
                                    </Button>
                                </Link>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='w-full justify-start text-error-600'
                                    onClick={handleLogout}
                                >
                                    🚪 {t('nav.logout')}
                                </Button>
                            </div>
                        :   <Link
                                to='/login'
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <Button
                                    variant='primary'
                                    size='sm'
                                    className='w-full'
                                    data-testid='login-button'
                                    aria-label='Login'
                                >
                                    {t('nav.login')}
                                </Button>
                            </Link>
                        }
                    </div>
                )}
            </div>
        </header>
    );
}
