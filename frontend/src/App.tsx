import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout';
import { ProtectedRoute, AdminRoute, GuestRoute } from './components/guards';
import { Spinner } from './components';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const NewFeedPage = lazy(() => import('./pages/NewFeedPage').then(m => ({ default: m.NewFeedPage })));
const TopFeedPage = lazy(() => import('./pages/TopFeedPage').then(m => ({ default: m.TopFeedPage })));
const RisingFeedPage = lazy(() => import('./pages/RisingFeedPage').then(m => ({ default: m.RisingFeedPage })));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage').then(m => ({ default: m.DiscoveryPage })));
const ClipDetailPage = lazy(() => import('./pages/ClipDetailPage').then(m => ({ default: m.ClipDetailPage })));
const GamePage = lazy(() => import('./pages/GamePage').then(m => ({ default: m.GamePage })));
const CreatorPage = lazy(() => import('./pages/CreatorPage').then(m => ({ default: m.CreatorPage })));
const TagPage = lazy(() => import('./pages/TagPage').then(m => ({ default: m.TagPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SubmitClipPage = lazy(() => import('./pages/SubmitClipPage').then(m => ({ default: m.SubmitClipPage })));
const UserSubmissionsPage = lazy(() => import('./pages/UserSubmissionsPage').then(m => ({ default: m.UserSubmissionsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminClipsPage = lazy(() => import('./pages/admin/AdminClipsPage').then(m => ({ default: m.AdminClipsPage })));
const AdminCommentsPage = lazy(() => import('./pages/admin/AdminCommentsPage').then(m => ({ default: m.AdminCommentsPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })));
const AdminSyncPage = lazy(() => import('./pages/admin/AdminSyncPage').then(m => ({ default: m.AdminSyncPage })));
const ModerationQueuePage = lazy(() => import('./pages/admin/ModerationQueuePage').then(m => ({ default: m.ModerationQueuePage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const NotificationPreferencesPage = lazy(() => import('./pages/NotificationPreferencesPage').then(m => ({ default: m.NotificationPreferencesPage })));
const CreatorAnalyticsPage = lazy(() => import('./pages/CreatorAnalyticsPage'));
const PersonalStatsPage = lazy(() => import('./pages/PersonalStatsPage'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const SubscriptionSuccessPage = lazy(() => import('./pages/SubscriptionSuccessPage'));
const SubscriptionCancelPage = lazy(() => import('./pages/SubscriptionCancelPage'));

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="xl" />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                <Route element={<AppLayout />}>
                  {/* Public Routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/discover" element={<DiscoveryPage />} />
                  <Route path="/new" element={<NewFeedPage />} />
                  <Route path="/top" element={<TopFeedPage />} />
                  <Route path="/rising" element={<RisingFeedPage />} />
                  <Route path="/clip/:id" element={<ClipDetailPage />} />
                  <Route path="/game/:gameId" element={<GamePage />} />
                  <Route path="/creator/:creatorId" element={<CreatorPage />} />
                  <Route path="/creator/:creatorName/analytics" element={<CreatorAnalyticsPage />} />
                  <Route path="/tag/:tagSlug" element={<TagPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/leaderboards" element={<LeaderboardPage />} />
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
                  <Route path="/subscription/cancel" element={<SubscriptionCancelPage />} />

                  {/* Guest Routes (redirect to home if authenticated) */}
                  <Route
                    path="/login"
                    element={
                      <GuestRoute>
                        <LoginPage />
                      </GuestRoute>
                    }
                  />
                  
                  {/* Auth callback route */}
                  <Route path="/auth/success" element={<AuthCallbackPage />} />

                  {/* Protected Routes (require authentication) */}
                  <Route
                    path="/favorites"
                    element={
                      <ProtectedRoute>
                        <FavoritesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submit"
                    element={
                      <ProtectedRoute>
                        <SubmitClipPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/submissions"
                    element={
                      <ProtectedRoute>
                        <UserSubmissionsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications/preferences"
                    element={
                      <ProtectedRoute>
                        <NotificationPreferencesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/stats"
                    element={
                      <ProtectedRoute>
                        <PersonalStatsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes (require admin role) */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/clips"
                    element={
                      <AdminRoute>
                        <AdminClipsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/comments"
                    element={
                      <AdminRoute>
                        <AdminCommentsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <AdminUsersPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <AdminRoute>
                        <AdminReportsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/sync"
                    element={
                      <AdminRoute>
                        <AdminSyncPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <AdminRoute>
                        <AdminAnalyticsPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/submissions"
                    element={
                      <AdminRoute>
                        <ModerationQueuePage />
                      </AdminRoute>
                    }
                  />

                  {/* 404 Not Found */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

export default App;
