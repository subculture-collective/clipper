import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner } from '../components';
import { useAuth } from '../context/AuthContext';
export function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [error, setError] = useState(null);
    useEffect(() => {
        const handleCallback = async () => {
            const errorParam = searchParams.get('error');
            if (errorParam) {
                // OAuth error (e.g., user denied permission)
                setError(errorParam === 'access_denied'
                    ? 'You cancelled the login process.'
                    : 'Authentication failed. Please try again.');
                // Redirect to login after a delay
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 3000);
                return;
            }
            try {
                // The backend has already set the auth cookies
                // Just need to fetch the user data
                await refreshUser();
                // Get the intended destination from session storage or default to home
                const returnTo = sessionStorage.getItem('auth_return_to') || '/';
                sessionStorage.removeItem('auth_return_to');
                navigate(returnTo, { replace: true });
            }
            catch (err) {
                console.error('Auth callback error:', err);
                setError('Failed to complete authentication. Please try again.');
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 3000);
            }
        };
        handleCallback();
    }, [searchParams, navigate, refreshUser]);
    return (_jsx(Container, { className: "min-h-screen flex items-center justify-center", children: _jsx("div", { className: "text-center", children: error ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-4xl mb-4", children: "\u274C" }), _jsx("h1", { className: "text-2xl font-bold mb-2", children: "Authentication Failed" }), _jsx("p", { className: "text-muted-foreground mb-4", children: error }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Redirecting..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Spinner, { size: "xl", className: "mb-4" }), _jsx("h1", { className: "text-2xl font-bold mb-2", children: "Completing Login" }), _jsx("p", { className: "text-muted-foreground", children: "Please wait..." })] })) }) }));
}
