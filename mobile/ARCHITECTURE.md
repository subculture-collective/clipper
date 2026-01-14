# Component Architecture Visualization

## Development Guidelines

### Touch Interaction & Pointer Events
For proper handling of touch interactions in React Native 0.81+, see **[docs/POINTER_EVENTS_GUIDE.md](./docs/POINTER_EVENTS_GUIDE.md)**. 

**Key Points:**
- ✅ Use `pointerEvents` in the `style` prop: `style={{ pointerEvents: 'none' }}`
- ❌ Never use `pointerEvents` as a direct prop (deprecated)
- ESLint can enforce this automatically once a pointerEvents rule is added (e.g., via `eslint-plugin-react-native`)

## Component Hierarchy

```
app/submit/index.tsx (Main Orchestrator)
│
├── State Management
│   ├── currentStep: 'url' | 'metadata' | 'tags' | 'review' | 'success' | 'error'
│   ├── clipUrl: string
│   ├── customTitle: string
│   ├── streamerOverride: string
│   ├── tags: string[]
│   ├── isNsfw: boolean
│   ├── clipMetadata: Partial<ClipMetadata>
│   ├── isLoadingMetadata: boolean
│   ├── isSubmitting: boolean
│   └── submissionResult: object | null
│
├── Navigation Logic
│   ├── handleUrlNext(url) → fetch metadata → go to Step 2
│   ├── handleMetadataNext() → go to Step 3
│   ├── handleTagsNext() → go to Step 4
│   ├── handleSubmit() → API call → success/error view
│   ├── handleBack() → previous step
│   ├── handleSubmitAnother() → reset & go to Step 1
│   ├── handleViewFeed() → navigate to feed
│   ├── handleRetry() → go to Step 4
│   └── handleCancel() → go back
│
└── Rendered Components (conditionally)
    │
    ├── [Steps 1-4] → <StepIndicator />
    │                 Shows: currentStep, totalSteps, stepNames
    │
    ├── [Step 1: url] → <UrlInputStep />
    │                    Props: initialUrl, onNext
    │                    Features: URL validation, Next button
    │
    ├── [Step 2: metadata] → <MetadataOverrideStep />
    │                         Props: clipUrl, detectedStreamer, detectedGame,
    │                               isLoading, customTitle, streamerOverride,
    │                               onCustomTitleChange, onStreamerOverrideChange,
    │                               onNext, onBack
    │                         Features: Display metadata, optional overrides
    │
    ├── [Step 3: tags] → <TagsNsfwStep />
    │                    Props: tags, isNsfw, onTagsChange, onNsfwChange,
    │                          onNext, onBack
    │                    Features: Tag management, NSFW toggle
    │
    ├── [Step 4: review] → <ReviewSubmitStep />
    │                      Props: clipUrl, customTitle, detectedStreamer,
    │                            detectedGame, streamerOverride, tags, isNsfw,
    │                            isSubmitting, onSubmit, onBack
    │                      Features: Summary, Submit button
    │
    ├── [success] → <SuccessView />
    │               Props: message, status, onViewFeed, onSubmitAnother
    │               Features: Success message, action buttons
    │
    └── [error] → <ErrorView />
                  Props: title, message, errorDetails, canRetry,
                        onRetry, onCancel
                  Features: Error details, retry/cancel options
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER ACTIONS                            │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       COMPONENT LAYER                            │
│  UrlInputStep → MetadataOverrideStep → TagsNsfwStep →           │
│  ReviewSubmitStep → SuccessView / ErrorView                     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        STATE LAYER                               │
│  (React Hooks in Main Orchestrator)                             │
│  - Form data (url, title, tags, etc.)                           │
│  - UI state (loading, current step)                             │
│  - Result state (success/error)                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
│  services/clips.ts                                               │
│  - submitClip(request)                                           │
│  - getUserSubmissions(page, limit)                              │
│  - getSubmissionStats()                                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  lib/api.ts (Enhanced API Client)                               │
│  - Retry logic                                                   │
│  - Error handling                                                │
│  - Network awareness                                             │
│  - Token management                                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
│  POST /clips/submit                                              │
│  GET /submissions                                                │
│  GET /submissions/stats                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌──────────────────┐
│  Main Component  │
│  (Orchestrator)  │
└────────┬─────────┘
         │
         ├─► State Updates ──► Re-render
         │
         ├─► Step Navigation ──► Change currentStep
         │
         ├─► API Calls ──► Update submissionResult
         │
         └─► Child Component Events ──► Handler Functions
                                          │
    ┌────────────────────────────────────┴────────────────┐
    │                                                      │
    ▼                                                      ▼
┌──────────┐                                        ┌──────────┐
│  Step    │  onNext/onBack                         │ Success/ │
│Components│◄────────────────────────────────────►  │  Error   │
└──────────┘                                        │  Views   │
    │                                               └──────────┘
    │ User Input
    │ (URL, Title, Tags, etc.)
    ▼
┌──────────┐
│  Local   │
│  State   │
└──────────┘
```

## Styling Architecture

```
NativeWind (Tailwind for React Native)
│
├── Utility Classes
│   ├── Layout: flex, items-center, justify-center, p-4, gap-3
│   ├── Typography: text-2xl, font-bold, text-gray-900
│   ├── Colors: bg-primary-600, text-white, border-gray-300
│   ├── Sizing: w-full, h-20, max-w-sm
│   └── States: disabled:bg-gray-300
│
├── Component-Level Styling
│   ├── Conditional classes (template literals)
│   ├── Dynamic colors based on state
│   └── Platform-specific adjustments
│
└── Consistency
    ├── Primary color: #2563eb (blue-600)
    ├── Success color: green-*
    ├── Error color: red-*
    ├── Gray scale: gray-50 to gray-900
    └── Standard spacing: multiples of 4 (p-4, mb-6, gap-3)
```

## State Machine Diagram

```
                     [START]
                        │
                        ▼
                  ┌─────────┐
                  │   URL   │◄────┐
                  └────┬────┘     │
                       │ next     │
                       ▼          │
                  ┌─────────┐    │
            ┌────►│METADATA │    │
            │     └────┬────┘    │
            │ back     │ next    │
            │          ▼          │
            │     ┌─────────┐    │
            ├────►│  TAGS   │    │
            │     └────┬────┘    │
            │ back     │ next    │
            │          ▼          │
            │     ┌─────────┐    │
            └────►│ REVIEW  │    │
                  └────┬────┘    │
                       │ submit   │
                       ▼          │
                  ┌─────────┐    │
        ┌────────►│ SUCCESS │    │
        │         └────┬────┘    │
        │              │          │
        │   ┌──────────┴──────┐  │
        │   │                 │  │
        │   ▼ view feed    submit another
        │[EXIT]               │  │
        │                     └──┘
        │
        │         ┌─────────┐
        └────────►│  ERROR  │
        retry     └────┬────┘
                       │ cancel
                       ▼
                    [EXIT]
```

## Type Relationships

```
┌────────────────────────────────────┐
│      SubmitClipRequest             │
│  (Request to Backend)              │
│  - clip_url: string                │
│  - custom_title?: string           │
│  - broadcaster_name_override?: str │
│  - tags?: string[]                 │
│  - is_nsfw?: boolean               │
└────────────┬───────────────────────┘
             │
             ▼ API Call
┌────────────────────────────────────┐
│      SubmitClipResponse            │
│  (Response from Backend)           │
│  - success: boolean                │
│  - message: string                 │
│  - submission: ClipSubmission      │
└────────────┬───────────────────────┘
             │
             ▼ Used in
┌────────────────────────────────────┐
│       ClipSubmission               │
│  (Submission Object)               │
│  - id: string                      │
│  - user_id: string                 │
│  - twitch_clip_id: string          │
│  - status: pending|approved|reject │
│  - created_at: string              │
│  - ... (other fields)              │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│       ClipMetadata                 │
│  (Auto-detected Info)              │
│  - broadcaster_name: string        │
│  - game_name: string               │
│  - title: string                   │
│  - ... (other fields)              │
└────────────────────────────────────┘
```

## Error Handling Flow

```
                     [API Error]
                          │
                          ▼
                 ┌─────────────────┐
                 │  Error Instance │
                 │  (ApiError)     │
                 └────────┬────────┘
                          │
                ┌─────────┴──────────┐
                │                    │
           instanceof            instanceof
            ApiError?               Error?
                │                    │
                ▼                    ▼
         ┌──────────────┐     ┌──────────┐
         │ Get Error    │     │ Generic  │
         │ Type & Msg   │     │ Message  │
         └──────┬───────┘     └────┬─────┘
                │                  │
                └──────────┬───────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │  Classify Error  │
                 │  - Retryable?    │
                 │  - User message  │
                 │  - Details       │
                 └────────┬─────────┘
                          │
                          ▼
                 ┌──────────────────┐
                 │  ErrorView       │
                 │  - Show message  │
                 │  - Show details  │
                 │  - Retry button  │
                 └──────────────────┘
```

## Component Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│ StepIndicator                                                │
│ • Display progress (1/4, 2/4, etc.)                         │
│ • Show current step name                                     │
│ • Visual progress bar                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ UrlInputStep                                                 │
│ • Capture clip URL                                           │
│ • Validate URL format                                        │
│ • Show helpful instructions                                  │
│ • Enable/disable Next button                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MetadataOverrideStep                                         │
│ • Display auto-detected info (read-only)                     │
│ • Custom title input (optional)                              │
│ • Streamer override input (optional)                         │
│ • Show loading state                                         │
│ • Back/Next navigation                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ TagsNsfwStep                                                 │
│ • Tag input and add button                                   │
│ • Current tags display (with remove)                         │
│ • Suggested tags (quick add)                                 │
│ • NSFW toggle with explanation                               │
│ • Enforce limits (max 5 tags, 20 chars each)                │
│ • Back/Next navigation                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ReviewSubmitStep                                             │
│ • Display all submission details                             │
│ • Highlight custom/override values                           │
│ • Show NSFW warning if applicable                            │
│ • Guidelines reminder                                        │
│ • Submit button with loading state                           │
│ • Back button                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SuccessView                                                  │
│ • Success icon and message                                   │
│ • Status-specific info (pending/approved)                    │
│ • Explanation of next steps                                  │
│ • "View Feed" button                                         │
│ • "Submit Another" button                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ErrorView                                                    │
│ • Error icon and title                                       │
│ • User-friendly error message                                │
│ • Technical error details                                    │
│ • Common issues checklist                                    │
│ • "Try Again" button (if retryable)                          │
│ • "Cancel"/"Go Back" button                                  │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌──────────────────────────────────────────────────────────────┐
│                    External Dependencies                      │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ Authentication  │ useAuth() hook
│   Context       │ • isAuthenticated
└────────┬────────┘ • Redirect to login if needed
         │
         ▼
┌─────────────────┐
│  Navigation     │ useRouter() from expo-router
│  (expo-router)  │ • router.push('/auth/login')
└────────┬────────┘ • router.push('/(tabs)')
         │          • router.back()
         ▼
┌─────────────────┐
│  API Client     │ Enhanced API client
│  (lib/api.ts)   │ • Retry logic
└────────┬────────┘ • Error handling
         │          • Network awareness
         ▼
┌─────────────────┐
│   Services      │ services/clips.ts
│ (clips.ts)      │ • submitClip()
└────────┬────────┘ • getUserSubmissions()
         │          • getSubmissionStats()
         ▼
┌─────────────────┐
│  Backend API    │ REST endpoints
│                 │ • POST /clips/submit
└─────────────────┘ • GET /submissions
                    • GET /submissions/stats
```

This architecture provides:
✅ Clear separation of concerns
✅ Unidirectional data flow
✅ Easy to test components
✅ Maintainable structure
✅ Scalable design

## MFA Enrollment Flow Architecture

### Overview

The MFA enrollment flow allows users to enable two-factor authentication on their accounts. It supports multiple enrollment methods including QR code scanning, manual secret entry, and email verification fallback.

### Component Structure

```
app/auth/mfa-enroll.tsx (Main Enrollment Orchestrator)
│
├── State Management
│   ├── currentStep: 'intro' | 'scan' | 'manual' | 'email-verify' | 'verify' | 'backup-codes'
│   ├── enrollmentData: EnrollMFAResponse | null
│   ├── manualSecret: string
│   ├── verificationCode: string
│   ├── trustDevice: boolean
│   ├── isLoading: boolean
│   ├── error: string | null
│   ├── hasPermission: boolean | null
│   ├── isScanning: boolean
│   └── backupCodesViewed: boolean
│
├── Enrollment Steps
│   ├── intro → Overview and requirements
│   ├── scan → QR code scanner (expo-barcode-scanner)
│   ├── manual → Manual secret key entry
│   ├── email-verify → Email OTP fallback
│   ├── verify → TOTP code verification
│   └── backup-codes → Display and save backup codes
│
└── Navigation Flow
    ├── Start → intro
    ├── intro → scan (Get Started)
    ├── scan → manual (Enter Code Manually)
    ├── scan → email-verify (Verify via Email)
    ├── manual → verify (Continue)
    ├── email-verify → manual (After email verification)
    ├── verify → backup-codes (After successful verification)
    └── backup-codes → Settings (Complete)
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER ACTIONS                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       ENROLLMENT STEPS                           │
│  Intro → QR Scan / Manual / Email → Verify → Backup Codes      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                             │
│  services/mfa.ts                                                 │
│  - startEnrollment()                                             │
│  - verifyEnrollment(code)                                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  POST /auth/mfa/enroll                                           │
│  POST /auth/mfa/verify-enrollment                                │
└─────────────────────────────────────────────────────────────────┘
```

### Enrollment Methods

#### 1. QR Code Display

- Server generates QR code containing TOTP secret
- App displays QR code from `enrollmentData.qr_code_url` (data URL)
- User scans displayed QR code with their authenticator app (Google Authenticator, Authy, etc.)
- User enters TOTP code from authenticator app to verify enrollment
- No camera permissions required - QR code is shown, not scanned by the app
- Gracefully handles missing QR code data
- Falls back to manual or email verification

#### 2. Manual Secret Entry

- Displays Base32-encoded secret from server
- Provides copy-to-clipboard functionality
- Validates Base32 format before proceeding
- Shows helpful tips for authenticator app setup
- Confirms user has entered secret correctly

#### 3. Email Verification Fallback

- Alternative when camera unavailable or user preference
- Sends verification email (placeholder in current implementation)
- Provides clear instructions and confirmation
- Seamlessly transitions to manual setup after verification

### Security Features

#### TOTP Secret Handling

- Server generates TOTP secret during enrollment
- Secret transmitted once via HTTPS
- Never stored in insecure local storage
- Displayed only during manual entry step
- User enters secret in authenticator app

#### Backup Codes

- 10 single-use backup codes generated server-side
- Displayed once during enrollment
- Copy and share functionality provided
- User must confirm codes have been saved
- Warning about permanent loss of access

#### Device Trust

- Optional "Trust This Device" toggle
- 30-day trusted device period
- Reduces MFA prompts on trusted devices
- Server-side trust management
- Can be revoked from settings

### Integration Points

```
┌──────────────────────────────────────────────────────────────┐
│                    External Dependencies                      │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ expo-clipboard  │ Copy backup codes
└────────┬────────┘ • System clipboard
         │          • Share sheet integration
         ▼
┌─────────────────┐
│  expo-haptics   │ Tactile feedback
└────────┬────────┘ • Success/error haptics
         │          • Interaction feedback
         ▼
┌─────────────────┐
│  Settings       │ Navigation entry point
│  Screen         │ • Shows MFA status
└─────────────────┘ • Links to enrollment
```

### Error Handling

The enrollment flow handles various error scenarios:

1. **Missing QR Code Data**
   - Show error message if QR code URL unavailable
   - Offer alternative methods (manual, email)
   - Maintain enrollment state

2. **Invalid Verification Code**
   - Inline error message
   - Allow immediate retry
   - Clear input on retry

3. **Manual Entry Mismatch**
   - Validate entered secret matches server secret
   - Clear error message about mismatch
   - Allow user to retry

4. **Network Errors**
   - Display user-friendly error
   - Offer retry functionality
   - Maintain enrollment state

### Accessibility

The enrollment flow implements comprehensive accessibility:

- **Screen Reader Support**
  - Descriptive labels for all interactive elements
  - Proper role assignment (button, switch, textbox)
  - Context-aware hints
  - State announcements (disabled, busy, checked)

- **Keyboard Navigation**
  - Logical tab order
  - Auto-focus on critical inputs
  - Clear focus indicators

- **Visual Accessibility**
  - High contrast colors
  - Large tap targets (minimum 44x44 points)
  - Clear visual feedback
  - Dynamic type support

- **Backup Code Accessibility**
  - Character-by-character reading
  - Numbered code announcement
  - Copy/share alternatives

### Testing Strategy

#### Manual Testing Checklist

**iOS Testing:**
- [ ] QR scanning with Face ID device
- [ ] QR scanning with Touch ID device
- [ ] Manual entry flow
- [ ] Email verification fallback
- [ ] Backup codes copy/share
- [ ] Device trust toggle
- [ ] VoiceOver navigation
- [ ] Dynamic type scaling

**Android Testing:**
- [ ] QR scanning with fingerprint
- [ ] QR scanning with face unlock
- [ ] Manual entry flow
- [ ] Email verification fallback
- [ ] Backup codes copy/share
- [ ] Device trust toggle
- [ ] TalkBack navigation
- [ ] Font scaling

**Cross-Platform:**
- [ ] Camera permission handling
- [ ] Network error scenarios
- [ ] Invalid code handling
- [ ] Back navigation
- [ ] State persistence

### Dependencies

```json
{
  "expo-clipboard": "^8.0.8",
  "expo-haptics": "^15.0.7",
  "expo-local-authentication": "~15.0.0"
}
```

### API Contract

#### Start Enrollment
```typescript
POST /api/v1/auth/mfa/enroll

Response: {
  secret: string,        // Base32 TOTP secret
  qr_code_url: string,   // Data URL for QR code
  backup_codes: string[] // 10 single-use codes
}
```

#### Verify Enrollment
```typescript
POST /api/v1/auth/mfa/verify-enrollment

Body: {
  code: string // 6-digit TOTP code
}

Response: {
  message: string
}
```

### Future Enhancements

Potential improvements for future iterations:

- WebAuthn/FIDO2 support for passwordless authentication
- Push notification challenges
- Biometric-only mode (policy dependent)
- Auto-fill from SMS/email (iOS autofill)
- Adaptive MFA based on risk score
- Multiple authenticator app support
- QR code regeneration
- Progressive enrollment (partial completion state)

### Related Documentation

- Backend MFA Service: `/backend/internal/services/mfa_service.go`
- Backend MFA Handler: `/backend/internal/handlers/mfa_handler.go`
- MFA Challenge Implementation: `mobile/MFA_CHALLENGE_IMPLEMENTATION.md`
- MFA Admin Guide: `docs/MFA_ADMIN_GUIDE.md`
- OTPAuth URI Parser: `mobile/lib/otpauth.ts`
