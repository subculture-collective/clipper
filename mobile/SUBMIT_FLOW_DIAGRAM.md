# Submit Clip Flow - User Journey

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      SUBMIT CLIP FLOW                            │
└─────────────────────────────────────────────────────────────────┘

                            [START]
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Authentication Check │
                    └─────────────────────┘
                         │         │
                   (Yes) │         │ (No)
                         │         └────────► [Redirect to Login]
                         ▼
              ╔══════════════════════╗
              ║   STEP 1: URL INPUT  ║
              ╚══════════════════════╝
              │ • Paste clip URL
              │ • URL validation
              │ • Helpful tips
              └─────────┬─────────────
                        │ [Next]
                        ▼
              ╔══════════════════════╗
              ║ STEP 2: METADATA     ║
              ╚══════════════════════╝
              │ • Show detected info
              │ • Custom title (opt)
              │ • Streamer override
              └─────────┬─────────────
                   [Back] │ [Next]
                        ▼
              ╔══════════════════════╗
              ║ STEP 3: TAGS & NSFW  ║
              ╚══════════════════════╝
              │ • Add tags (max 5)
              │ • Suggested tags
              │ • NSFW toggle
              └─────────┬─────────────
                   [Back] │ [Next]
                        ▼
              ╔══════════════════════╗
              ║ STEP 4: REVIEW       ║
              ╚══════════════════════╝
              │ • View all details
              │ • Guidelines reminder
              │ • Final confirmation
              └─────────┬─────────────
                   [Back] │ [Submit]
                        ▼
                 ┌──────────────┐
                 │  API CALL    │
                 │  /clips/submit│
                 └──────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
         (Success)           (Error)
              │                   │
              ▼                   ▼
    ╔═══════════════════╗  ╔═══════════════════╗
    ║  SUCCESS VIEW     ║  ║   ERROR VIEW      ║
    ╚═══════════════════╝  ╚═══════════════════╝
    │ • Status message  │  │ • Error message   │
    │ • Pending/Approved│  │ • Error details   │
    │ • Next actions    │  │ • Common issues   │
    └─────────┬─────────┘  └─────────┬─────────┘
              │                   │
    ┌─────────┴────────┐    ┌─────┴──────┐
    │                  │    │            │
[View Feed]  [Submit Another] [Retry] [Cancel]
```

## Step Details

### Step 1: URL Input

**Purpose**: Capture and validate the clip URL

**UI Elements**:

- Large text input for URL
- Info box with instructions
- Validation feedback
- Next button (disabled until valid URL)

**Validation**:

- Check URL format
- Support two URL patterns:
  - clips.twitch.tv/ClipSlug
  - twitch.tv/streamer/clip/ClipSlug

---

### Step 2: Metadata Override

**Purpose**: Show detected information and allow customization

**UI Elements**:

- Auto-detected info display (read-only):
  - Streamer name
  - Game name
- Optional custom title input
- Optional streamer override input
- Back and Next buttons

**API Integration**:

- Fetch clip metadata from backend
- Show loading state during fetch
- Handle fetch errors gracefully

---

### Step 3: Tags & NSFW

**Purpose**: Add metadata and content warnings

**UI Elements**:

- Tag input field with Add button
- Current tags (chips with remove option)
- Suggested tags (quick add)
- NSFW toggle switch with explanation
- Back and Next buttons

**Constraints**:

- Maximum 5 tags
- Maximum 20 characters per tag
- Case-insensitive duplicate prevention

---

### Step 4: Review & Submit

**Purpose**: Final verification before submission

**UI Elements**:

- Scrollable summary of all information
- Visual indicators for:
  - Custom values
  - Overrides
  - NSFW content
- Guidelines reminder box
- Back and Submit buttons

**Submit Button States**:

- Enabled: "Submit Clip"
- Submitting: "Submitting..." (disabled)

---

### Success View

**Purpose**: Confirm successful submission

**UI Elements**:

- Success icon (checkmark)
- Status-specific message
- Info box explaining next steps
- Two action buttons:
  - "View in Feed" / "Back to Feed"
  - "Submit Another Clip"

**Two Outcomes**:

1. **Pending**: Clip awaiting moderation
2. **Approved**: Clip auto-approved (high karma users)

---

### Error View

**Purpose**: Handle and explain errors

**UI Elements**:

- Error icon (X)
- Error title and message
- Error details (if available)
- Common issues checklist
- Action buttons:
  - "Try Again" (if retryable)
  - "Cancel" / "Go Back"

**Error Types**:

- Network errors (retryable)
- Validation errors (not retryable)
- Rate limit errors (not retryable)
- Server errors (retryable)
- Duplicate clip (not retryable)
- Karma requirement (not retryable)

---

## Progress Indicator

Throughout steps 1-4, a visual progress indicator shows:

- Current step number (highlighted)
- Total steps (4)
- Progress bar
- Step name

Example:

```
● ━━━ ○ ━━━ ○ ━━━ ○
Step 1 of 4: URL
```

---

## Data Flow

```
User Input → Local State → Validation → API Request → Response Handling

Local State:
- clipUrl: string
- customTitle: string
- streamerOverride: string
- tags: string[]
- isNsfw: boolean
- clipMetadata: object
- isLoadingMetadata: boolean
- isSubmitting: boolean
- submissionResult: object | null

API Request:
{
  clip_url: string
  custom_title?: string
  broadcaster_name_override?: string
  tags?: string[]
  is_nsfw?: boolean
}

API Response (Success):
{
  success: true
  message: string
  submission: {
    id: string
    status: 'pending' | 'approved'
    ...
  }
}

API Response (Error):
{
  success: false
  error: string
  field?: string
}
```

---

## Error Handling Flow

```
                [API Request]
                      │
                      ▼
                [Response]
              /           \
        (2xx Success)  (4xx/5xx Error)
             │               │
             ▼               ▼
      [Parse Response]  [Parse Error]
             │               │
             ▼               ▼
      [Show Success]   [Classify Error]
                            │
                    ┌───────┴──────────┐
                    │                  │
              (Retryable)        (Not Retryable)
                    │                  │
                    ▼                  ▼
            [Show Retry]    [Show Message Only]
```

## Navigation Flow

```
Submit Screen
    │
    ├─► Step 1 (URL)
    │       │
    │       ├─► Step 2 (Metadata)
    │       │       │
    │       │       ├─► Step 3 (Tags)
    │       │       │       │
    │       │       │       ├─► Step 4 (Review)
    │       │       │       │       │
    │       │       │       │       ├─► Success
    │       │       │       │       │       ├─► Feed (Tab)
    │       │       │       │       │       └─► Reset to Step 1
    │       │       │       │       │
    │       │       │       │       └─► Error
    │       │       │       │               ├─► Back to Step 4 (retry)
    │       │       │       │               └─► Back to Feed
    │       │       │       │
    │       │       │       └─► Back to Step 2
    │       │       │
    │       │       └─► Back to Step 1
    │       │
    │       └─► [User can go back at any step]
    │
    └─► [If not authenticated] → Login Screen
```

---

## Mobile UI Patterns Used

1. **Bottom-up Flow**: Steps progress naturally downward
2. **Clear CTAs**: Primary actions are always visible
3. **Incremental Validation**: Validate as user progresses
4. **Contextual Help**: Inline tips and explanations
5. **Error Prevention**: Disabled buttons, character limits
6. **Feedback**: Loading states, success animations
7. **Escape Hatch**: Back button at every step
8. **Safe Defaults**: NSFW off, no required fields except URL
