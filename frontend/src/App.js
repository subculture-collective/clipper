import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsx(Spinner, { size: "xl" }) }));
}
function App() {
    return (_jsx(HelmetProvider, { children: _jsx(ThemeProvider, { children: _jsx(AuthProvider, { children: _jsx(ToastProvider, { children: _jsx(BrowserRouter, { children: _jsx(Suspense, { fallback: _jsx(LoadingFallback, {}), children: _jsx(Routes, { children: _jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/discover", element: _jsx(DiscoveryPage, {}) }), _jsx(Route, { path: "/new", element: _jsx(NewFeedPage, {}) }), _jsx(Route, { path: "/top", element: _jsx(TopFeedPage, {}) }), _jsx(Route, { path: "/rising", element: _jsx(RisingFeedPage, {}) }), _jsx(Route, { path: "/clip/:id", element: _jsx(ClipDetailPage, {}) }), _jsx(Route, { path: "/game/:gameId", element: _jsx(GamePage, {}) }), _jsx(Route, { path: "/creator/:creatorId", element: _jsx(CreatorPage, {}) }), _jsx(Route, { path: "/creator/:creatorName/analytics", element: _jsx(CreatorAnalyticsPage, {}) }), _jsx(Route, { path: "/tag/:tagSlug", element: _jsx(TagPage, {}) }), _jsx(Route, { path: "/search", element: _jsx(SearchPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) }), _jsx(Route, { path: "/privacy", element: _jsx(PrivacyPage, {}) }), _jsx(Route, { path: "/terms", element: _jsx(TermsPage, {}) }), _jsx(Route, { path: "/leaderboards", element: _jsx(LeaderboardPage, {}) }), _jsx(Route, { path: "/pricing", element: _jsx(PricingPage, {}) }), _jsx(Route, { path: "/subscription/success", element: _jsx(SubscriptionSuccessPage, {}) }), _jsx(Route, { path: "/subscription/cancel", element: _jsx(SubscriptionCancelPage, {}) }), _jsx(Route, { path: "/login", element: _jsx(GuestRoute, { children: _jsx(LoginPage, {}) }) }), _jsx(Route, { path: "/auth/success", element: _jsx(AuthCallbackPage, {}) }), _jsx(Route, { path: "/favorites", element: _jsx(ProtectedRoute, { children: _jsx(FavoritesPage, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(ProtectedRoute, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(ProtectedRoute, { children: _jsx(SettingsPage, {}) }) }), _jsx(Route, { path: "/submit", element: _jsx(ProtectedRoute, { children: _jsx(SubmitClipPage, {}) }) }), _jsx(Route, { path: "/submissions", element: _jsx(ProtectedRoute, { children: _jsx(UserSubmissionsPage, {}) }) }), _jsx(Route, { path: "/notifications", element: _jsx(ProtectedRoute, { children: _jsx(NotificationsPage, {}) }) }), _jsx(Route, { path: "/notifications/preferences", element: _jsx(ProtectedRoute, { children: _jsx(NotificationPreferencesPage, {}) }) }), _jsx(Route, { path: "/profile/stats", element: _jsx(ProtectedRoute, { children: _jsx(PersonalStatsPage, {}) }) }), _jsx(Route, { path: "/admin/dashboard", element: _jsx(AdminRoute, { children: _jsx(AdminDashboard, {}) }) }), _jsx(Route, { path: "/admin/clips", element: _jsx(AdminRoute, { children: _jsx(AdminClipsPage, {}) }) }), _jsx(Route, { path: "/admin/comments", element: _jsx(AdminRoute, { children: _jsx(AdminCommentsPage, {}) }) }), _jsx(Route, { path: "/admin/users", element: _jsx(AdminRoute, { children: _jsx(AdminUsersPage, {}) }) }), _jsx(Route, { path: "/admin/reports", element: _jsx(AdminRoute, { children: _jsx(AdminReportsPage, {}) }) }), _jsx(Route, { path: "/admin/sync", element: _jsx(AdminRoute, { children: _jsx(AdminSyncPage, {}) }) }), _jsx(Route, { path: "/admin/analytics", element: _jsx(AdminRoute, { children: _jsx(AdminAnalyticsPage, {}) }) }), _jsx(Route, { path: "/admin/submissions", element: _jsx(AdminRoute, { children: _jsx(ModerationQueuePage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(NotFoundPage, {}) })] }) }) }) }) }) }) }) }));
}
export default App;
