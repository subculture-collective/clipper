import { Container, Card, CardHeader, CardBody, Stack, Input, Button } from '../components';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Container className="py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        {/* Account Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Account Settings</h2>
          </CardHeader>
          <CardBody>
            <Stack direction="vertical" gap={4}>
              <Input
                label="Username"
                value={user.username}
                disabled
                helperText="Username is set by Twitch and cannot be changed"
              />
              <Input
                label="Display Name"
                value={user.display_name}
                disabled
                helperText="Coming soon: Edit your display name"
              />
              {user.email && (
                <Input
                  label="Email"
                  value={user.email}
                  disabled
                  helperText="Email is managed through your Twitch account"
                />
              )}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium mb-2">Bio</label>
                <textarea
                  id="bio"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none"
                  rows={4}
                  placeholder="Tell us about yourself..."
                  defaultValue={user.bio || ''}
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Coming soon: Edit your bio
                </p>
              </div>
            </Stack>
          </CardBody>
        </Card>

        {/* Privacy Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Privacy Settings</h2>
          </CardHeader>
          <CardBody>
            <Stack direction="vertical" gap={4}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Profile Visibility</p>
                  <p className="text-sm text-muted-foreground">
                    Control who can see your profile
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Karma Publicly</p>
                  <p className="text-sm text-muted-foreground">
                    Display your karma points on your profile
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
            </Stack>
          </CardBody>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">Notifications</h2>
          </CardHeader>
          <CardBody>
            <Stack direction="vertical" gap={4}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reply Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when someone replies to your comment
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
            </Stack>
          </CardBody>
        </Card>

        {/* Danger Zone */}
        <Card className="border-error-500">
          <CardHeader>
            <h2 className="text-xl font-semibold text-error-600">Danger Zone</h2>
          </CardHeader>
          <CardBody>
            <Stack direction="vertical" gap={4}>
              <div>
                <h3 className="font-medium mb-2">Export Your Data</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Download a copy of your data (GDPR compliance)
                </p>
                <Button variant="outline" disabled>
                  Export Data (Coming Soon)
                </Button>
              </div>
              <div>
                <h3 className="font-medium mb-2">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete your account and all associated data
                </p>
                <Button variant="outline" className="text-error-600 border-error-600" disabled>
                  Delete Account (Coming Soon)
                </Button>
              </div>
            </Stack>
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
