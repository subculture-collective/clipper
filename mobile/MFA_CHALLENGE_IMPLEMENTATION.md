# MFA Challenge UI Implementation

## Overview

This document describes the implementation of the Multi-Factor Authentication (MFA) challenge UI for the mobile application. The implementation provides a complete challenge flow for TOTP, email OTP, and backup codes, with biometric authentication support and device trust management.

## Architecture

### Components

#### 1. MFA Challenge Screen (`app/auth/mfa-challenge.tsx`)

The main screen that handles all MFA challenge types:

- **TOTP Challenge**: 6-digit time-based one-time password input with 30-second timer
- **Email OTP Challenge**: Email-based verification with resend functionality
- **Backup Code Challenge**: 8-character backup code input

**Features:**
- Tab-based navigation between challenge types
- Real-time code validation
- Comprehensive error handling
- "Remember Device" toggle for 30-day trusted device
- Biometric authentication support (convenience gate)
- Accessibility support (screen readers, keyboard navigation)

#### 2. MFA Service (`services/mfa.ts`)

Service module for MFA-related API calls:

**API Endpoints:**
- `GET /auth/mfa/status` - Get MFA status for current user
- `POST /auth/mfa/verify-login` - Verify MFA code during login
- `GET /auth/mfa/trusted-devices` - List trusted devices
- `DELETE /auth/mfa/trusted-devices/:id` - Revoke trusted device

**Types:**
- `MFAStatus` - MFA enrollment and status information
- `VerifyMFARequest` - MFA verification request
- `TrustedDevice` - Trusted device information

#### 3. Biometric Utilities (`lib/biometric.ts`)

Reusable utilities for biometric authentication:

**Functions:**
- `checkBiometricCapability()` - Check if biometrics are available and enrolled
- `authenticateWithBiometrics()` - Perform biometric authentication
- `getBiometricTypeLabel()` - Get user-friendly biometric type label

**Supported Biometric Types:**
- Face ID (facial recognition)
- Touch ID (fingerprint)
- Iris Scan

### Integration Points

#### Login Flow Integration

The MFA challenge is integrated into the login flow:

1. User completes OAuth authentication with Twitch
2. System checks MFA status via `/auth/mfa/status`
3. If MFA is enabled, user is redirected to MFA challenge screen
4. After successful MFA verification, user proceeds to main app

```typescript
// In app/auth/login.tsx
const mfaStatus = await getMFAStatus();
if (mfaStatus.enabled) {
    router.replace('/auth/mfa-challenge');
    return;
}
```

#### Settings Integration

MFA status is displayed in the Settings screen:

- Shows enabled/disabled status
- Displays backup codes remaining
- Shows trusted device count
- Links to enrollment (when implemented)

## User Flows

### TOTP Challenge Flow

1. User navigates to MFA challenge screen
2. System displays 6-digit input with 30-second countdown timer
3. User enters TOTP code from authenticator app
4. Optionally enables biometric authentication for convenience
5. Optionally enables "Remember Device" toggle
6. System verifies code via backend API
7. On success, user proceeds to main app

### Email OTP Challenge Flow

1. User switches to "Email" tab
2. System displays email code input
3. User enters code from email
4. Can request resend with 60-second cooldown
5. System verifies code via backend API
6. On success, user proceeds to main app

### Backup Code Challenge Flow

1. User switches to "Backup Code" tab
2. System displays masked 8-character input
3. User enters backup code
4. System verifies code (backend enforces single-use)
5. On success, user proceeds to main app

### Biometric Convenience Flow

1. User has biometrics enrolled on device
2. MFA challenge screen detects biometric capability
3. "Use [Face ID/Touch ID]" button is displayed
4. User taps biometric button
5. OS biometric prompt appears
6. After successful biometric auth, user still needs to enter MFA code
7. Biometric acts as convenience gate only, not bypass

## Error Handling

### Error Types

The implementation handles the following error scenarios:

1. **Invalid Code**: User enters incorrect code
   - Display: "Invalid code. Please try again."
   - Action: Clear input, allow retry

2. **Expired Code**: Code has expired
   - Display: "Code has expired. Please generate a new one."
   - Action: For email OTP, suggest resend

3. **Rate Limited**: Too many attempts
   - Display: "Too many attempts. Please wait before trying again."
   - Action: Disable input temporarily

4. **Account Locked**: Too many failed attempts
   - Display: "Too many failed attempts. Your account has been temporarily locked."
   - Action: Redirect to support/contact

5. **Network Error**: Connection issues
   - Display: Generic error message
   - Action: Allow retry

### Error Display

Errors are displayed in a prominent red box above the input field:

```tsx
{error && (
    <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <Text className="text-red-800 text-sm">{error}</Text>
    </View>
)}
```

## Security Considerations

### Biometric Authentication

- **NOT a bypass**: Biometrics serve only as a convenience gate
- **Server is source of truth**: TOTP secrets never stored in insecure storage
- **Policy dependent**: Biometric availability respects server policies
- **OS-level security**: Uses platform-native biometric APIs

### Device Trust

- **Server-side trust**: Trust is managed by backend, not client
- **30-day expiration**: Trusted devices expire after 30 days
- **Revocable**: Users can revoke trusted devices from settings
- **Fingerprinting**: Device fingerprint generated from user agent and IP

### Code Storage

- **No local TOTP storage**: TOTP secrets never stored on device
- **Secure storage only for state**: Only minimal state stored via `expo-secure-store`
- **Session-based auth**: Full authentication state managed by backend sessions

## Testing Strategy

### Unit Tests

Located in `__tests__/mfa.test.ts`:

- MFA service API calls
- Biometric utility functions
- Error handling scenarios
- Device trust management

### Manual Testing Checklist

#### iOS Testing
- [ ] TOTP input with 6 digits
- [ ] Face ID integration
- [ ] Touch ID integration (older devices)
- [ ] "Remember Device" toggle
- [ ] Error states (invalid, expired, rate-limit)
- [ ] Network error handling
- [ ] Accessibility with VoiceOver

#### Android Testing
- [ ] TOTP input with 6 digits
- [ ] Fingerprint integration
- [ ] Face unlock integration
- [ ] "Remember Device" toggle
- [ ] Error states (invalid, expired, rate-limit)
- [ ] Network error handling
- [ ] Accessibility with TalkBack

#### Challenge Types
- [ ] TOTP challenge succeeds with valid code
- [ ] TOTP challenge fails with invalid code
- [ ] Email OTP receives and enters successfully
- [ ] Email OTP resend cooldown works
- [ ] Email OTP throttling displays error
- [ ] Backup code challenge succeeds
- [ ] Backup code single-use enforcement
- [ ] Backup code consumption tracked correctly

#### Biometric Flow
- [ ] Biometric prompt appears on supported devices
- [ ] Biometric success allows code entry
- [ ] Biometric failure still allows manual code entry
- [ ] No biometric bypass of MFA verification
- [ ] Policy restrictions respected

#### Device Trust
- [ ] Trust toggle persists setting
- [ ] Trusted device skips MFA on subsequent login
- [ ] Trust expires after 30 days
- [ ] Trusted device can be revoked

## Dependencies

### Added Packages

```json
{
  "expo-local-authentication": "~15.0.0"
}
```

### Existing Dependencies Used

- `expo-secure-store`: Secure storage for minimal state
- `expo-linking`: Deep link handling for email OTP
- `expo-router`: Navigation
- `@tanstack/react-query`: Data fetching and caching

## API Compatibility

The implementation is compatible with the existing backend MFA endpoints:

### Backend Endpoints Used

1. **GET** `/api/v1/auth/mfa/status`
   - Returns MFA status for authenticated user

2. **POST** `/api/v1/auth/mfa/verify-login`
   - Verifies MFA code during login challenge
   - Body: `{ code: string, trust_device?: boolean }`

3. **GET** `/api/v1/auth/mfa/trusted-devices`
   - Lists all trusted devices for user

4. **DELETE** `/api/v1/auth/mfa/trusted-devices/:id`
   - Revokes a trusted device

## Future Enhancements

### Enrollment UI (Dependency)

This implementation depends on MFA Enrollment UI which will include:
- QR code scanning for TOTP setup
- Backup code generation and display
- Initial MFA configuration

### Additional Features

Potential future enhancements:
- Auto-fill from SMS/email (iOS autofill)
- Push notification challenges
- WebAuthn/FIDO2 support
- Adaptive MFA based on risk score
- Remember device by location
- Biometric-only mode (policy dependent)

## Styling Consistency

The implementation follows the app's existing design patterns:

- **Colors**: Primary blue (#2563eb), error red, success green
- **Typography**: Consistent font sizes and weights
- **Spacing**: Standard padding and margins (multiples of 4)
- **Components**: Matches existing button, input, and card styles
- **Accessibility**: High contrast, large tap targets, screen reader support

## References

- Backend MFA Implementation: `/backend/internal/handlers/mfa_handler.go`
- Backend MFA Service: `/backend/internal/services/mfa_service.go`
- MFA Admin Guide: `/docs/MFA_ADMIN_GUIDE.md`
- Mobile Architecture: `/mobile/ARCHITECTURE.md`
