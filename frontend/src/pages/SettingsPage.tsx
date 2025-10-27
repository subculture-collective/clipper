import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Container, Card, CardHeader, CardBody, Stack, Input, Button, TextArea, Modal, Alert, Toggle } from '../components';
import { useAuth } from '../context/AuthContext';
import { 
  getUserSettings, 
  updateUserSettings, 
  updateProfile,
  exportUserData,
  requestAccountDeletion,
  cancelAccountDeletion,
  getAccountDeletionStatus
} from '../lib/user-settings-api';
import type { UpdateProfileRequest, UpdateSettingsRequest, DeleteAccountRequest } from '../lib/user-settings-api';

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  
  // Profile state
  const [profileData, setProfileData] = useState<UpdateProfileRequest>({
    display_name: '',
    bio: null,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Settings state
  const [settingsData, setSettingsData] = useState<UpdateSettingsRequest>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelDeletionError, setCancelDeletionError] = useState<string | null>(null);

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
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await updateProfile(profileData);
      await refreshUser();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (error) {
      setProfileError('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Settings update
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      await updateUserSettings(settingsData);
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (error) {
      setSettingsError('Failed to update settings. Please try again.');
    } finally {
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
    } catch (error) {
      setExportError('Failed to export data. Please try again.');
    } finally {
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
      const req: DeleteAccountRequest = {
        confirmation: deleteConfirmation,
        reason: deleteReason || undefined,
      };
      await requestAccountDeletion(req);
      setShowDeleteModal(false);
      refetchDeletionStatus();
      queryClient.invalidateQueries({ queryKey: ['accountDeletionStatus'] });
    } catch (error: any) {
      setDeleteError(error.response?.data?.error || 'Failed to schedule account deletion.');
    } finally {
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
    } catch (error) {
      setCancelDeletionError('Failed to cancel account deletion. Please try again.');
    }
  };

  if (!user) {
    return null;
  }

  const showTwitchName = user.username.toLowerCase() !== user.display_name.toLowerCase();

  return (
    <>
      <Helmet>
        <title>Settings - Clipper</title>
      </Helmet>

      <Container className="py-4 xs:py-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl xs:text-3xl font-bold mb-4 xs:mb-6">Settings</h1>

          {/* Account deletion warning */}
          {deletionStatus?.pending && (
            <>
              <Alert variant="warning" className="mb-4 xs:mb-6">
                <div className="flex flex-col xs:flex-row items-start xs:items-center gap-3 xs:justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 text-sm xs:text-base">Account Deletion Scheduled</h3>
                    <p className="text-xs xs:text-sm">
                      Your account is scheduled for deletion on{' '}
                      {new Date(deletionStatus.scheduled_for!).toLocaleDateString()}. You can cancel this
                      at any time before that date.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDeletion}
                    className="w-full xs:w-auto shrink-0"
                  >
                    Cancel Deletion
                  </Button>
                </div>
              </Alert>
              {cancelDeletionError && (
                <Alert variant="error" className="mb-4 xs:mb-6">{cancelDeletionError}</Alert>
              )}
            </>
          )}

          {/* Profile Settings */}
          <Card className="mb-4 xs:mb-6">
            <CardHeader>
              <h2 className="text-lg xs:text-xl font-semibold">Profile</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleProfileSubmit}>
                <Stack direction="vertical" gap={4}>
                  {showTwitchName && (
                    <Input
                      label="Twitch Username"
                      value={user.username}
                      disabled
                      helperText="This is your Twitch username and cannot be changed"
                    />
                  )}
                  <Input
                    label="Display Name"
                    value={profileData.display_name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, display_name: e.target.value })
                    }
                    required
                    maxLength={100}
                    helperText="This is how your name appears on the site"
                  />
                  <TextArea
                    label="Bio"
                    value={profileData.bio || ''}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value || null })
                    }
                    rows={4}
                    maxLength={500}
                    placeholder="Tell us about yourself..."
                    helperText={`${(profileData.bio || '').length}/500 characters`}
                  />
                  {user.email && (
                    <Input
                      label="Email"
                      value={user.email}
                      disabled
                      helperText="Email is managed through your Twitch account"
                    />
                  )}
                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" disabled={isSavingProfile}>
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                  {profileSuccess && (
                    <Alert variant="success">Profile updated successfully!</Alert>
                  )}
                  {profileError && <Alert variant="error">{profileError}</Alert>}
                </Stack>
              </form>
            </CardBody>
          </Card>

          {/* Privacy Settings */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Privacy Settings</h2>
            </CardHeader>
            <CardBody>
              {settingsLoading ? (
                <div className="text-center py-4">Loading settings...</div>
              ) : (
                <form onSubmit={handleSettingsSubmit}>
                  <Stack direction="vertical" gap={4}>
                    <div>
                      <label className="block text-sm font-medium mb-2">Profile Visibility</label>
                      <select
                        value={settingsData.profile_visibility || 'public'}
                        onChange={(e) =>
                          setSettingsData({
                            ...settingsData,
                            profile_visibility: e.target.value as 'public' | 'private' | 'followers',
                          })
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      >
                        <option value="public">Public - Anyone can view your profile</option>
                        <option value="private">Private - Only you can view your profile</option>
                        <option value="followers">Followers - Only followers can view</option>
                      </select>
                    </div>
                    <Toggle
                      label="Show Karma Publicly"
                      helperText="Display your karma points on your public profile"
                      checked={settingsData.show_karma_publicly ?? true}
                      onChange={(e) =>
                        setSettingsData({ ...settingsData, show_karma_publicly: e.target.checked })
                      }
                    />
                    <div className="flex gap-3">
                      <Button type="submit" variant="primary" disabled={isSavingSettings}>
                        {isSavingSettings ? 'Saving...' : 'Save Settings'}
                      </Button>
                    </div>
                    {settingsSuccess && (
                      <Alert variant="success">Settings updated successfully!</Alert>
                    )}
                    {settingsError && <Alert variant="error">{settingsError}</Alert>}
                  </Stack>
                </form>
              )}
            </CardBody>
          </Card>

          {/* Notification Settings */}
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">Notifications</h2>
            </CardHeader>
            <CardBody>
              <p className="text-muted-foreground mb-4">
                Manage your notification preferences including email and reply notifications.
              </p>
              <Link to="/notifications/preferences">
                <Button variant="outline">Manage Notification Preferences</Button>
              </Link>
            </CardBody>
          </Card>

          {/* Data Management */}
          <Card className="mb-6 border-warning-500">
            <CardHeader>
              <h2 className="text-xl font-semibold text-warning-600">Data Management</h2>
            </CardHeader>
            <CardBody>
              <Stack direction="vertical" gap={4}>
                <div>
                  <h3 className="font-medium mb-2">Export Your Data</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Download a copy of your data in JSON format (GDPR compliance)
                  </p>
                  <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Export Data'}
                  </Button>
                  {exportError && (
                    <Alert variant="error" className="mt-3">{exportError}</Alert>
                  )}
                </div>
              </Stack>
            </CardBody>
          </Card>

          {/* Danger Zone */}
          {!deletionStatus?.pending && (
            <Card className="border-error-500">
              <CardHeader>
                <h2 className="text-xl font-semibold text-error-600">Danger Zone</h2>
              </CardHeader>
              <CardBody>
                <div>
                  <h3 className="font-medium mb-2">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Permanently delete your account and all associated data. This action cannot be
                    undone after the 30-day grace period.
                  </p>
                  <Button
                    variant="outline"
                    className="text-error-600 border-error-600 hover:bg-error-50"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </Container>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <Alert variant="error">
            <strong>Warning:</strong> This action will schedule your account for permanent deletion in 30
            days. During this period, you can cancel the deletion at any time.
          </Alert>
          <p className="text-sm text-muted-foreground">
            All your data including comments, favorites, and profile information will be permanently
            deleted after the grace period.
          </p>
          <TextArea
            label="Reason (optional)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            rows={3}
            placeholder="Help us improve by telling us why you're leaving..."
            maxLength={1000}
          />
          <Input
            label='Type "DELETE MY ACCOUNT" to confirm'
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="DELETE MY ACCOUNT"
            required
          />
          {deleteError && <Alert variant="error">{deleteError}</Alert>}
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmation !== 'DELETE MY ACCOUNT'}
              className="bg-error-600 hover:bg-error-700"
            >
              {isDeletingAccount ? 'Processing...' : 'Delete My Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
