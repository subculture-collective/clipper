# Ad Slot Specification

**Status**: Pending Approval
**Last Updated**: 2025-12-04
**Owner**: Product Team
**Stakeholders**: Engineering, Marketing, Monetization

## Executive Summary

This document defines the ad slot taxonomy, placements, sizes, breakpoints, and fallback behavior for the Clipper
platform. The specification covers all ad placements across web (desktop and mobile responsive) and native mobile
applications (iOS and Android).

## Table of Contents

- [Overview](#overview)
- [Ad Slot Taxonomy](#ad-slot-taxonomy)
- [Slot Definitions](#slot-definitions)
  - [Home Feed Ads](#home-feed-ads)
  - [Clip Detail Page Ads](#clip-detail-page-ads)
  - [Comments Section Ads](#comments-section-ads)
  - [Creator Page Ads](#creator-page-ads)
  - [Search Results Ads](#search-results-ads)
  - [Sidebar Ads](#sidebar-ads)
- [Placement Map](#placement-map)
  - [Web Placements](#web-placements)
  - [Mobile App Placements](#mobile-app-placements)
- [Breakpoint Specifications](#breakpoint-specifications)
- [Fallback Rules](#fallback-rules)
- [Premium User Handling](#premium-user-handling)
- [Implementation Guidelines](#implementation-guidelines)
- [Performance Requirements](#performance-requirements)
- [Approval and Signoff](#approval-and-signoff)

## Overview

### Objectives

1. **Revenue Generation**: Establish sustainable ad revenue to support platform operations
2. **User Experience**: Balance monetization with a pleasant user experience
3. **Brand Safety**: Ensure appropriate ad content for the gaming/streaming audience
4. **Performance**: Minimize impact on page load and interaction performance
5. **Compliance**: Adhere to privacy regulations (GDPR, CCPA) and industry standards

### Principles

- **Non-intrusive**: Ads should complement, not disrupt, the content experience
- **Contextual**: Place ads in natural breaks within content flow
- **Responsive**: Ads adapt seamlessly across all device sizes
- **Performant**: Lazy-load ads below the fold; prioritize content
- **Accessible**: Ad containers meet WCAG 2.1 AA accessibility standards

## Ad Slot Taxonomy

### Slot Naming Convention

All ad slots follow this naming pattern:

```
clipper_{page}_{position}_{size}
```

**Examples:**
- `clipper_home_feed_inline_medium`
- `clipper_clip_detail_sidebar_large`
- `clipper_search_results_top_leaderboard`

### Slot Categories

| Category | Description | Frequency |
|----------|-------------|-----------|
| **Display** | Standard banner and rectangle ads | Variable by page |
| **In-Feed** | Ads interspersed within content feeds | Every N items |
| **Video** | Pre-roll or companion ads for video content | Optional |
| **Sticky** | Fixed-position ads (mobile footer, etc.) | 1 per page max |

## Slot Definitions

### Home Feed Ads

The home feed displays a curated list of clips. In-feed ads appear at regular intervals.

#### `clipper_home_feed_inline` (In-Feed Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_home_feed_inline` |
| **Type** | Native/Display |
| **Position** | After every 5th clip in the feed |
| **Max per page** | 4 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 300x250 | Medium Rectangle |
| Tablet (640-1024px) | 336x280 | Large Rectangle |
| Desktop (>1024px) | 336x280 | Large Rectangle |

**Styling Requirements:**
- Ad container matches clip card styling with subtle "Ad" label
- Border radius: 8px
- Background: Matches theme (light/dark mode support)
- Label: "Sponsored" or "Ad" in top-left corner

---

#### `clipper_home_top_leaderboard` (Top Banner)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_home_top_leaderboard` |
| **Type** | Display |
| **Position** | Above the clip feed, below navigation |
| **Max per page** | 1 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 320x50 | Mobile Leaderboard |
| Tablet (640-1024px) | 728x90 | Leaderboard |
| Desktop (>1024px) | 970x90 | Large Leaderboard |

**Visibility Rules:**
- Visible on page load (above the fold)
- Collapses if no fill (no empty space shown)

---

### Clip Detail Page Ads

Individual clip pages feature ads alongside the video player and in the comments area.

#### `clipper_clip_detail_sidebar` (Sidebar Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_clip_detail_sidebar` |
| **Type** | Display |
| **Position** | Right sidebar, below clip metadata |
| **Max per page** | 2 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | Hidden | N/A (no sidebar on mobile) |
| Tablet (640-1024px) | 300x250 | Medium Rectangle |
| Desktop (>1024px) | 300x600 | Half Page |

**Behavior:**
- First ad loads immediately
- Second ad lazy-loads on scroll (50% viewport intersection)

---

#### `clipper_clip_detail_below_player` (Below Player Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_clip_detail_below_player` |
| **Type** | Display |
| **Position** | Below video player, above comments |
| **Max per page** | 1 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 320x100 | Large Mobile Banner |
| Tablet (640-1024px) | 728x90 | Leaderboard |
| Desktop (>1024px) | 728x90 | Leaderboard |

---

### Comments Section Ads

Ads placed within comment threads to monetize high-engagement areas.

#### `clipper_comments_inline` (In-Comments Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_comments_inline` |
| **Type** | Native/Display |
| **Position** | After the 3rd top-level comment |
| **Max per page** | 1 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 300x250 | Medium Rectangle |
| Tablet (640-1024px) | 336x280 | Large Rectangle |
| Desktop (>1024px) | 336x280 | Large Rectangle |

**Visibility Rules:**
- Only loads if there are 3+ comments
- Lazy-loads on scroll (50% viewport intersection)
- Does not appear in collapsed/nested replies

---

### Creator Page Ads

Creator profile and analytics pages feature ads that support creator monetization potential.

#### `clipper_creator_header` (Creator Header Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_creator_header` |
| **Type** | Display |
| **Position** | Below creator banner/header, above clips |
| **Max per page** | 1 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 320x50 | Mobile Leaderboard |
| Tablet (640-1024px) | 728x90 | Leaderboard |
| Desktop (>1024px) | 970x90 | Large Leaderboard |

---

#### `clipper_creator_clips_inline` (Creator Clips In-Feed Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_creator_clips_inline` |
| **Type** | Native/Display |
| **Position** | After every 6th clip in creator's clip list |
| **Max per page** | 2 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 300x250 | Medium Rectangle |
| Tablet (640-1024px) | 336x280 | Large Rectangle |
| Desktop (>1024px) | 336x280 | Large Rectangle |

---

### Search Results Ads

Ads displayed within search results to monetize discovery flows.

#### `clipper_search_top` (Search Results Top Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_search_top` |
| **Type** | Display |
| **Position** | Above search results, below search bar |
| **Max per page** | 1 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 320x50 | Mobile Leaderboard |
| Tablet (640-1024px) | 728x90 | Leaderboard |
| Desktop (>1024px) | 970x90 | Large Leaderboard |

---

#### `clipper_search_results_inline` (Search Results In-Feed Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_search_results_inline` |
| **Type** | Native/Display |
| **Position** | After every 4th search result |
| **Max per page** | 3 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | 300x250 | Medium Rectangle |
| Tablet (640-1024px) | 336x280 | Large Rectangle |
| Desktop (>1024px) | 336x280 | Large Rectangle |

---

### Sidebar Ads

Persistent sidebar ads on desktop layouts.

#### `clipper_sidebar_sticky` (Sticky Sidebar Ad)

| Property | Value |
|----------|-------|
| **Slot ID** | `clipper_sidebar_sticky` |
| **Type** | Display |
| **Position** | Right sidebar, sticky on scroll |
| **Max per page** | 1 |

**Sizes by Breakpoint:**

| Breakpoint | Size (WxH) | Format |
|------------|------------|--------|
| Mobile (<640px) | Hidden | N/A |
| Tablet (640-1024px) | Hidden | N/A |
| Desktop (>1024px) | 300x250 | Medium Rectangle |

**Behavior:**
- Sticky positioning starts after scrolling past the first viewport
- Stops sticking before footer (100px buffer)

---

## Placement Map

### Web Placements

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Navigation Bar                             │
├─────────────────────────────────────────────────────────────────────┤
│               clipper_home_top_leaderboard (970x90)                 │
├──────────────────────────────────────────────┬──────────────────────┤
│                                              │                      │
│   ┌─────────────────────────────────────┐   │  ┌────────────────┐  │
│   │          Clip Card 1                │   │  │                │  │
│   └─────────────────────────────────────┘   │  │   Sidebar Ad   │  │
│   ┌─────────────────────────────────────┐   │  │   (300x600)    │  │
│   │          Clip Card 2                │   │  │                │  │
│   └─────────────────────────────────────┘   │  │                │  │
│   ┌─────────────────────────────────────┐   │  │                │  │
│   │          Clip Card 3                │   │  └────────────────┘  │
│   └─────────────────────────────────────┘   │                      │
│   ┌─────────────────────────────────────┐   │  ┌────────────────┐  │
│   │          Clip Card 4                │   │  │                │  │
│   └─────────────────────────────────────┘   │  │  Sticky Ad     │  │
│   ┌─────────────────────────────────────┐   │  │  (300x250)     │  │
│   │          Clip Card 5                │   │  │                │  │
│   └─────────────────────────────────────┘   │  └────────────────┘  │
│   ┌─────────────────────────────────────┐   │                      │
│   │    In-Feed Ad (336x280) [Ad]        │   │                      │
│   └─────────────────────────────────────┘   │                      │
│   ┌─────────────────────────────────────┐   │                      │
│   │          Clip Card 6                │   │                      │
│   └─────────────────────────────────────┘   │                      │
│                   ...                        │                      │
└──────────────────────────────────────────────┴──────────────────────┘
```

**Home Feed (Web Desktop)**

| Slot | Position | Size | Priority |
|------|----------|------|----------|
| `clipper_home_top_leaderboard` | Above feed | 970x90 | High |
| `clipper_home_feed_inline` (x4) | Every 5th item | 336x280 | Medium |
| `clipper_sidebar_sticky` | Right sidebar | 300x250 | Low |

---

**Clip Detail Page (Web Desktop)**

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Navigation Bar                             │
├──────────────────────────────────────────────┬──────────────────────┤
│                                              │                      │
│   ┌─────────────────────────────────────┐   │  Clip Metadata       │
│   │                                      │   │  - Title             │
│   │           Video Player               │   │  - Creator           │
│   │           (Twitch Embed)             │   │  - Views/Votes       │
│   │                                      │   │                      │
│   └─────────────────────────────────────┘   │  ┌────────────────┐  │
│                                              │  │   Sidebar Ad   │  │
│   clipper_clip_detail_below_player (728x90) │  │   (300x600)    │  │
│                                              │  │                │  │
│   ┌─────────────────────────────────────┐   │  └────────────────┘  │
│   │          Comments Section            │   │                      │
│   │  - Comment 1                         │   │  ┌────────────────┐  │
│   │  - Comment 2                         │   │  │  Sidebar Ad 2  │  │
│   │  - Comment 3                         │   │  │  (300x250)     │  │
│   │  ┌─────────────────────────────┐    │   │  │                │  │
│   │  │ In-Comments Ad (336x280)    │    │   │  └────────────────┘  │
│   │  └─────────────────────────────┘    │   │                      │
│   │  - Comment 4                         │   │                      │
│   │  - Comment 5                         │   │                      │
│   │  ...                                 │   │                      │
│   └─────────────────────────────────────┘   │                      │
└──────────────────────────────────────────────┴──────────────────────┘
```

| Slot | Position | Size | Priority |
|------|----------|------|----------|
| `clipper_clip_detail_below_player` | Below player | 728x90 | High |
| `clipper_clip_detail_sidebar` (x2) | Right sidebar | 300x600, 300x250 | Medium |
| `clipper_comments_inline` | After 3rd comment | 336x280 | Low |

---

### Mobile App Placements

**Home Feed (iOS/Android)**

```
┌────────────────────────────┐
│       Navigation Bar       │
├────────────────────────────┤
│  Mobile Leaderboard        │
│  (320x50)                  │
├────────────────────────────┤
│                            │
│  ┌──────────────────────┐  │
│  │     Clip Card 1      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Clip Card 2      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Clip Card 3      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Clip Card 4      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Clip Card 5      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  In-Feed Ad          │  │
│  │  (300x250) [Ad]      │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Clip Card 6      │  │
│  └──────────────────────┘  │
│          ...               │
│                            │
├────────────────────────────┤
│       Tab Navigation       │
└────────────────────────────┘
```

| Slot | Position | Size | SDK |
|------|----------|------|-----|
| `clipper_home_top_leaderboard` | Top of feed | 320x50 | AdMob Banner |
| `clipper_home_feed_inline` (x4) | Every 5th item | 300x250 | AdMob Native |

---

**Clip Detail (iOS/Android)**

```
┌────────────────────────────┐
│   ← Back    Clip Title     │
├────────────────────────────┤
│                            │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │    Video Player      │  │
│  │    (Full Width)      │  │
│  │                      │  │
│  └──────────────────────┘  │
│                            │
│  Clip Metadata             │
│  - Creator: @username      │
│  - 1.2K views • 234 votes  │
│                            │
├────────────────────────────┤
│  Below Player Ad (320x100) │
├────────────────────────────┤
│                            │
│  Comments (24)             │
│  ┌──────────────────────┐  │
│  │     Comment 1        │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Comment 2        │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Comment 3        │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │ In-Comments Ad       │  │
│  │ (300x250) [Ad]       │  │
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │     Comment 4        │  │
│  └──────────────────────┘  │
│          ...               │
│                            │
└────────────────────────────┘
```

| Slot | Position | Size | SDK |
|------|----------|------|-----|
| `clipper_clip_detail_below_player` | Below player | 320x100 | AdMob Banner |
| `clipper_comments_inline` | After 3rd comment | 300x250 | AdMob Native |

---

## Breakpoint Specifications

### Web Breakpoints

| Name | Range | Layout | Ad Behavior |
|------|-------|--------|-------------|
| **Mobile** | <640px | Single column, no sidebar | Smaller ad units, inline only |
| **Tablet** | 640-1024px | Two columns, optional sidebar | Standard units, limited sidebar |
| **Desktop** | >1024px | Multi-column with sidebar | Full ad inventory available |
| **Large Desktop** | >1440px | Expanded layout | Large format ads (970px wide) |

### Mobile App Breakpoints

| Device Type | Screen Width | Ad Sizes |
|-------------|--------------|----------|
| **iPhone SE/Mini** | 375px | 320x50, 300x250 |
| **iPhone Standard** | 390-428px | 320x50, 300x250, 320x100 |
| **iPhone Pro Max** | 430px+ | 320x50, 336x280, 320x100 |
| **iPad Mini** | 744px | 728x90, 300x250 |
| **iPad** | 820px+ | 728x90, 336x280, 300x600 |
| **Android Phone** | 360-411px | 320x50, 300x250 |
| **Android Tablet** | 600px+ | 728x90, 336x280 |

---

## Fallback Rules

### Empty Inventory Handling

When an ad slot cannot be filled (no demand, timeout, error), apply these fallback rules:

| Scenario | Fallback Behavior | Visual Treatment |
|----------|-------------------|------------------|
| **No fill** | Collapse slot | Container height → 0, no placeholder |
| **Timeout (>3s)** | Collapse slot | Remove ad container entirely |
| **Error** | Log error, collapse | Remove container, report to analytics |
| **Blocked by user** | Respect choice | Show subtle "support us" message (optional) |

### Fallback Priority

1. **Primary**: Direct sold campaigns (highest eCPM)
2. **Secondary**: Programmatic demand (RTB/header bidding)
3. **Tertiary**: House ads (promote premium subscription)
4. **Final**: Collapse (no visual impact)

### House Ad Creatives

When programmatic demand is unavailable, show house ads promoting:

| House Ad | Target | Creative |
|----------|--------|----------|
| Pro Upgrade | Free users | "Go ad-free with Clipper Pro" |
| Mobile App | Web users | "Download the Clipper app" |
| Submit Clips | All users | "Share your favorite clips" |

### Collapse Behavior by Slot Type

| Slot Type | Collapse Method |
|-----------|-----------------|
| **Leaderboard** | Smooth height transition to 0 (200ms) |
| **In-Feed** | Remove DOM element, shift content |
| **Sidebar** | Collapse container, maintain layout |
| **Sticky** | Hide entirely (display: none) |

---

## Premium User Handling

### Ad-Free Experience

Pro subscribers receive an ad-free experience. Implementation details:

| Behavior | Implementation |
|----------|----------------|
| **No ad requests** | Skip ad SDK initialization for Pro users |
| **No placeholders** | Ad containers not rendered in DOM |
| **Layout stability** | No layout shift from missing ads |
| **Analytics** | Track "ad_suppressed" events for reporting |

### Entitlement Check

```typescript
// Pseudo-code for ad visibility
function shouldShowAds(user: User): boolean {
  if (!user) return true; // Anonymous users see ads
  if (user.subscription?.tier === 'pro') return false;
  if (user.subscription?.tier === 'team') return false;
  if (user.subscription?.tier === 'enterprise') return false;
  return true;
}
```

### Grace Period

When a subscription lapses:

| Period | Behavior |
|--------|----------|
| **0-3 days** | Grace period, ads remain suppressed |
| **3-7 days** | Warning banner, ads begin showing |
| **7+ days** | Full ad experience restored |

---

## Implementation Guidelines

### Frontend Integration (Web)

**React Component Pattern:**

```tsx
// AdSlot component (conceptual)
interface AdSlotProps {
  slotId: string;
  sizes: Array<[number, number]>;
  className?: string;
  lazyLoad?: boolean;
}

function AdSlot({ slotId, sizes, className, lazyLoad = false }: AdSlotProps) {
  const { isPro } = useSubscription();
  
  if (isPro) return null;
  
  return (
    <div 
      className={cn("ad-container", className)}
      data-slot-id={slotId}
      data-sizes={JSON.stringify(sizes)}
      data-lazy={lazyLoad}
    />
  );
}
```

### Mobile Integration (React Native)

**AdMob Integration:**

| Ad Type | Component | Notes |
|---------|-----------|-------|
| Banner | `BannerAd` | Fixed position banners |
| Native | `NativeAd` | In-feed native ads |
| Interstitial | `InterstitialAd` | Between-screen ads (sparingly) |

### Third-Party Ad Networks

**Recommended Partners:**

| Partner | Use Case | Priority |
|---------|----------|----------|
| **Google AdSense** | Web display | Primary |
| **Google AdMob** | Mobile apps | Primary |
| **Amazon Publisher Services** | Header bidding | Secondary |
| **Prebid.js** | Header bidding | Secondary |

### Privacy Compliance

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **GDPR** | Consent before personalized ads | CMP integration (Consent Management Platform) |
| **CCPA** | Opt-out of sale | "Do Not Sell" link in footer |
| **COPPA** | No targeting for under-13 | Age gate / no user targeting |
| **ATT (iOS)** | App Tracking Transparency | ATT prompt before ad load |

---

## Performance Requirements

### Core Web Vitals Impact

| Metric | Target | Mitigation |
|--------|--------|------------|
| **LCP** | <2.5s | Reserve ad space, async load |
| **FID** | <100ms | Defer ad scripts |
| **CLS** | <0.1 | Fixed-size containers |

### Loading Strategy

| Priority | Slot Types | Strategy |
|----------|------------|----------|
| **High** | Above-fold leaderboards | Load on page init |
| **Medium** | First in-feed ad | Load after initial render |
| **Low** | Below-fold, sidebar | Lazy load on intersection |

### Performance Budgets

| Resource | Budget |
|----------|--------|
| Ad script size | <100KB (gzipped) |
| Ad load time | <2s (above fold) |
| Ad render time | <500ms |
| Max concurrent ad requests | 3 |

---

## Metrics and Reporting

### Key Ad Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Fill Rate** | Percentage of ad requests filled | >80% |
| **Viewability** | Ads seen by users (IAB standard) | >70% |
| **eCPM** | Effective cost per thousand impressions | Market rate |
| **CTR** | Click-through rate | >0.5% |
| **Revenue per Session** | Ad revenue per user session | Track and optimize |

### Analytics Events

| Event | Payload | When Fired |
|-------|---------|------------|
| `ad_request` | slot_id, page, sizes | Ad requested |
| `ad_fill` | slot_id, creative_id, eCPM | Ad filled |
| `ad_no_fill` | slot_id, reason | No ad available |
| `ad_impression` | slot_id, viewability | Ad viewed |
| `ad_click` | slot_id, creative_id | Ad clicked |
| `ad_suppressed` | slot_id, reason | Pro user, ad blocked |

---

## Approval and Signoff

### Document Status

| Status | Description |
|--------|-------------|
| **Draft** | Initial specification created |
| **Review** | Under stakeholder review |
| **Approved** | Ready for implementation |
| **Implemented** | Live in production |

**Current Status**: Draft - Pending Review

### Stakeholder Signoff

| Role | Name | Status | Date | Notes |
|------|------|--------|------|-------|
| Product Lead | — | Pending | — | Approve ad placements |
| Engineering Lead | — | Pending | — | Technical feasibility |
| Design Lead | — | Pending | — | UX/visual approval |
| Monetization Lead | — | Pending | — | Revenue strategy |
| Legal/Privacy | — | Pending | — | Compliance review |

### Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-04 | Copilot | Initial specification document |

---

## Related Documentation

- **[Premium Tiers](./PREMIUM_TIERS.md)** - Ad-free tier benefits
- **[Entitlement Matrix](./ENTITLEMENT_MATRIX.md)** - Feature gates including ads
- **[Analytics System](./ANALYTICS.md)** - Event tracking infrastructure
- **[Mobile Architecture](./MOBILE_ARCHITECTURE.md)** - Mobile app structure
- **[Frontend Architecture](./frontend/architecture.md)** - Web frontend patterns
- **[Performance Guide](./PERFORMANCE.md)** - Performance requirements

---

**For questions or feedback**, create an issue with the `ads` or `monetization` label.

**Related Issue**: Ads: Define ad slot taxonomy and placements
