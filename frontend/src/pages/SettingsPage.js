import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Container, Card, CardHeader, CardBody, Stack, Input, Button, TextArea, Modal, Alert, Toggle } from '../components';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, updateUserSettings, updateProfile, exportUserData, requestAccountDeletion, cancelAccountDeletion, getAccountDeletionStatus } from '../lib/user-settings-api';
export function SettingsPage() {
    const { user, refreshUser } = useAuth();
    const queryClient = useQueryClient();
    // Profile state
    const [profileData, setProfileData] = useState({
        display_name: '',
        bio: null,
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState(null);
    // Settings state
    const [settingsData, setSettingsData] = useState({});
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [settingsSuccess, setSettingsSuccess] = useState(false);
    const [settingsError, setSettingsError] = useState(null);
    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState(null);
    // Delete account state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [cancelDeletionError, setCancelDeletionError] = useState(null);
    // Load user settings
    const { data: settings, isLoading: settingsLoading } = useQuery({
        queryKey: ['userSettings'],
        queryFn: getUserSettings,
    });
    // Load deletion status
    const { data: deletionStatus, refetch: refetchDeletionStatus } = useQuery({
        queryKey: ['accountDeletionStatus'],
        queryFn: getAccountDeletionStatus,
    });
    // Initialize form data when user or settings load
    useEffect(() => {
        if (user) {
            setProfileData({
                display_name: user.display_name,
                bio: user.bio || null,
            });
        }
    }, [user]);
    useEffect(() => {
        if (settings) {
            setSettingsData({
                profile_visibility: settings.profile_visibility,
                show_karma_publicly: settings.show_karma_publicly,
            });
        }
    }, [settings]);
    // Profile update
    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        setProfileError(null);
        setProfileSuccess(false);
        try {
            await updateProfile(profileData);
            await refreshUser();
            setProfileSuccess(true);
            setTimeout(() => setProfileSuccess(false), 3000);
        }
        catch (error) {
            setProfileError('Failed to update profile. Please try again.');
        }
        finally {
            setIsSavingProfile(false);
        }
    };
    // Settings update
    const handleSettingsSubmit = async (e) => {
        e.preventDefault();
        setIsSavingSettings(true);
        setSettingsError(null);
        setSettingsSuccess(false);
        try {
            await updateUserSettings(settingsData);
            queryClient.invalidateQueries({ queryKey: ['userSettings'] });
            setSettingsSuccess(true);
            setTimeout(() => setSettingsSuccess(false), 3000);
        }
        catch (error) {
            setSettingsError('Failed to update settings. Please try again.');
        }
        finally {
            setIsSavingSettings(false);
        }
    };
    // Export data
    const handleExportData = async () => {
        setIsExporting(true);
        setExportError(null);
        try {
            const blob = await exportUserData();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'clipper_user_data_export.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        catch (error) {
            setExportError('Failed to export data. Please try again.');
        }
        finally {
            setIsExporting(false);
        }
    };
    // Delete account
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
            setDeleteError('Please type "DELETE MY ACCOUNT" to confirm.');
            return;
        }
        setIsDeletingAccount(true);
        setDeleteError(null);
        try {
            const req = {
                confirmation: deleteConfirmation,
                reason: deleteReason || undefined,
            };
            await requestAccountDeletion(req);
            setShowDeleteModal(false);
            refetchDeletionStatus();
            queryClient.invalidateQueries({ queryKey: ['accountDeletionStatus'] });
        }
        catch (error) {
            setDeleteError(error.response?.data?.error || 'Failed to schedule account deletion.');
        }
        finally {
            setIsDeletingAccount(false);
        }
    };
    // Cancel deletion
    const handleCancelDeletion = async () => {
        setCancelDeletionError(null);
        try {
            await cancelAccountDeletion();
            refetchDeletionStatus();
            queryClient.invalidateQueries({ queryKey: ['accountDeletionStatus'] });
        }
        catch (error) {
            setCancelDeletionError('Failed to cancel account deletion. Please try again.');
        }
    };
    if (!user) {
        return null;
    }
    const showTwitchName = user.username.toLowerCase() !== user.display_name.toLowerCase();
    return (_jsxs(_Fragment, { children: [_jsx(Helmet, { children: _jsx("title", { children: "Settings - Clipper" }) }), _jsx(Container, { className: "py-8", children: _jsxs("div", { className: "max-w-3xl mx-auto", children: [_jsx("h1", { className: "text-3xl font-bold mb-6", children: "Settings" }), deletionStatus?.pending && (_jsxs(_Fragment, { children: [_jsx(Alert, { variant: "warning", className: "mb-6", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold mb-1", children: "Account Deletion Scheduled" }), _jsxs("p", { className: "text-sm", children: ["Your account is scheduled for deletion on", ' ', new Date(deletionStatus.scheduled_for).toLocaleDateString(), ". You can cancel this at any time before that date."] })] }), _jsx(Button, { variant: "outline", size: "sm", onClick: handleCancelDeletion, children: "Cancel Deletion" })] }) }), cancelDeletionError && (_jsx(Alert, { variant: "error", className: "mb-6", children: cancelDeletionError }))] })), _jsxs(Card, { className: "mb-6", children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-xl font-semibold", children: "Profile" }) }), _jsx(CardBody, { children: _jsx("form", { onSubmit: handleProfileSubmit, children: _jsxs(Stack, { direction: "vertical", gap: 4, children: [showTwitchName && (_jsx(Input, { label: "Twitch Username", value: user.username, disabled: true, helperText: "This is your Twitch username and cannot be changed" })), _jsx(Input, { label: "Display Name", value: profileData.display_name, onChange: (e) => setProfileData({ ...profileData, display_name: e.target.value }), required: true, maxLength: 100, helperText: "This is how your name appears on the site" }), _jsx(TextArea, { label: "Bio", value: profileData.bio || '', onChange: (e) => setProfileData({ ...profileData, bio: e.target.value || null }), rows: 4, maxLength: 500, placeholder: "Tell us about yourself...", helperText: `${(profileData.bio || '').length}/500 characters` }), user.email && (_jsx(Input, { label: "Email", value: user.email, disabled: true, helperText: "Email is managed through your Twitch account" })), _jsx("div", { className: "flex gap-3", children: _jsx(Button, { type: "submit", variant: "primary", disabled: isSavingProfile, children: isSavingProfile ? 'Saving...' : 'Save Profile' }) }), profileSuccess && (_jsx(Alert, { variant: "success", children: "Profile updated successfully!" })), profileError && _jsx(Alert, { variant: "error", children: profileError })] }) }) })] }), _jsxs(Card, { className: "mb-6", children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-xl font-semibold", children: "Privacy Settings" }) }), _jsx(CardBody, { children: settingsLoading ? (_jsx("div", { className: "text-center py-4", children: "Loading settings..." })) : (_jsx("form", { onSubmit: handleSettingsSubmit, children: _jsxs(Stack, { direction: "vertical", gap: 4, children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Profile Visibility" }), _jsxs("select", { value: settingsData.profile_visibility || 'public', onChange: (e) => setSettingsData({
                                                                ...settingsData,
                                                                profile_visibility: e.target.value,
                                                            }), className: "w-full px-3 py-2 border border-border rounded-md bg-background text-foreground", children: [_jsx("option", { value: "public", children: "Public - Anyone can view your profile" }), _jsx("option", { value: "private", children: "Private - Only you can view your profile" }), _jsx("option", { value: "followers", children: "Followers - Only followers can view" })] })] }), _jsx(Toggle, { label: "Show Karma Publicly", helperText: "Display your karma points on your public profile", checked: settingsData.show_karma_publicly ?? true, onChange: (e) => setSettingsData({ ...settingsData, show_karma_publicly: e.target.checked }) }), _jsx("div", { className: "flex gap-3", children: _jsx(Button, { type: "submit", variant: "primary", disabled: isSavingSettings, children: isSavingSettings ? 'Saving...' : 'Save Settings' }) }), settingsSuccess && (_jsx(Alert, { variant: "success", children: "Settings updated successfully!" })), settingsError && _jsx(Alert, { variant: "error", children: settingsError })] }) })) })] }), _jsxs(Card, { className: "mb-6", children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-xl font-semibold", children: "Notifications" }) }), _jsxs(CardBody, { children: [_jsx("p", { className: "text-muted-foreground mb-4", children: "Manage your notification preferences including email and reply notifications." }), _jsx(Link, { to: "/notifications/preferences", children: _jsx(Button, { variant: "outline", children: "Manage Notification Preferences" }) })] })] }), _jsxs(Card, { className: "mb-6 border-warning-500", children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-xl font-semibold text-warning-600", children: "Data Management" }) }), _jsx(CardBody, { children: _jsx(Stack, { direction: "vertical", gap: 4, children: _jsxs("div", { children: [_jsx("h3", { className: "font-medium mb-2", children: "Export Your Data" }), _jsx("p", { className: "text-sm text-muted-foreground mb-3", children: "Download a copy of your data in JSON format (GDPR compliance)" }), _jsx(Button, { variant: "outline", onClick: handleExportData, disabled: isExporting, children: isExporting ? 'Exporting...' : 'Export Data' }), exportError && (_jsx(Alert, { variant: "error", className: "mt-3", children: exportError }))] }) }) })] }), !deletionStatus?.pending && (_jsxs(Card, { className: "border-error-500", children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-xl font-semibold text-error-600", children: "Danger Zone" }) }), _jsx(CardBody, { children: _jsxs("div", { children: [_jsx("h3", { className: "font-medium mb-2", children: "Delete Account" }), _jsx("p", { className: "text-sm text-muted-foreground mb-3", children: "Permanently delete your account and all associated data. This action cannot be undone after the 30-day grace period." }), _jsx(Button, { variant: "outline", className: "text-error-600 border-error-600 hover:bg-error-50", onClick: () => setShowDeleteModal(true), children: "Delete Account" })] }) })] }))] }) }), _jsx(Modal, { open: showDeleteModal, onClose: () => setShowDeleteModal(false), title: "Delete Account", children: _jsxs("div", { className: "space-y-4", children: [_jsxs(Alert, { variant: "error", children: [_jsx("strong", { children: "Warning:" }), " This action will schedule your account for permanent deletion in 30 days. During this period, you can cancel the deletion at any time."] }), _jsx("p", { className: "text-sm text-muted-foreground", children: "All your data including comments, favorites, and profile information will be permanently deleted after the grace period." }), _jsx(TextArea, { label: "Reason (optional)", value: deleteReason, onChange: (e) => setDeleteReason(e.target.value), rows: 3, placeholder: "Help us improve by telling us why you're leaving...", maxLength: 1000 }), _jsx(Input, { label: 'Type "DELETE MY ACCOUNT" to confirm', value: deleteConfirmation, onChange: (e) => setDeleteConfirmation(e.target.value), placeholder: "DELETE MY ACCOUNT", required: true }), deleteError && _jsx(Alert, { variant: "error", children: deleteError }), _jsxs("div", { className: "flex gap-3 justify-end", children: [_jsx(Button, { variant: "ghost", onClick: () => setShowDeleteModal(false), children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleDeleteAccount, disabled: isDeletingAccount || deleteConfirmation !== 'DELETE MY ACCOUNT', className: "bg-error-600 hover:bg-error-700", children: isDeletingAccount ? 'Processing...' : 'Delete My Account' })] })] }) })] }));
}
