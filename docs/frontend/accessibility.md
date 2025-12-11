<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Accessibility Guidelines](#accessibility-guidelines)
  - [Overview](#overview)
  - [WCAG 2.1 AA Compliance](#wcag-21-aa-compliance)
    - [Current Status](#current-status)
  - [Keyboard Navigation](#keyboard-navigation)
    - [Global Shortcuts](#global-shortcuts)
    - [Component-Specific Navigation](#component-specific-navigation)
  - [ARIA Implementation](#aria-implementation)
    - [Component ARIA Patterns](#component-aria-patterns)
  - [Color Contrast](#color-contrast)
    - [Text Contrast Requirements](#text-contrast-requirements)
    - [Color Palette](#color-palette)
  - [Testing](#testing)
    - [Automated Testing](#automated-testing)
    - [Manual Testing Checklist](#manual-testing-checklist)
  - [Best Practices for Developers](#best-practices-for-developers)
    - [1. Always Use Semantic HTML](#1-always-use-semantic-html)
    - [2. Provide Text Alternatives](#2-provide-text-alternatives)
    - [3. Maintain Focus Order](#3-maintain-focus-order)
    - [4. Handle Dynamic Content](#4-handle-dynamic-content)
    - [5. Use ARIA Appropriately](#5-use-aria-appropriately)
  - [Component Library](#component-library)
    - [Pre-Built Accessible Components](#pre-built-accessible-components)
    - [Using the Test Utilities](#using-the-test-utilities)
  - [Resources](#resources)
    - [Standards & Guidelines](#standards--guidelines)
    - [Testing Tools](#testing-tools)
    - [Screen Readers](#screen-readers)
  - [Support](#support)
  - [Contributing](#contributing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Accessibility Guidelines"
summary: "This document outlines the accessibility features, standards, and best practices for the Clipper app"
tags: ['frontend']
area: "frontend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Accessibility Guidelines

This document outlines the accessibility features, standards, and best practices for the Clipper application.

## Overview

Clipper is committed to providing an accessible experience for all users, including those who rely on assistive technologies. We follow WCAG 2.1 AA standards to ensure our application is perceivable, operable, understandable, and robust.

## WCAG 2.1 AA Compliance

### Current Status

✅ **Implemented**:

- Keyboard navigation throughout the application
- Skip links for quick navigation to main content
- ARIA labels and roles on interactive elements
- Focus indicators on all interactive elements
- Minimum touch target sizes (44x44px)
- Color contrast ratios meeting WCAG AA standards
- Semantic HTML landmarks (`<main>`, `<nav>`, `<header>`, `<footer>`)
- Screen reader friendly component structure
- Form validation with accessible error messages
- Focus trap in modals and dialogs
- Accessible dropdown menus with keyboard navigation

🔄 **In Progress**:

- Live region announcements for dynamic content
- Comprehensive screen reader testing
- Dark mode contrast validation

## Keyboard Navigation

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search input |
| `Escape` | Close modals/dialogs/dropdowns |
| `Tab` | Navigate forward through interactive elements |
| `Shift + Tab` | Navigate backward through interactive elements |
| `Enter` | Activate buttons and links |
| `Space` | Toggle checkboxes, switches, and buttons |
| `Arrow Keys` | Navigate within menus and lists |

### Component-Specific Navigation

#### Modal Dialogs

- Focus is automatically trapped within modals
- `Escape` closes the modal
- Focus returns to triggering element on close

#### Dropdown Menus

- Arrow keys navigate menu items
- `Enter` or `Space` selects an item
- `Escape` closes the menu

#### Form Controls

- All form fields have associated labels
- Error messages are announced to screen readers
- Required fields are properly marked with `aria-required`

## ARIA Implementation

### Component ARIA Patterns

#### Buttons

```tsx
<Button aria-label="Descriptive action">
  Click Me
</Button>

<Button disabled aria-disabled="true">
  Disabled Button
</Button>
```

#### Form Inputs

```tsx
<Input
  label="Email Address"
  error="Please enter a valid email"
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
```

#### Toggles/Switches

```tsx
<Toggle
  role="switch"
  aria-checked={isEnabled}
  label="Enable notifications"
/>
```

#### Modals

```tsx
<Modal
  open={isOpen}
  onClose={handleClose}
  title="Dialog Title"
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  {content}
</Modal>
```

#### Live Regions

```tsx
<LiveRegion
  message="Clip upvoted successfully"
  priority="polite"
/>
```

## Color Contrast

### Text Contrast Requirements

All text must meet WCAG AA contrast ratios:

- **Normal text** (< 18pt or < 14pt bold): 4.5:1 minimum
- **Large text** (≥ 18pt or ≥ 14pt bold): 3:1 minimum

### Color Palette

Our color palette has been validated for contrast:

**Light Mode:**

- Primary text on white background: 16.21:1 ✓
- Muted text on white background: 4.68:1 ✓
- Primary button text on primary background: 4.52:1 ✓

**Dark Mode:**

- Primary text on dark background: 14.85:1 ✓
- Muted text on dark background: 4.51:1 ✓
- Primary button text on primary background: 4.52:1 ✓

## Testing

### Automated Testing

We use axe-core for automated accessibility testing:

```bash
# Run all accessibility tests
npm test -- accessibility

# Run comprehensive accessibility tests
npm test -- accessibility-comprehensive
```

Our test suite includes:

- ARIA attribute validation
- Color contrast checking
- Keyboard navigation testing
- Focus management verification
- Semantic HTML structure validation

### Manual Testing Checklist

#### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Focus order is logical and intuitive
- [ ] Focus indicators are clearly visible
- [ ] No keyboard traps
- [ ] All functionality available without mouse

#### Screen Reader Testing

Test with at least one screen reader:

- **Windows**: NVDA (free) or JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca (free)

Checklist:

- [ ] All interactive elements are announced with their purpose
- [ ] Form fields have clear labels
- [ ] Error messages are announced
- [ ] Dynamic content updates are announced (live regions)
- [ ] Heading hierarchy is logical
- [ ] Images have appropriate alt text
- [ ] Links have descriptive text

#### Visual Testing

- [ ] Text is readable at 200% zoom
- [ ] Layout doesn't break at different zoom levels
- [ ] Color is not the only means of conveying information
- [ ] Focus indicators are visible in all themes
- [ ] Sufficient color contrast throughout UI

## Best Practices for Developers

### 1. Always Use Semantic HTML

✅ **Good:**

```tsx
<button onClick={handleClick}>Click Me</button>
<nav aria-label="Main navigation">
  <a href="/home">Home</a>
</nav>
```

❌ **Bad:**

```tsx
<div onClick={handleClick}>Click Me</div>
<div>
  <span onClick={navigate}>Home</span>
</div>
```

### 2. Provide Text Alternatives

✅ **Good:**

```tsx
<img src="chart.png" alt="Sales increased by 25% in Q4" />
<button aria-label="Close dialog">
  <XIcon />
</button>
```

❌ **Bad:**

```tsx
<img src="chart.png" />
<button>
  <XIcon />
</button>
```

### 3. Maintain Focus Order

✅ **Good:**

```tsx
<form>
  <Input label="Name" />      {/* tabIndex: 1 */}
  <Input label="Email" />     {/* tabIndex: 2 */}
  <Button type="submit">      {/* tabIndex: 3 */}
    Submit
  </Button>
</form>
```

❌ **Bad:**

```tsx
<form>
  <Button type="submit" tabIndex={1}>Submit</Button>
  <Input label="Name" tabIndex={3} />
  <Input label="Email" tabIndex={2} />
</form>
```

### 4. Handle Dynamic Content

✅ **Good:**

```tsx
function VoteButton() {
  const { announce } = useLiveRegion();

  const handleVote = () => {
    vote();
    announce('Clip upvoted successfully');
  };

  return <button onClick={handleVote}>Upvote</button>;
}
```

❌ **Bad:**

```tsx
function VoteButton() {
  const handleVote = () => {
    vote();
    // No announcement - screen reader users won't know the action succeeded
  };

  return <button onClick={handleVote}>Upvote</button>;
}
```

### 5. Use ARIA Appropriately

✅ **Good:**

```tsx
<button aria-label="Close">
  <XIcon />
</button>

<div role="status" aria-live="polite">
  {loadingMessage}
</div>
```

❌ **Bad:**

```tsx
<div role="button" aria-label="Close">
  <XIcon />
</div>

<div>
  {loadingMessage}
</div>
```

## Component Library

### Pre-Built Accessible Components

The following components are pre-built with accessibility in mind:

- **Button**: Focus states, ARIA labels, keyboard support
- **Input**: Label association, error announcements, required field indicators
- **TextArea**: Same as Input plus character count
- **Checkbox**: Proper label association, keyboard toggle
- **Toggle**: Switch role, aria-checked state
- **Modal**: Focus trap, ESC to close, focus restoration
- **SkipLink**: Keyboard-only visible skip link
- **LiveRegion**: Announces dynamic content updates

### Using the Test Utilities

```tsx
import { testAccessibility, testKeyboardNavigation } from '@/test/utils/accessibility';

describe('MyComponent', () => {
  it('should be accessible', async () => {
    const { container } = render(<MyComponent />);

    // Runs axe-core checks
    await testAccessibility(container);

    // Verifies keyboard navigation
    const focusableElements = testKeyboardNavigation(container);
    expect(focusableElements.length).toBeGreaterThan(0);
  });
});
```

## Resources

### Standards & Guidelines

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Testing Tools

- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse (Chrome DevTools)](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers

- [NVDA (Windows)](https://www.nvaccess.org/)
- [VoiceOver (macOS)](https://www.apple.com/accessibility/voiceover/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)

## Support

For accessibility issues or questions:

1. Check this documentation
2. Review component examples in our component library
3. Run automated tests to identify issues
4. Open an issue on GitHub with the `accessibility` label

## Contributing

When contributing to Clipper:

1. Run accessibility tests before submitting PRs
2. Test keyboard navigation manually
3. Verify ARIA attributes are appropriate
4. Ensure color contrast meets standards
5. Test with at least one screen reader when possible

---

**Last Updated**: 2025-10-29
**WCAG Version**: 2.1 AA
**Testing Tools**: axe-core 4.11.0, jest-axe 10.0.0
