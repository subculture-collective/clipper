# Mobile-First CSS & Responsive Design QA Checklist

This document provides a comprehensive checklist for verifying mobile-first design and responsive layouts across all pages in the Clipper application.

## Responsive Breakpoints

- **xs**: 375px - Small mobile devices
- **sm**: 640px - Mobile landscape / small tablets  
- **md**: 768px - Tablets
- **lg**: 1024px - Desktop
- **xl**: 1280px - Large desktop
- **2xl**: 1536px - Extra large desktop

## General Requirements

### ✅ Mobile (≤375px)
- [ ] No horizontal scroll on any page
- [ ] All content is readable without zooming
- [ ] Touch targets are minimum 44x44px
- [ ] Proper spacing between interactive elements (min 8px)
- [ ] Text is legible (minimum 14px for body text)
- [ ] Images and videos scale properly
- [ ] Navigation is accessible and usable
- [ ] Forms are easy to fill out
- [ ] Modals fit within viewport

### ✅ Tablet (768px)
- [ ] Layout adjusts appropriately from mobile
- [ ] Multi-column layouts work correctly
- [ ] Touch targets remain appropriate
- [ ] Navigation transitions smoothly
- [ ] No content cutoff or overflow

### ✅ Desktop (≥1024px)
- [ ] Full desktop layout is utilized
- [ ] Hover states work as expected
- [ ] Multi-column layouts are optimized
- [ ] Maximum content width is enforced (1280px)
- [ ] Proper use of whitespace

## Safe Areas
- [ ] Content respects iOS/Android notches
- [ ] Bottom navigation clears home indicators
- [ ] Header content clears status bar areas
- [ ] Fixed/sticky elements account for safe areas

## Page-Specific Checks

### Home Page (`/`)
- [ ] **Mobile**: Clip cards stack vertically with proper spacing
- [ ] **Mobile**: Vote buttons are horizontal at bottom of card
- [ ] **Tablet**: Clip cards remain single column or 2-column grid
- [ ] **Desktop**: Clip cards in single column, properly centered
- [ ] Infinite scroll works on all breakpoints
- [ ] "Scroll to top" button properly positioned

### Clip Detail Page (`/clip/:id`)
- [ ] **Mobile**: Video player fills width appropriately
- [ ] **Mobile**: Action buttons stack vertically or in responsive grid
- [ ] **Mobile**: Metadata wraps appropriately
- [ ] **Tablet**: Action buttons in 3-column grid
- [ ] **Desktop**: Proper max-width constraint (4xl)
- [ ] Comments section is readable and interactive
- [ ] Vote buttons have proper touch targets

### Search Page (`/search`)
- [ ] **Mobile**: Search bar is full width
- [ ] **Mobile**: Category tabs scroll horizontally if needed
- [ ] **Mobile**: Sort dropdown is accessible
- [ ] **Tablet**: Tabs and sort in same row
- [ ] **Desktop**: Full layout with proper spacing
- [ ] Search results display correctly at all breakpoints
- [ ] Filters are accessible on mobile (drawer or modal)

### Submit Clip Page (`/submit`)
- [ ] **Mobile**: Form fields stack vertically
- [ ] **Mobile**: Input fields are easy to tap and fill
- [ ] **Tablet**: Form maintains single column
- [ ] **Desktop**: Form has appropriate max-width
- [ ] File upload buttons are minimum 44px tall
- [ ] Validation messages are visible
- [ ] Preview area scales appropriately

### Profile Page (`/profile`)
- [ ] **Mobile**: Stats cards stack vertically
- [ ] **Mobile**: Tabs scroll horizontally
- [ ] **Mobile**: Karma breakdown chart scales
- [ ] **Tablet**: Stats in 2-3 column grid
- [ ] **Desktop**: Full dashboard layout
- [ ] Badge displays are responsive
- [ ] Activity feed items are readable

### Settings Page (`/settings`)
- [ ] **Mobile**: Settings sections stack vertically
- [ ] **Mobile**: Toggle switches are easy to tap
- [ ] **Mobile**: Form inputs have proper spacing
- [ ] **Tablet**: Two-column layout where appropriate
- [ ] **Desktop**: Sidebar navigation + content area
- [ ] All buttons meet minimum touch target size
- [ ] Confirmation modals fit viewport

### Admin Pages (`/admin/*`)
- [ ] **Mobile**: Data tables scroll horizontally with fixed headers
- [ ] **Mobile**: Action buttons are accessible
- [ ] **Tablet**: Tables use responsive design patterns
- [ ] **Desktop**: Full data table layout
- [ ] Filters work on mobile (drawer pattern)
- [ ] Charts and graphs scale appropriately
- [ ] Bulk actions are accessible

## Component-Specific Checks

### Navigation Header
- [ ] **Mobile**: Hamburger menu icon, collapsed navigation
- [ ] **Mobile**: Logo scales appropriately
- [ ] **Tablet**: Expanded nav with proper spacing
- [ ] **Desktop**: Full horizontal navigation
- [ ] User menu dropdown positions correctly
- [ ] Notification bell accessible on all sizes

### Footer
- [ ] **Mobile**: Links stack vertically
- [ ] **Tablet**: Links in 2-3 columns
- [ ] **Desktop**: Full horizontal layout
- [ ] Social icons properly sized
- [ ] Copyright text readable

### Clip Card Component
- [ ] **Mobile**: Vote buttons horizontal at bottom
- [ ] **Mobile**: Thumbnail/embed scales properly
- [ ] **Mobile**: Title text doesn't overflow (line-clamp-2)
- [ ] **Mobile**: Metadata wraps appropriately
- [ ] **Tablet/Desktop**: Vote sidebar vertical on left
- [ ] Action buttons (comment, favorite) are 44px minimum
- [ ] Tags wrap or truncate appropriately

### Modal/Dialog Components
- [ ] **Mobile**: Full screen or nearly full screen
- [ ] **Mobile**: Close button easily accessible
- [ ] **Tablet**: Centered with appropriate padding
- [ ] **Desktop**: Max width with backdrop
- [ ] Content scrolls if needed
- [ ] Safe area padding applied

### Form Elements
- [ ] All input fields: 44px minimum height
- [ ] All buttons: 44px minimum height
- [ ] Select dropdowns: 44px minimum height
- [ ] Checkboxes: 44px minimum touch target (includes label)
- [ ] Radio buttons: 44px minimum touch target (includes label)
- [ ] Proper spacing between form fields (16px minimum)

## Typography Scale Verification

### Mobile (xs)
- H1: 3xl (1.875rem / 30px)
- H2: 2xl (1.5rem / 24px)
- H3: xl (1.25rem / 20px)
- H4: lg (1.125rem / 18px)
- Body: base (1rem / 16px)
- Small: sm (0.875rem / 14px)

### Tablet & Above
- H1: 4xl-5xl (2.25-3rem)
- H2: 3xl-4xl (1.875-2.25rem)
- H3: 2xl-3xl (1.5-1.875rem)
- Body: base (1rem / 16px)

## Performance Checks

- [ ] Images use appropriate sizes for breakpoint
- [ ] Lazy loading implemented for images
- [ ] Videos don't autoplay on mobile
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No layout shift (CLS) on mobile

## Accessibility Checks

- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible and appropriate
- [ ] Touch targets don't overlap
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader navigation works correctly
- [ ] Semantic HTML structure maintained

## Testing Devices

### Physical Devices (Recommended)
- [ ] iPhone SE (375px width)
- [ ] iPhone 12/13/14 (390px width)
- [ ] iPhone 14 Pro Max (430px width)
- [ ] Samsung Galaxy S21 (360px width)
- [ ] iPad Mini (768px width)
- [ ] iPad Pro (1024px width)

### Browser DevTools Testing
- [ ] Chrome DevTools device emulation
- [ ] Firefox Responsive Design Mode
- [ ] Safari Responsive Design Mode
- [ ] Test at exact breakpoint widths (375, 768, 1024)
- [ ] Test between breakpoints (400, 900)

## Browser Compatibility

- [ ] Chrome (mobile & desktop)
- [ ] Safari (iOS & macOS)
- [ ] Firefox (mobile & desktop)
- [ ] Edge (desktop)
- [ ] Samsung Internet (mobile)

## Dark Mode

- [ ] All pages work in dark mode at all breakpoints
- [ ] Contrast maintained in dark mode
- [ ] Images/videos appropriate in dark mode
- [ ] Shadows and borders visible in dark mode

## Sign-off

### Completed By
- Name: _______________
- Date: _______________
- Version: _______________

### Issues Found
Document any issues or deviations from the checklist:

1. 
2. 
3. 

### Screenshots
Attach screenshots at key breakpoints for critical pages:
- Home (375px, 768px, 1024px)
- Clip Detail (375px, 768px, 1024px)
- Search (375px, 768px, 1024px)
