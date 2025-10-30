/**
 * Service Worker Registration
 * Registers the service worker for PWA functionality
 * Only registers in production builds to avoid caching issues during development
 */

// Module-level flag to prevent multiple reloads on controller change
let refreshing = false;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    // Only register service worker in production
    if (import.meta.env.DEV) {
        console.log(
            '[SW] Skipping service worker registration in development mode'
        );
        return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
        console.log('[SW] Service workers are not supported in this browser');
        return null;
    }

    try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log(
            '[SW] Service worker registered successfully',
            registration
        );

        // Check for updates on page load
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (
                    newWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                ) {
                    // New service worker available, prompt user to reload
                    console.log(
                        '[SW] New version available! Please reload the page.'
                    );

                    // Optionally show a notification to the user
                    if (
                        window.confirm(
                            'A new version of Clipper is available. Reload to update?'
                        )
                    ) {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                    }
                }
            });
        });

        // Listen for controller change (new service worker activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            console.log('[SW] Controller changed, reloading page');
            window.location.reload();
        });

        return registration;
    } catch (error) {
        console.error('[SW] Service worker registration failed:', error);
        return null;
    }
}

/**
 * Unregister all service workers
 * Useful for debugging or if you need to clear the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
        return false;
    }

    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
            console.log('[SW] Service worker unregistered');
        }
        return true;
    } catch (error) {
        console.error('[SW] Failed to unregister service worker:', error);
        return false;
    }
}

/**
 * Check if the app is currently installed as a PWA
 */
export function isPWAInstalled(): boolean {
    // Check if running in standalone mode (installed PWA)
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true // iOS Safari
    );
}

/**
 * Check if the app can be installed as a PWA
 */
export function canInstallPWA(): boolean {
    return 'BeforeInstallPromptEvent' in window;
}
