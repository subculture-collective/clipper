import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { getNotificationPreferences, updateNotificationPreferences } from '../lib/notification-api';
import { Button } from '../components/ui';
import { Container } from '../components/layout';
export function NotificationPreferencesPage() {
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({});
    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notifications', 'preferences'],
        queryFn: getNotificationPreferences,
    });
    // Update form data when preferences load
    useEffect(() => {
        if (preferences) {
            setFormData(preferences);
        }
    }, [preferences]);
    const updateMutation = useMutation({
        mutationFn: updateNotificationPreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            setIsSaving(false);
        },
        onError: () => {
            setIsSaving(false);
        },
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSaving(true);
        updateMutation.mutate(formData);
    };
    const handleToggle = (field) => {
        setFormData((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };
    const handleEmailDigestChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            email_digest: value,
        }));
    };
    if (isLoading) {
        return (_jsx(Container, { children: _jsx("div", { className: "max-w-2xl mx-auto py-8", children: _jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600" }), _jsx("p", { className: "mt-4 text-gray-600 dark:text-gray-400", children: "Loading preferences..." })] }) }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Notification Preferences - Clipper" }) }), _jsx(Container, { children: _jsxs("div", { className: "max-w-2xl mx-auto py-8", children: [_jsxs("div", { className: "mb-6", children: [_jsx(Link, { to: "/notifications", className: "text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-2 inline-block", children: "\u2190 Back to Notifications" }), _jsx("h1", { className: "text-3xl font-bold text-gray-900 dark:text-white mb-2", children: "Notification Preferences" }), _jsx("p", { className: "text-gray-600 dark:text-gray-400", children: "Customize how and when you receive notifications" })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "General Settings" }), _jsxs("div", { className: "space-y-4", children: [_jsx(ToggleSwitch, { label: "In-App Notifications", description: "Show notifications in the app", checked: formData.in_app_enabled ?? true, onChange: () => handleToggle('in_app_enabled') }), _jsx(ToggleSwitch, { label: "Email Notifications", description: "Receive notifications via email", checked: formData.email_enabled ?? false, onChange: () => handleToggle('email_enabled') }), formData.email_enabled && (_jsxs("div", { className: "ml-6 pt-2 space-y-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Email Frequency" }), _jsxs("select", { value: formData.email_digest ?? 'daily', onChange: (e) => handleEmailDigestChange(e.target.value), className: "block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500", children: [_jsx("option", { value: "immediate", children: "Immediate" }), _jsx("option", { value: "daily", children: "Daily Digest" }), _jsx("option", { value: "weekly", children: "Weekly Digest" })] })] }))] })] }), _jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4", children: "Notification Types" }), _jsxs("div", { className: "space-y-4", children: [_jsx(ToggleSwitch, { label: "Replies", description: "When someone replies to your comment", checked: formData.notify_replies ?? true, onChange: () => handleToggle('notify_replies') }), _jsx(ToggleSwitch, { label: "Mentions", description: "When someone mentions you in a comment", checked: formData.notify_mentions ?? true, onChange: () => handleToggle('notify_mentions') }), _jsx(ToggleSwitch, { label: "Vote Milestones", description: "When your comment reaches vote milestones (10, 25, 50, etc.)", checked: formData.notify_votes ?? false, onChange: () => handleToggle('notify_votes') }), _jsx(ToggleSwitch, { label: "Badges & Achievements", description: "When you earn a badge or rank up", checked: formData.notify_badges ?? true, onChange: () => handleToggle('notify_badges') }), _jsx(ToggleSwitch, { label: "Rank Up", description: "When you advance to a new rank", checked: formData.notify_rank_up ?? true, onChange: () => handleToggle('notify_rank_up') }), _jsx(ToggleSwitch, { label: "Favorited Clip Comments", description: "When someone comments on a clip you favorited", checked: formData.notify_favorited_clip_comment ?? true, onChange: () => handleToggle('notify_favorited_clip_comment') }), _jsx(ToggleSwitch, { label: "Moderation Actions", description: "When your content is removed, warnings, or account actions", checked: formData.notify_moderation ?? true, onChange: () => handleToggle('notify_moderation'), disabled: true })] })] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx(Link, { to: "/notifications", children: _jsx(Button, { variant: "ghost", children: "Cancel" }) }), _jsx(Button, { type: "submit", variant: "primary", disabled: isSaving, children: isSaving ? 'Saving...' : 'Save Preferences' })] }), updateMutation.isSuccess && (_jsx("div", { className: "rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-green-800 dark:text-green-200", children: "Preferences saved successfully!" })), updateMutation.isError && (_jsx("div", { className: "rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-800 dark:text-red-200", children: "Failed to save preferences. Please try again." }))] })] }) })] }));
}
function ToggleSwitch({ label, description, checked, onChange, disabled = false }) {
    return (_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "text-sm font-medium text-gray-900 dark:text-white", children: label }), description && (_jsx("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5", children: description }))] }), _jsx("button", { type: "button", onClick: onChange, disabled: disabled, className: `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${checked ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`, children: _jsx("span", { className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}` }) })] }));
}
