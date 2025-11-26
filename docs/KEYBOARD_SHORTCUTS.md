# Keyboard Shortcuts

Clipper is fully keyboard accessible. This document lists all available keyboard shortcuts for efficient navigation and interaction.

## Global Shortcuts

These shortcuts work throughout the application:

| Shortcut | Action | Context |
|----------|--------|---------|
| <kbd>/</kbd> | Focus search input | Any page |
| <kbd>Esc</kbd> | Close modal, menu, or dialog | When modal/menu is open |
| <kbd>Tab</kbd> | Move focus to next interactive element | Any page |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Move focus to previous interactive element | Any page |
| <kbd>Enter</kbd> | Activate focused element | Buttons, links |
| <kbd>Space</kbd> | Activate focused element | Buttons, checkboxes, toggles |

## Navigation Shortcuts

### Skip Navigation

- <kbd>Tab</kbd> (from page load) - Focus the "Skip to main content" link (visible on focus)
- <kbd>Enter</kbd> - Skip directly to main content, bypassing navigation

### Menu Navigation

When a dropdown menu is open:

| Shortcut | Action |
|----------|--------|
| <kbd>↑</kbd> / <kbd>↓</kbd> | Navigate between menu items |
| <kbd>Enter</kbd> | Select focused menu item |
| <kbd>Space</kbd> | Select focused menu item |
| <kbd>Esc</kbd> | Close menu and return focus to trigger button |
| <kbd>Home</kbd> | Focus first menu item |
| <kbd>End</kbd> | Focus last menu item |

## Clip Interaction

### Voting

- <kbd>Tab</kbd> to the upvote/downvote button
- <kbd>Enter</kbd> or <kbd>Space</kbd> to vote

### Favoriting

- <kbd>Tab</kbd> to the favorite button
- <kbd>Enter</kbd> or <kbd>Space</kbd> to toggle favorite

### Viewing Clip Details

- <kbd>Tab</kbd> to the clip title or thumbnail
- <kbd>Enter</kbd> to open clip detail page

## Forms

### Text Input

- <kbd>Tab</kbd> - Move to next field
- <kbd>Shift</kbd> + <kbd>Tab</kbd> - Move to previous field
- <kbd>Enter</kbd> - Submit form (when in text input)

### Checkboxes

- <kbd>Space</kbd> - Toggle checkbox state
- <kbd>Tab</kbd> - Move to next element

### Toggle Switches

- <kbd>Space</kbd> - Toggle switch state
- <kbd>Tab</kbd> - Move to next element

### Dropdown Selects

- <kbd>Enter</kbd> or <kbd>Space</kbd> - Open dropdown
- <kbd>↑</kbd> / <kbd>↓</kbd> - Navigate options
- <kbd>Enter</kbd> - Select option
- <kbd>Esc</kbd> - Close dropdown without selecting

## Modal Dialogs

When a modal is open:

| Shortcut | Action |
|----------|--------|
| <kbd>Tab</kbd> | Cycle through focusable elements within modal |
| <kbd>Shift</kbd> + <kbd>Tab</kbd> | Cycle backward through focusable elements |
| <kbd>Esc</kbd> | Close modal and return focus to trigger element |
| <kbd>Enter</kbd> | Confirm action (when applicable) |

**Note**: Focus is trapped within modals - you cannot tab outside the modal while it's open.

## Comments Section

### Adding a Comment

1. <kbd>Tab</kbd> to the comment textarea
2. Type your comment
3. <kbd>Tab</kbd> to the Submit button
4. <kbd>Enter</kbd> to submit

### Navigating Comments

- <kbd>Tab</kbd> through comments and reply buttons
- <kbd>Enter</kbd> on reply button to open reply form
- <kbd>Esc</kbd> to cancel reply

## Search

### Search Input

- <kbd>/</kbd> - Focus search input from anywhere
- Type search query
- <kbd>Enter</kbd> - Execute search
- <kbd>Esc</kbd> - Clear search and blur input

### Search Results

- <kbd>Tab</kbd> through result clips
- <kbd>Enter</kbd> on clip to view details

## Profile & Settings

### Tab Navigation in Profile

- <kbd>Tab</kbd> to tab list
- <kbd>←</kbd> / <kbd>→</kbd> - Navigate between tabs
- <kbd>Home</kbd> - Jump to first tab
- <kbd>End</kbd> - Jump to last tab
- <kbd>Enter</kbd> or <kbd>Space</kbd> - Activate focused tab

### Settings Forms

1. <kbd>Tab</kbd> through form fields
2. <kbd>Space</kbd> to toggle switches
3. <kbd>Tab</kbd> to Save button
4. <kbd>Enter</kbd> to save changes

## Notifications

### Notification Bell

- <kbd>Tab</kbd> to notification bell
- <kbd>Enter</kbd> to open notification dropdown
- <kbd>↑</kbd> / <kbd>↓</kbd> - Navigate notifications
- <kbd>Enter</kbd> - View notification details
- <kbd>Esc</kbd> - Close notification dropdown

### Notification Actions

- <kbd>Tab</kbd> to mark as read / delete button
- <kbd>Enter</kbd> to perform action

## Leaderboards

### Navigation

- <kbd>Tab</kbd> through time period filters
- <kbd>Enter</kbd> to select time period
- <kbd>Tab</kbd> through user entries
- <kbd>Enter</kbd> on username to view profile

## Tips for Efficient Navigation

### Using Skip Links

1. Press <kbd>Tab</kbd> immediately after page load
2. Press <kbd>Enter</kbd> to skip directly to main content
3. Saves time bypassing repeated navigation elements

### Modal Focus Management

- When opening a modal, focus automatically moves to the modal
- When closing a modal, focus returns to the element that opened it
- Use <kbd>Tab</kbd> to explore modal contents

### Form Validation

- When a form has errors, focus moves to the first error
- Error messages are announced by screen readers
- Use <kbd>Tab</kbd> to navigate between error fields

### Live Region Announcements

- Screen readers will announce important updates (e.g., "Clip upvoted")
- These announcements don't interrupt your current action
- Continue navigating normally after announcements

## Accessibility Features

### Visual Focus Indicators

- All interactive elements show a visible focus ring when focused
- Focus color: Primary purple (#9146FF)
- Focus ring: 2px solid outline with 2px offset

### Touch Target Sizes

- All interactive elements are at least 44x44px
- Ensures easy interaction for users with motor disabilities
- Works well on both desktop and mobile

### Screen Reader Support

- All interactive elements have descriptive labels
- Form fields are properly associated with labels
- Error messages are announced
- Dynamic content updates are announced via live regions

## Browser Compatibility

These keyboard shortcuts work in:

- Chrome/Edge (Windows, macOS, Linux)
- Firefox (Windows, macOS, Linux)
- Safari (macOS, iOS)

## Reporting Issues

If you encounter any keyboard navigation issues:

1. Check that JavaScript is enabled
2. Verify your browser is up to date
3. Report the issue on our [GitHub Issues page](https://github.com/subculture-collective/clipper/issues)
4. Include:
   - Browser and version
   - Operating system
   - Steps to reproduce
   - Expected vs. actual behavior

## Additional Resources

- [Web Accessibility Initiative - Keyboard Navigation](https://www.w3.org/WAI/perspective-videos/keyboard/)
- [WebAIM - Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [MDN - Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)

---

**Last Updated**: 2025-10-29
**Version**: 0.x (Pre-release)
