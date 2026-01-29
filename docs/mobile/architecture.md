---
title: "Component Architecture Visualization"
summary: "```"
tags: ['mobile']
area: "mobile"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Component Architecture Visualization

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
