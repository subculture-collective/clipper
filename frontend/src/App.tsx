import { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Avatar,
  Alert,
  Modal,
  ModalFooter,
  Spinner,
  Skeleton,
  Divider,
  Checkbox,
  Toggle,
  TextArea,
  Container,
  Grid,
  Stack,
} from './components';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Theme:</span>
      <Button
        size="sm"
        variant={theme === 'light' ? 'primary' : 'ghost'}
        onClick={() => setTheme('light')}
      >
        Light
      </Button>
      <Button
        size="sm"
        variant={theme === 'dark' ? 'primary' : 'ghost'}
        onClick={() => setTheme('dark')}
      >
        Dark
      </Button>
      <Button
        size="sm"
        variant={theme === 'system' ? 'primary' : 'ghost'}
        onClick={() => setTheme('system')}
      >
        System
      </Button>
    </div>
  );
}

function AppContent() {
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-theme">
      <Container className="py-8">
        <Stack direction="vertical" gap={8}>
          {/* Header */}
          <div className="text-center">
            <h1 className="text-gradient mb-2">Clipper Component Library</h1>
            <p className="text-muted-foreground text-lg">
              A comprehensive TailwindCSS-based component library for React
            </p>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>

          <Divider label="Layout Components" />

          {/* Grid Demo */}
          <Card variant="elevated">
            <CardHeader>
              <h2 className="text-2xl font-semibold">Grid System</h2>
            </CardHeader>
            <CardBody>
              <Grid cols={3} gap={4} responsive={{ sm: 1, md: 2, lg: 3 }}>
                <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-lg text-center">
                  Column 1
                </div>
                <div className="bg-secondary-100 dark:bg-secondary-900 p-4 rounded-lg text-center">
                  Column 2
                </div>
                <div className="bg-info-100 dark:bg-info-900 p-4 rounded-lg text-center">
                  Column 3
                </div>
              </Grid>
            </CardBody>
          </Card>

          <Divider label="Form Components" />

          {/* Form Components */}
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">Form Elements</h2>
            </CardHeader>
            <CardBody>
              <Stack direction="vertical" gap={6}>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="Enter your email"
                  helperText="We'll never share your email"
                />

                <TextArea
                  label="Message"
                  placeholder="Type your message here..."
                  helperText="Maximum 200 characters"
                  maxLength={200}
                  showCount
                />

                <Checkbox
                  label="I agree to the terms and conditions"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />

                <Toggle
                  label="Enable notifications"
                  checked={toggled}
                  onChange={(e) => setToggled(e.target.checked)}
                  helperText="Get notified of important updates"
                />

                <Stack direction="horizontal" gap={3}>
                  <Button variant="primary">Submit</Button>
                  <Button variant="secondary">Save Draft</Button>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="ghost">Reset</Button>
                  <Button variant="danger">Delete</Button>
                </Stack>

                <Stack direction="horizontal" gap={3}>
                  <Button
                    variant="primary"
                    loading={loading}
                    onClick={handleLoadingDemo}
                  >
                    {loading ? 'Loading...' : 'Click to Load'}
                  </Button>
                  <Button variant="primary" size="sm">
                    Small
                  </Button>
                  <Button variant="primary" size="lg">
                    Large
                  </Button>
                </Stack>
              </Stack>
            </CardBody>
          </Card>

          <Divider label="Feedback Components" />

          {/* Alerts */}
          <Stack direction="vertical" gap={4}>
            <Alert variant="success" title="Success">
              Your changes have been saved successfully!
            </Alert>
            <Alert variant="warning" title="Warning" dismissible>
              Please review your information before submitting.
            </Alert>
            <Alert variant="error" title="Error">
              An error occurred while processing your request.
            </Alert>
            <Alert variant="info" title="Information">
              Your session will expire in 5 minutes.
            </Alert>
          </Stack>

          {/* Modal Demo */}
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold">Modal Dialog</h2>
            </CardHeader>
            <CardBody>
              <Button onClick={() => setShowModal(true)}>Open Modal</Button>
              <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Example Modal"
                size="md"
              >
                <p className="mb-4">
                  This is a modal dialog with smooth animations and backdrop blur.
                  Press ESC or click outside to close.
                </p>
                <ModalFooter>
                  <Button variant="ghost" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => setShowModal(false)}>
                    Confirm
                  </Button>
                </ModalFooter>
              </Modal>
            </CardBody>
          </Card>

          <Divider label="Data Display Components" />

          {/* Data Display */}
          <Grid cols={2} gap={6} responsive={{ sm: 1, md: 2 }}>
            <Card hover clickable>
              <CardHeader>
                <h3 className="text-xl font-semibold">Badges & Avatars</h3>
              </CardHeader>
              <CardBody>
                <Stack direction="vertical" gap={4}>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Badges:</p>
                    <Stack direction="horizontal" gap={2} wrap>
                      <Badge variant="primary">Primary</Badge>
                      <Badge variant="secondary">Secondary</Badge>
                      <Badge variant="success">Success</Badge>
                      <Badge variant="warning">Warning</Badge>
                      <Badge variant="error">Error</Badge>
                      <Badge variant="info">Info</Badge>
                    </Stack>
                  </div>
                  <Divider />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Avatars:</p>
                    <Stack direction="horizontal" gap={3} align="center">
                      <Avatar size="xs" fallback="XS" status="online" />
                      <Avatar size="sm" fallback="SM" status="away" />
                      <Avatar size="md" fallback="MD" status="busy" />
                      <Avatar size="lg" fallback="LG" status="offline" />
                      <Avatar size="xl" fallback="XL" status="online" />
                    </Stack>
                  </div>
                </Stack>
              </CardBody>
            </Card>

            <Card hover>
              <CardHeader>
                <h3 className="text-xl font-semibold">Loading States</h3>
              </CardHeader>
              <CardBody>
                <Stack direction="vertical" gap={4}>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Spinners:</p>
                    <Stack direction="horizontal" gap={4} align="center">
                      <Spinner size="sm" />
                      <Spinner size="md" />
                      <Spinner size="lg" />
                      <Spinner size="xl" color="secondary" />
                    </Stack>
                  </div>
                  <Divider />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Skeletons:</p>
                    <Stack direction="vertical" gap={2}>
                      <Skeleton variant="text" width="100%" />
                      <Skeleton variant="text" width="80%" />
                      <Stack direction="horizontal" gap={2}>
                        <Skeleton variant="circular" width={40} height={40} />
                        <Stack direction="vertical" gap={2} className="flex-1">
                          <Skeleton variant="text" width="60%" />
                          <Skeleton variant="text" width="40%" />
                        </Stack>
                      </Stack>
                    </Stack>
                  </div>
                </Stack>
              </CardBody>
            </Card>
          </Grid>

          {/* Footer */}
          <Card variant="outlined">
            <CardFooter>
              <p className="text-center text-muted-foreground w-full">
                Built with React, TypeScript, and TailwindCSS 💜
              </p>
            </CardFooter>
          </Card>
        </Stack>
      </Container>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
