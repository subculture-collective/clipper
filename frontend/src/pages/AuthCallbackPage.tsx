import { useEffect, useState, useRef } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const hasProcessedRef = useRef(false);

  console.log('[AuthCallback] RENDER - error:', error, 'isProcessing:', isProcessing, 'isInitialized:', isInitialized);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasProcessedRef.current) {
      console.log('[AuthCallback] Already processed, skipping');
      return;
    }
    hasProcessedRef.current = true;

    console.log('[AuthCallback] useEffect START');
    const handleCallback = async () => {
      console.log('[AuthCallback] setIsInitialized(true)');
      setIsInitialized(true);
      const errorParam = searchParams.get('error');
      console.log('[AuthCallback] errorParam:', errorParam);

      if (errorParam) {
        // OAuth error (e.g., user denied permission)
        const message = errorParam === 'access_denied'
          ? 'You cancelled the login process.'
          : 'Authentication failed. Please try again.';
        console.log('[AuthCallback] Setting error:', message);
        setError(message);

        // Track failed login
        trackEvent(AuthEvents.LOGIN_FAILED, {
          method: 'twitch',
          error: errorParam,
        });

        // Show error feedback briefly, then redirect to login
        setTimeout(() => {
          console.log('[AuthCallback] Redirecting to login with error');
          navigate(`/login?error=${encodeURIComponent(errorParam)}`, { replace: true });
        }, 1500);
        return;
      }

      // Check if we have PKCE parameters (code and state)
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      console.log('[AuthCallback] code:', code, 'state:', state);

      // Only show processing state when we're actually processing
      console.log('[AuthCallback] setIsProcessing(true)');
      setIsProcessing(true);

      try {
        // If we have code and state, try PKCE flow
        if (code && state) {
          console.log('[AuthCallback] Calling handleOAuthCallback');
          const result = await handleOAuthCallback(code, state);
          console.log('[AuthCallback] handleOAuthCallback result:', result);

          if (!result.success) {
            // PKCE flow failed; redirect back to login with error for retry
            const err = result.error || 'pkce_failed';
            console.log('[AuthCallback] PKCE failed, setting error:', err);
            setError(typeof err === 'string' ? err : 'Authentication failed');
            setTimeout(() => {
              console.log('[AuthCallback] Redirecting to login after PKCE failure');
              navigate(`/login?error=${encodeURIComponent(err)}`, { replace: true });
            }, 1500);
            return;
          }
        }

        // After successful OAuth callback (or if backend already set cookies)
        // Fetch the user data
        console.log('[AuthCallback] Calling refreshUser');
        await refreshUser();
        console.log('[AuthCallback] refreshUser complete');

        // Track successful login
        trackEvent(AuthEvents.LOGIN_COMPLETED, {
          method: 'twitch',
        });

        // Get the intended destination from session storage or default to home
        const returnTo = sessionStorage.getItem('auth_return_to') || '/';
        sessionStorage.removeItem('auth_return_to');

        console.log('[AuthCallback] SUCCESS - navigating to:', returnTo);
        navigate(returnTo, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Auth callback error:', err);
        setError('Failed to complete authentication. Please try again.');

        // Track failed login
        trackEvent(AuthEvents.LOGIN_FAILED, {
          method: 'twitch',
          error: err instanceof Error ? err.message : 'Unknown error',
        });

        const msg = err instanceof Error ? err.message : 'unknown';
        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
        }, 1500);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  // Don't render anything until initialized to prevent flash
  console.log('[AuthCallback] RENDER CHECK - isInitialized:', isInitialized);
  if (!isInitialized) {
    console.log('[AuthCallback] RENDERING: Initial loading state');
    return (
      <Container className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="xl" className="mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authenticating</h1>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </Container>
    );
  }

  console.log('[AuthCallback] RENDERING:', error ? 'ERROR state' : 'SUCCESS state');
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
