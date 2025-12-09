# Email Templates Documentation

This document provides an overview of all email templates used in the Clipper platform.

## Overview

All email templates are implemented in `/backend/internal/services/email_service.go` as Go functions that generate both HTML and plain text versions of each email. Templates use inline CSS for maximum email client compatibility.

## Template Categories

### Account & Authentication (3 templates)

#### 1. Welcome Email
- **Type**: `welcome`
- **Trigger**: New user registration
- **Subject**: "Welcome to Clipper! 🎬"
- **Content**: 
  - Greeting with username
  - Platform introduction
  - Getting started guide
  - Link to explore clips
  - Documentation and support links

#### 2. Password Reset
- **Type**: `password_reset`
- **Trigger**: User requests password reset
- **Subject**: "Reset Your Clipper Password"
- **Content**:
  - Reset link (expires in 24 hours)
  - Security notice
  - Alternative contact method
  - Support email link

#### 3. Email Verification
- **Type**: `email_verification`
- **Trigger**: User needs to verify email address
- **Subject**: "Verify Your Email Address"
- **Content**:
  - Verification link
  - Security information
  - Resend verification link
  - Support information

### Content Notifications (5 templates)

#### 1. Comment Reply
- **Type**: `models.NotificationTypeReply`
- **Trigger**: Someone replies to user's comment
- **Subject**: "{Author} replied to your comment"
- **Content**:
  - Author name
  - Clip title
  - Comment preview
  - Link to reply

#### 2. Mention
- **Type**: `models.NotificationTypeMention`
- **Trigger**: User is mentioned in a comment
- **Subject**: "{Author} mentioned you in a comment"
- **Content**:
  - Author name
  - Clip title
  - Comment preview with mention
  - Link to comment

#### 3. Submission Approved
- **Type**: `models.NotificationTypeSubmissionApproved`
- **Trigger**: User's clip submission is approved
- **Subject**: "Your Clip Submission Has Been Approved! 🎉"
- **Content**:
  - Clip title
  - Stats snapshot (views, votes)
  - Link to approved clip
  - Encouragement to share

#### 4. Submission Rejected
- **Type**: `models.NotificationTypeSubmissionRejected`
- **Trigger**: User's clip submission is rejected
- **Subject**: "Clip Submission Status Update"
- **Content**:
  - Clip title
  - Reason for rejection
  - Resubmission tips
  - Link to guidelines
  - Appeal and resubmit buttons

#### 5. Clip Trending
- **Type**: `models.NotificationTypeContentTrending`
- **Trigger**: User's clip is trending
- **Subject**: "🔥 Your Clip is Trending!"
- **Content**:
  - Clip title
  - Current statistics (views, votes, comments)
  - Link to clip
  - Engagement encouragement

### Moderation (2 templates)

#### 1. Content Flagged
- **Type**: `models.NotificationTypeContentFlagged`
- **Trigger**: User's content is flagged for review
- **Subject**: "Content Flagged for Review"
- **Content**:
  - Content type and title
  - Flag reason
  - What happens next
  - Link to guidelines
  - Appeal option

#### 2. Ban/Suspension
- **Type**: `models.NotificationTypeBan`
- **Trigger**: Account is banned or suspended
- **Subject**: "Account Status Update"
- **Content**:
  - Action type (ban/suspension)
  - Reason
  - Duration
  - Appeal process
  - Link to submit appeal

### System Alerts (2 templates)

#### 1. Security Alert
- **Type**: `models.NotificationTypeLoginNewDevice`
- **Trigger**: New device login detected
- **Subject**: "⚠️ New Login Detected"
- **Content**:
  - Device information
  - Location
  - IP address
  - Timestamp
  - Secure account button
  - Instructions if not user

#### 2. Policy Update
- **Type**: `policy_update`
- **Trigger**: Platform policy changes
- **Subject**: "Important Update to Our Policies"
- **Content**:
  - Policy name
  - Changes summary
  - Effective date
  - Link to full policy
  - Impact on user

## Design Standards

### Visual Design
- **Color Scheme**: Gradient headers matching clpr.tv branding
- **Typography**: Arial, sans-serif for maximum compatibility
- **Layout**: Max-width 600px for optimal email client display
- **Buttons**: Clear CTAs with branded colors
- **Spacing**: Consistent padding and margins

### Responsive Design
- Inline CSS styles for compatibility
- Mobile-friendly layouts
- Tested on major email clients
- Works with images disabled

### Content Requirements
All templates include:
- Clear, branded header with gradient background
- Main content area with white/light gray background
- Call-to-action button(s)
- Unsubscribe link
- Settings management link
- Company information footer

### Accessibility
- Semantic HTML structure
- Alt text for images (when used)
- High contrast text
- Large, clickable buttons
- Plain text alternative for all emails

## Usage Examples

### Sending a Welcome Email

```go
data := map[string]interface{}{
    "Username": user.Username,
}

err := emailService.SendNotificationEmail(
    ctx,
    user,
    "welcome",
    notificationID,
    data,
)
```

### Sending a Submission Approved Email

```go
data := map[string]interface{}{
    "ClipTitle": clip.Title,
    "ClipURL": fmt.Sprintf("%s/clips/%s", baseURL, clip.ID),
    "ViewCount": clip.ViewCount,
    "VoteScore": clip.VoteScore,
}

err := emailService.SendNotificationEmail(
    ctx,
    user,
    models.NotificationTypeSubmissionApproved,
    notificationID,
    data,
)
```

## Testing

All templates have comprehensive unit tests in `/backend/internal/services/email_service_test.go`.

To run tests:
```bash
cd backend
go test ./internal/services/email_service_test.go ./internal/services/email_service.go -v
```

### Test Coverage
- Template generation for all 12 types
- HTML and text content validation
- Required fields presence
- Link validation
- Unsubscribe functionality
- Subject line accuracy

## Sandbox Mode

The email service supports sandbox mode for development and testing:

```go
cfg := &EmailConfig{
    SandboxMode: true, // Emails are logged but not sent
    // ... other config
}
```

When enabled:
- Emails are logged with full details
- No actual SendGrid API calls made
- Returns fake message IDs
- Useful for local development

## Configuration

Email service configuration:

```go
type EmailConfig struct {
    SendGridAPIKey      string        // SendGrid API key
    FromEmail           string        // Sender email address
    FromName            string        // Sender display name
    BaseURL             string        // Application base URL
    Enabled             bool          // Enable/disable email sending
    SandboxMode         bool          // Log emails without sending
    MaxEmailsPerHour    int           // Rate limit per user
    TokenExpiryDuration time.Duration // Unsubscribe token expiry
}
```

## Rate Limiting

- Default: 10 emails per hour per user
- Configurable via `MaxEmailsPerHour`
- Prevents email spam
- Applies to notification emails only

## Unsubscribe System

All emails include:
- Unique unsubscribe token (90-day expiry)
- Direct unsubscribe link
- Link to notification settings
- Respects user preferences

## Best Practices

1. **Always provide both HTML and text versions**
2. **Test on multiple email clients**
3. **Keep subject lines clear and under 50 characters**
4. **Use action-oriented CTAs**
5. **Include unsubscribe on every email**
6. **Test with images disabled**
7. **Verify all links before deployment**
8. **Keep email content concise**
9. **Use inline CSS only**
10. **Test on mobile devices**

## Email Client Compatibility

Templates tested and verified on:
- Gmail (Web, iOS, Android)
- Outlook (Web, Desktop)
- Apple Mail (macOS, iOS)
- Yahoo Mail
- ProtonMail
- Thunderbird

## Future Enhancements

Potential improvements:
- [ ] Multi-language support
- [ ] Dynamic logo/branding
- [ ] A/B testing support
- [ ] Advanced analytics tracking
- [ ] Email digest functionality
- [ ] Customizable templates per user
- [ ] Dark mode optimization

## Support

For questions or issues with email templates:
- File an issue on GitHub
- Contact the backend team
- Review test files for examples
- Check SendGrid dashboard for delivery issues

## Changelog

### v1.0.0 (2025-12-09)
- Initial implementation of 12 email templates
- Comprehensive test coverage
- Responsive design with inline CSS
- Unsubscribe system integration
- Rate limiting support
