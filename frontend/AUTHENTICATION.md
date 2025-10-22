# Authentication Implementation

This document describes the user authentication flow implementation for Clipper using Twitch OAuth.

## Overview

The authentication system uses Twitch OAuth 2.0 for user authentication, with JWT tokens for session management. The backend handles the OAuth flow and issues HTTP-only cookies containing access and refresh tokens.

## Architecture

### Frontend Components

#### 1. Auth Context (`src/context/AuthContext.tsx`)
- Manages global authentication state
- Provides user data and authentication status
- Handles session persistence on app load
- Automatically checks for existing session via `/api/v1/auth/me` endpoint

**Key Features:**
- Session persistence across page reloads
- Automatic user data fetching on mount
- Clean logout functionality
- Loading states for auth operations

#### 2. API Client (`src/lib/api.ts`)
- Configured with `withCredentials: true` for cookie handling
- Implements automatic token refresh on 401 responses
- Queue system to prevent multiple simultaneous refresh attempts
- Retries failed requests after successful token refresh

**Token Refresh Flow:**
1. Request fails with 401 status
2. Check if already refreshing (queue if yes)
3. Call `/api/v1/auth/refresh` endpoint
4. Backend sets new tokens in cookies
5. Retry original request
6. Process queued requests

#### 3. Auth API Service (`src/lib/auth-api.ts`)
- `initiateOAuth()` - Redirects to backend OAuth endpoint
- `getCurrentUser()` - Fetches current user data
- `refreshToken()` - Manually refreshes tokens (usually automatic)
- `logout()` - Logs out user and clears cookies

#### 4. Pages

**LoginPage (`src/pages/LoginPage.tsx`)**
- Displays "Continue with Twitch" button
- Twitch branding (purple color + logo)
- Stores return URL for post-login redirect
- Clean, minimal design

**AuthCallbackPage (`src/pages/AuthCallbackPage.tsx`)**
- Handles OAuth callback at `/auth/success`
- Fetches user data after successful auth
- Redirects to original destination
- Handles OAuth errors gracefully

**ProfilePage (`src/pages/ProfilePage.tsx`)**
- Displays user information:
  - Avatar
  - Username and display name
  - Bio
  - Karma points
  - Role
  - Account age
- Placeholder tabs for future features:
  - Comments
  - Upvoted clips
  - Submitted clips

**SettingsPage (`src/pages/SettingsPage.tsx`)**
- Account settings (read-only currently)
- Privacy settings (placeholder)
- Notification preferences (placeholder)
- Danger zone (export data, delete account)

#### 5. Components

**UserMenu (`src/components/layout/UserMenu.tsx`)**
- Avatar dropdown in header
- Shows username and karma
- Menu items:
  - Profile
  - Settings
  - Favorites
  - Admin Panel (if admin/moderator)
  - Logout
- Click-outside and ESC key support
- Keyboard navigation ready

**Route Guards:**
- `ProtectedRoute` - Requires authentication
- `AdminRoute` - Requires admin/moderator role
- `GuestRoute` - Redirects authenticated users

#### 6. Hooks (`src/hooks/useAuth.ts`)
- `useAuth()` - Main auth hook
- `useUser()` - Get current user
- `useIsAuthenticated()` - Check auth status
- `useRequireAuth()` - Force authentication

## Backend Integration

### Endpoints Used

- `GET /api/v1/auth/twitch` - Initiate OAuth flow
- `GET /api/v1/auth/twitch/callback` - OAuth callback handler
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Token Storage

**HTTP-only Cookies** (secure in production):
- `access_token` - Short-lived (15 minutes)
- `refresh_token` - Long-lived (7 days)

**Benefits:**
- Protected from XSS attacks
- Automatic token inclusion in requests
- Secure token storage

## Security Features

### Implemented
- ✅ CSRF protection via state parameter
- ✅ HTTP-only secure cookies
- ✅ Automatic token refresh
- ✅ No tokens in localStorage
- ✅ No tokens exposed in URLs
- ✅ Proper CORS configuration
- ✅ Token rotation on refresh

### User Data
All user input is handled by React, which provides XSS protection by default through its escaping mechanisms.

## OAuth Flow

1. User clicks "Continue with Twitch" on LoginPage
2. Frontend calls `initiateOAuth()` → redirects to `/api/v1/auth/twitch`
3. Backend generates state parameter, stores in Redis
4. Backend redirects to Twitch OAuth authorization page
5. User authorizes application on Twitch
6. Twitch redirects to backend callback: `/api/v1/auth/twitch/callback`
7. Backend validates state, exchanges code for tokens
8. Backend fetches user data from Twitch API
9. Backend creates/updates user in database
10. Backend generates JWT tokens
11. Backend sets tokens in HTTP-only cookies
12. Backend redirects to frontend: `/auth/success`
13. AuthCallbackPage fetches user data via `/api/v1/auth/me`
14. Frontend redirects to original destination or home

## Session Management

### On App Load
1. AuthContext calls `getCurrentUser()` via `/api/v1/auth/me`
2. If successful → user is authenticated
3. If fails → user is not authenticated
4. Loading state shown during check

### Token Expiry
- Access token expires after 15 minutes
- API client automatically refreshes via `/api/v1/auth/refresh`
- Refresh token rotates on each refresh (security best practice)
- If refresh token expires → user must re-authenticate

### Logout
1. Frontend calls `logout()` API
2. Backend revokes refresh token in database
3. Backend clears cookies
4. Frontend clears user state
5. User redirected to home page

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Testing the Implementation

### Manual Testing Steps

1. **Login Flow:**
   - Click "Login" in header
   - Click "Continue with Twitch"
   - Verify redirect to Twitch OAuth
   - Authorize application
   - Verify redirect back to app
   - Verify user menu appears in header

2. **Session Persistence:**
   - Login successfully
   - Refresh the page
   - Verify user remains logged in
   - Check browser cookies for tokens

3. **Protected Routes:**
   - Try accessing `/profile` without login
   - Verify redirect to `/login`
   - Login and verify redirect to `/profile`

4. **Token Refresh:**
   - Login successfully
   - Wait 16 minutes (access token expiry)
   - Make an API request
   - Verify automatic token refresh in network tab

5. **Logout:**
   - Click user menu
   - Click "Logout"
   - Verify redirect to home
   - Verify user menu disappears
   - Check cookies are cleared

## Future Enhancements

### Phase 2 Features (Not Yet Implemented)
- [ ] Edit profile bio and display name
- [ ] Avatar upload
- [ ] Privacy settings functionality
- [ ] Notification preferences
- [ ] Account deletion
- [ ] Data export (GDPR)
- [ ] Email notifications
- [ ] User comment history
- [ ] Upvoted clips list
- [ ] Login modal (alternative to page)
- [ ] Remember me functionality

## Error Handling

### OAuth Errors
- User denied permission → Friendly message + redirect to login
- Invalid state parameter → Error message + redirect to login
- Twitch API error → Generic error + retry option

### Session Errors
- Expired access token → Automatic refresh
- Expired refresh token → Forced logout
- Network errors → Retry mechanism
- Invalid token → Clear state + redirect to login

## Notes

- The frontend is fully functional and ready for use with the backend
- All authentication flows follow security best practices
- Token management is automatic and transparent to the user
- The implementation is production-ready with proper error handling
