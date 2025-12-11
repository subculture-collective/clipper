---
title: "Mobile-First CSS Changes - Visual Examples"
summary: "This document provides before/after examples of the key responsive design improvements."
tags: ['mobile']
area: "mobile"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Mobile-First CSS Changes - Visual Examples

This document provides before/after examples of the key responsive design improvements.

## ClipCard Component

### Before: Desktop-First Layout

```tsx
<div className='flex gap-4 p-4'>
  {/* Vote sidebar - always vertical */}
  <div className='shrink-0 flex flex-col items-center w-10 gap-2'>
    <button className='w-8 h-8'>↑</button>
    <span>42</span>
    <button className='w-8 h-8'>↓</button>
  </div>
  <div className='flex-1 min-w-0'>
    {/* Content */}
  </div>
</div>
```

**Issues:**

- 32px buttons (below 44px touch target minimum)
- Vertical vote buttons waste vertical space on mobile
- Fixed 16px padding doesn't scale well on small screens
- No gap adjustments for mobile

### After: Mobile-First Layout

```tsx
<div className='flex flex-col xs:flex-row gap-3 xs:gap-4 p-3 xs:p-4'>
  {/* Vote sidebar - horizontal on mobile, vertical on larger */}
  <div className='flex xs:flex-col items-center xs:items-start
                  order-2 xs:order-1 shrink-0'>
    <button className='w-11 h-11 xs:w-10 xs:h-10 touch-target'>↑</button>
    <span className='min-w-[2rem] text-center'>42</span>
    <button className='w-11 h-11 xs:w-10 xs:h-10 touch-target'>↓</button>
  </div>
  <div className='flex-1 min-w-0 order-1 xs:order-2'>
    {/* Content */}
  </div>
</div>
```

**Improvements:**

- ✅ 44px buttons meet touch target guidelines
- ✅ Horizontal vote buttons on mobile save vertical space
- ✅ Content appears first on mobile (order-1)
- ✅ Responsive padding (12px → 16px at xs breakpoint)
- ✅ Responsive gaps (12px → 16px)

**Visual Layout:**

```
Mobile (≤375px):
┌─────────────────────────┐
│ [Thumbnail/Video]       │
│                         │
│ Clip Title Goes Here    │
│ creator • game • time   │
│ [Tags]                  │
│                         │
│ [↑] 42 [↓] [💬] [❤] [⚐]│
└─────────────────────────┘

Desktop (≥375px):
┌───┬─────────────────────┐
│[↑]│ [Thumbnail/Video]   │
│ 42│                     │
│[↓]│ Clip Title          │
│   │ creator • game      │
│   │ [Tags]              │
│   │ [💬] [❤] [⚐]       │
└───┴─────────────────────┘
```

## Search Page Tabs

### Before: Fixed Horizontal Layout

```tsx
<div className='flex items-center justify-between mb-6'>
  <div className='flex gap-1'>
    {tabs.map((tab) => (
      <button className='px-4 py-2'>{tab.label}</button>
    ))}
  </div>
  <select className='px-3 py-1.5'>...</select>
</div>
```

**Issues:**

- Tabs can overflow on narrow screens
- Sort dropdown in same row causes cramping
- No touch target optimization
- Fixed 6px spacing too large on mobile

### After: Responsive Layout

```tsx
<div className='flex flex-col xs:flex-row xs:items-center
                xs:justify-between gap-3 xs:gap-0 mb-4 xs:mb-6'>
  <div className='flex gap-0.5 xs:gap-1 overflow-x-auto scrollbar-hide'>
    {tabs.map((tab) => (
      <button className='px-3 xs:px-4 py-2 touch-target
                        whitespace-nowrap text-sm xs:text-base'>
        {tab.label}
      </button>
    ))}
  </div>
  <select className='px-3 py-2 text-sm touch-target'>...</select>
</div>
```

**Improvements:**

- ✅ Tabs scroll horizontally on mobile
- ✅ Sort dropdown stacks below tabs on mobile
- ✅ Touch targets met (44px height)
- ✅ Responsive spacing (mb-4 → mb-6)
- ✅ Smaller text/padding on mobile

**Visual Layout:**

```
Mobile (≤375px):
┌─────────────────────────┐
│ [All][Clips][Creators]→ │
│                         │
│ [Sort: Relevance ▼]     │
└─────────────────────────┘

Desktop (≥375px):
┌─────────────────────────┐
│ [All][Clips][Creators]  │
│                 [Sort ▼]│
└─────────────────────────┘
```

## Profile Page Header

### Before: Side-by-Side Only

```tsx
<div className='flex items-start gap-6'>
  <div className='shrink-0'>
    <img className='w-24 h-24' />
  </div>
  <div className='flex-1'>
    <h1 className='text-3xl'>Display Name</h1>
    <p>@username</p>
    <Button>Reauthorize</Button>
  </div>
</div>
```

**Issues:**

- Avatar and info cramped on mobile
- Large avatar (96px) takes horizontal space
- Fixed text sizes don't scale
- Button may wrap awkwardly

### After: Stacked on Mobile

```tsx
<div className='flex flex-col xs:flex-row items-start gap-4 xs:gap-6'>
  <div className='shrink-0 mx-auto xs:mx-0'>
    <img className='w-20 h-20 xs:w-24 xs:h-24' />
  </div>
  <div className='flex-1 w-full text-center xs:text-left'>
    <div className='flex flex-col xs:flex-row items-center
                    xs:items-start justify-between gap-3 xs:gap-0'>
      <div>
        <h1 className='text-2xl xs:text-3xl'>Display Name</h1>
        <p className='text-sm xs:text-base'>@username</p>
      </div>
      <Button className='w-full xs:w-auto'>Reauthorize</Button>
    </div>
  </div>
</div>
```

**Improvements:**

- ✅ Avatar centered on mobile, left-aligned on desktop
- ✅ Smaller avatar on mobile (80px → 96px)
- ✅ Text centered on mobile, left on desktop
- ✅ Full-width button on mobile
- ✅ Responsive text sizes

**Visual Layout:**

```
Mobile (≤375px):
┌─────────────────────────┐
│        [Avatar]         │
│                         │
│     Display Name        │
│      @username          │
│                         │
│ [Reauthorize w/Twitch] │
│                         │
│ Karma: 1,234 | Joined  │
└─────────────────────────┘

Desktop (≥375px):
┌─────────────────────────┐
│ [Avatar] Display Name   │
│          @username      │
│          [Reauthorize]  │
│                         │
│ Karma: 1,234 | Joined  │
└─────────────────────────┘
```

## Button Component Touch Targets

### Before: Inconsistent Heights

```tsx
const sizeClasses = {
  sm: 'px-3 py-1.5',  // ~38px height
  md: 'px-4 py-2',    // ~40px height
  lg: 'px-6 py-3',    // ~48px height
}
```

**Issues:**

- Small and medium buttons below 44px minimum
- No explicit height constraints
- Padding-based sizing unreliable

### After: Guaranteed Minimums

```tsx
const sizeClasses = {
  sm: 'px-3 py-2 min-h-[44px]',    // ≥44px
  md: 'px-4 py-2.5 min-h-[44px]',  // ≥44px
  lg: 'px-6 py-3 min-h-[48px]',    // ≥48px
}
```

**Improvements:**

- ✅ All sizes meet WCAG touch target guidelines
- ✅ Explicit minimum heights
- ✅ Slightly increased padding for better balance
- ✅ Large buttons get extra height

## Typography Scaling

### Before: Fixed Sizes with Large Jump

```tsx
h1 { @apply text-4xl lg:text-5xl; }  // 36px → 48px
h2 { @apply text-3xl lg:text-4xl; }  // 30px → 36px
h3 { @apply text-2xl lg:text-3xl; }  // 24px → 30px
```

**Issues:**

- Too large on small mobile (375px)
- Only two breakpoints (base, lg)
- Sudden size jumps

### After: Progressive Enhancement

```tsx
h1 { @apply text-3xl xs:text-4xl lg:text-5xl; }  // 30px → 36px → 48px
h2 { @apply text-2xl xs:text-3xl lg:text-4xl; }  // 24px → 30px → 36px
h3 { @apply text-xl xs:text-2xl lg:text-3xl; }   // 20px → 24px → 30px
```

**Improvements:**

- ✅ Smaller sizes on mobile fit better
- ✅ Three-step progression (mobile, xs, lg)
- ✅ Smoother transitions
- ✅ More appropriate for 375px screens

## Container Padding

### Before: Two-Step Padding

```tsx
className='w-full px-4 sm:px-6 lg:px-8'
// Mobile: 16px
// sm+: 24px
// lg+: 32px
```

**Issues:**

- 16px too large on 375px screens
- Only two transitions
- Large jump from 16px to 24px

### After: Four-Step Padding

```tsx
className='w-full px-3 xs:px-4 sm:px-6 lg:px-8'
// Mobile: 12px
// xs: 16px
// sm: 24px
// lg: 32px
```

**Improvements:**

- ✅ More appropriate 12px on smallest screens
- ✅ Four-step progression
- ✅ Smoother transitions
- ✅ Better use of limited screen space

## Spacing Scale Comparison

| Element | Before | After | Why Changed |
|---------|--------|-------|-------------|
| Container padding | 16px | 12px → 16px | More space for content on 375px |
| Section margin | 24px | 16px → 24px → 32px | Progressive enhancement |
| Button padding | 8px 16px | 8px 12px → 16px | Responsive horizontal padding |
| Card padding | 16px | 12px → 16px | More content on mobile |
| Element gap | 16px | 12px → 16px | Tighter spacing on mobile |

## Touch Target Examples

### Interactive Elements Comparison

| Element | Before | After | Status |
|---------|--------|-------|--------|
| Button (sm) | 38px | 44px | ✅ Fixed |
| Button (md) | 40px | 44px | ✅ Fixed |
| Input field | 40px | 44px | ✅ Fixed |
| Vote button | 32px | 44px | ✅ Fixed |
| Icon button | Varies | 44px | ✅ Fixed |
| Select dropdown | 38px | 44px | ✅ Fixed |

### Touch Target Spacing

```
Before (Insufficient):
[Button] [Button] [Button]
  ←4px→   ←4px→

After (Adequate):
[Button] [Button] [Button]
  ←12px→   ←12px→
```

**Improvements:**

- ✅ Minimum 8px spacing between targets
- ✅ Typically 12-16px for comfort
- ✅ Prevents accidental taps

## Safe Area Support

### Implementation

```css
/* Utility classes for iOS safe areas */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
/* ... left, right, inset (all) */
```

### Usage Example

```tsx
// Header that respects status bar/notch
<header className="safe-area-top">
  {/* Content */}
</header>

// Footer that respects home indicator
<footer className="safe-area-bottom">
  {/* Content */}
</footer>
```

**Benefits:**

- ✅ Content doesn't hide behind notch
- ✅ Tap targets clear of gesture areas
- ✅ Graceful degradation on older devices
- ✅ Works on both iOS and Android

## Overflow Prevention

### Before: Possible Overflow

```css
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

h1, h2, h3 {
  @apply font-semibold tracking-tight;
}
```

**Issues:**

- No overflow-x prevention
- No word wrapping on long text
- Possible horizontal scroll

### After: Overflow Protected

```css
body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  overflow-x: hidden;
}

h1, h2, h3 {
  @apply font-semibold tracking-tight;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

**Improvements:**

- ✅ Body prevents horizontal scroll
- ✅ Long words break properly
- ✅ Text never overflows container

## Testing Checklist

Use these visual examples to verify the implementation:

### ClipCard

- [ ] Vote buttons horizontal on mobile, vertical on desktop
- [ ] All buttons are 44px minimum
- [ ] Content appears before votes on mobile
- [ ] Proper spacing at all breakpoints

### Search Page

- [ ] Tabs scroll horizontally on mobile
- [ ] Sort dropdown stacks on mobile
- [ ] Touch targets meet 44px minimum
- [ ] Responsive text sizes

### Profile Page

- [ ] Avatar centered on mobile
- [ ] Text centered on mobile
- [ ] Full-width button on mobile
- [ ] Proper layout on desktop

### General

- [ ] No horizontal scroll at any width
- [ ] Typography scales appropriately
- [ ] Touch targets meet guidelines
- [ ] Spacing appropriate at all breakpoints

---

For comprehensive testing, use the full checklist in `MOBILE_RESPONSIVE_QA.md`.
