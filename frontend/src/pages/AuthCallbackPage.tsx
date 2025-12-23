import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner } from '../components';
import { useAuth } from '../context/AuthContext';
import { handleOAuthCallback } from '../lib/auth-api';
import { trackEvent, AuthEvents } from '../lib/telemetry';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const errorParam = searchParams.get('error');

      if (errorParam) {
        // OAuth error (e.g., user denied permission)
        setError(errorParam === 'access_denied'
          ? 'You cancelled the login process.'
          : 'Authentication failed. Please try again.');

        // Track failed login
        trackEvent(AuthEvents.LOGIN_FAILED, {
          method: 'twitch',
          error: errorParam,
        });

        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
        return;
      }

      // Check if we have PKCE parameters (code and state)
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      try {
        // If we have code and state, try PKCE flow
        if (code && state) {
          const result = await handleOAuthCallback(code, state);

          if (!result.success) {
            // PKCE flow failed, but don't give up yet
            // The backend might have already authenticated us (non-PKCE fallback)
            console.warn('PKCE callback failed:', result.error, 'Attempting to check if backend authenticated...');

            // Try to get user without PKCE completion
            try {
              await refreshUser();
              // If we get here, backend did authenticate us
              const returnTo = sessionStorage.getItem('auth_return_to') || '/';
              sessionStorage.removeItem('auth_return_to');
              navigate(returnTo, { replace: true });
              return;
            } catch {
              // Backend also couldn't authenticate
              setError(result.error || 'Authentication failed. Please try again.');
              setTimeout(() => {
                navigate('/login', { replace: true });
              }, 3000);
              return;
            }
          }
        }

        // After successful OAuth callback (or if backend already set cookies)
        // Fetch the user data
        await refreshUser();

        // Track successful login
        trackEvent(AuthEvents.LOGIN_COMPLETED, {
          method: 'twitch',
        });

        // Get the intended destination from session storage or default to home
        const returnTo = sessionStorage.getItem('auth_return_to') || '/';
        sessionStorage.removeItem('auth_return_to');

        navigate(returnTo, { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Failed to complete authentication. Please try again.');

        // Track failed login
        trackEvent(AuthEvents.LOGIN_FAILED, {
          method: 'twitch',
          error: err instanceof Error ? err.message : 'Unknown error',
        });

        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <Container className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        ) : (
          <>
            <Spinner size="xl" className="mb-4" />
            <h1 className="text-2xl font-bold mb-2">Completing Login</h1>
            <p className="text-muted-foreground">Please wait...</p>
          </>
        )}
      </div>
    </Container>
  );
}
