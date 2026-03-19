import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SkipLink } from '../ui';
import { Footer } from './Footer';
import { Header } from './Header';
import { CategoriesNav } from './CategoriesNav';
import { OfflineIndicator } from '../OfflineIndicator';
import { QueueWidget } from '../queue/QueueWidget';
import { useOfflineCacheInit } from '@/hooks/useOfflineCache';
import { useSyncManager } from '@/hooks/useSyncManager';

export function AppLayout() {
    const location = useLocation();

    // Initialize offline cache on app start
    useOfflineCacheInit();

    // Initialize sync manager
    useSyncManager();

    // Scroll to top and reset overflow on route change
    useEffect(() => {
        document.body.style.overflow = '';
        try {
            if (typeof window.scrollTo === 'function') {
                window.scrollTo(0, 0);
            }
        } catch {
            // no-op in environments where scrollTo is not implemented
        }
    }, [location.pathname]);

    return (
        <div className='min-h-screen flex flex-col bg-background text-foreground transition-theme'>
            <SkipLink targetId='main-content' label='Skip to main content' />
            <Header />
            <CategoriesNav />
            <main id='main-content' className='flex-1' tabIndex={-1}>
                <Outlet />
            </main>
            <Footer />
            <OfflineIndicator />
            <QueueWidget />
        </div>
    );
}
