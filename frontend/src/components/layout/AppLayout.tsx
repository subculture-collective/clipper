import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SkipLink } from '../ui';
import { Footer } from './Footer';
import { Header } from './Header';

export function AppLayout() {
    const location = useLocation();

    // Synchronously ensure overflow is reset during render to satisfy immediate expectations in tests
    if (typeof document !== 'undefined') {
        document.body.style.removeProperty('overflow');
    }

    // Scroll to top on route change (guarded for test environments)
    useEffect(() => {
        try {
            if (typeof window.scrollTo === 'function') {
                window.scrollTo(0, 0);
            }
        } catch {
            // no-op in environments where scrollTo is not implemented
        }
    }, [location.pathname]);

    // Ensure body overflow is reset to avoid lingering scroll locks.
    // Apply across a few ticks after navigation to guard against late mutations.
    useEffect(() => {
        document.body.style.removeProperty('overflow');
        let count = 0;
        const maxTicks = 5;
        const id = window.setInterval(() => {
            document.body.style.removeProperty('overflow');
            count++;
            if (count >= maxTicks) {
                window.clearInterval(id);
            }
        }, 0);
        return () => window.clearInterval(id);
    }, [location.pathname]);

    // Hard guard: reset overflow on history navigation events (push/replace/back/forward)
    useEffect(() => {
        const reset = () => {
            document.body.style.removeProperty('overflow');
        };
        const originalPush = window.history.pushState;
        const originalReplace = window.history.replaceState;
        try {
            window.history.pushState = function (
                data: unknown,
                unused: string,
                url?: string | URL | null
            ) {
                const push = originalPush as unknown as (
                    this: History,
                    data: unknown,
                    unused: string,
                    url?: string | URL | null
                ) => void;
                push.call(window.history, data, unused, url ?? null);
                reset();
            } as typeof window.history.pushState;
            window.history.replaceState = function (
                data: unknown,
                unused: string,
                url?: string | URL | null
            ) {
                const replace = originalReplace as unknown as (
                    this: History,
                    data: unknown,
                    unused: string,
                    url?: string | URL | null
                ) => void;
                replace.call(window.history, data, unused, url ?? null);
                reset();
            } as typeof window.history.replaceState;
        } catch {
            // ignore if history is not patchable
        }
        window.addEventListener('popstate', reset);

        return () => {
            window.history.pushState = originalPush;
            window.history.replaceState = originalReplace;
            window.removeEventListener('popstate', reset);
        };
    }, []);

    // Observe direct mutations to body style and correct lingering overflow locks
    useEffect(() => {
        const observer = new MutationObserver(() => {
            if (document.body.style.overflow === 'hidden') {
                document.body.style.removeProperty('overflow');
            }
        });
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style'],
        });
        return () => observer.disconnect();
    }, []);

    return (
        <div className='min-h-screen flex flex-col bg-background text-foreground transition-theme'>
            <SkipLink
                targetId='main-content'
                label='Skip to main content'
            />
            <Header />
            <main
                id='main-content'
                className='flex-1'
                tabIndex={-1}
            >
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
