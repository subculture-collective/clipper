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

  // Defensive cleanup: ensure body overflow is reset on route changes
  // This prevents black screen issues when navigating away from pages with modals
  useEffect(() => {
    // Reset body overflow when route changes
    document.body.style.overflow = 'unset';
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-theme">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
