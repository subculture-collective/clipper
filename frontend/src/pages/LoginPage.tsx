import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, Card, CardHeader, CardBody, Button, Stack } from '../components';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const location = useLocation();

  // Store the return URL when the login page is accessed
  useEffect(() => {
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
    if (from && from !== '/login') {
      sessionStorage.setItem('auth_return_to', from);
    }
  }, [location]);

  const handleTwitchLogin = () => {
    login();
  };

  return (
    <Container className="py-16 max-w-md">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-center">Welcome to Clipper</h1>
          <p className="text-center text-muted-foreground mt-2">
            Sign in to upvote, comment, and save your favorite clips
          </p>
        </CardHeader>
        <CardBody>
          <Stack direction="vertical" gap={4}>
            <Button
              onClick={handleTwitchLogin}
              variant="primary"
              className="w-full bg-[#9146FF] hover:bg-[#772CE8] text-white font-semibold py-3"
              disabled={isLoading}
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
                </svg>
                Continue with Twitch
              </span>
            </Button>
            
            <div className="text-xs text-center text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </Stack>
        </CardBody>
      </Card>
    </Container>
  );
}
