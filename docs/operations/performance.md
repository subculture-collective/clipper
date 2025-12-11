<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Performance Optimizations](#performance-optimizations)
  - [Bundle Size & Code Splitting](#bundle-size--code-splitting)
    - [Route-Level Code Splitting](#route-level-code-splitting)
    - [Current Bundle Analysis](#current-bundle-analysis)
    - [Vendor Chunk Strategy](#vendor-chunk-strategy)
  - [Image Optimization](#image-optimization)
    - [Lazy Loading](#lazy-loading)
    - [Responsive Images](#responsive-images)
    - [Image Component Features](#image-component-features)
  - [Layout Shift Prevention (CLS)](#layout-shift-prevention-cls)
    - [Fixed Aspect Ratios](#fixed-aspect-ratios)
    - [Image Dimension Attributes](#image-dimension-attributes)
  - [Build Configuration](#build-configuration)
    - [Vite Optimizations](#vite-optimizations)
    - [Tree Shaking](#tree-shaking)
  - [Tailwind CSS v4 Migration](#tailwind-css-v4-migration)
    - [Custom Breakpoint Configuration](#custom-breakpoint-configuration)
  - [Testing Recommendations](#testing-recommendations)
    - [Lighthouse Audits](#lighthouse-audits)
    - [Core Web Vitals Targets](#core-web-vitals-targets)
    - [Bundle Size Analysis](#bundle-size-analysis)
  - [Future Improvements](#future-improvements)
    - [Potential Optimizations](#potential-optimizations)
    - [Monitoring](#monitoring)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Performance Optimizations"
summary: "This document outlines the performance optimizations implemented to improve Core Web Vitals (LCP, CL"
tags: ['operations']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Performance Optimizations

This document outlines the performance optimizations implemented to improve Core Web Vitals (LCP, CLS, INP) for the Clipper application.

## Bundle Size & Code Splitting

### Route-Level Code Splitting

- **Status**: ✅ Already Implemented
- All page components are lazy-loaded using React's `lazy()` and `Suspense`
- Pages are loaded on-demand as users navigate, reducing initial bundle size
- See `src/App.tsx` for implementation

### Current Bundle Analysis

**Initial bundle (before optimizations):**

- Main bundle: 878 kB (274 kB gzipped)
- Analytics chunk: 429 kB (112 kB gzipped) - auto-split due to lazy loading
- Route chunks: 0.25-18 kB each

**Lazy-loaded page bundles:**

- Each page is a separate chunk, loaded only when navigated to
- Analytics pages (AdminAnalyticsPage, CreatorAnalyticsPage, PersonalStatsPage) automatically split the Recharts library into a separate chunk

### Vendor Chunk Strategy

- Vite automatically handles vendor chunk splitting
- Large libraries like Recharts are only loaded when analytics pages are accessed
- Manual chunking configured in `vite.config.ts` for better caching (in progress)

## Image Optimization

### Lazy Loading

- **Status**: ✅ Implemented
- All images use `loading="lazy"` attribute for native browser lazy loading
- Images outside the viewport are loaded only when they come into view
- Reduces initial page load and bandwidth usage

**Components updated:**

- `TwitchEmbed.tsx`: Thumbnail images with lazy loading
- `Avatar.tsx`: User avatars with lazy loading
- `OptimizedImage.tsx`: New reusable component with lazy loading built-in

### Responsive Images

- **Status**: ✅ Implemented
- Images include explicit `width` and `height` attributes
- Prevents layout shifts by reserving space before image loads
- Supports responsive `sizes` attribute for different viewports

### Image Component Features

Created `OptimizedImage` component (`src/components/ui/OptimizedImage.tsx`) with:

- Lazy loading with `priority` prop for above-the-fold images
- Aspect ratio preservation to prevent CLS
- Blur placeholder support
- Error handling with fallback UI
- Automatic `decoding="async"` for better performance

## Layout Shift Prevention (CLS)

### Fixed Aspect Ratios

- **Status**: ✅ Implemented
- TwitchEmbed maintains 16:9 aspect ratio using `pt-[56.25%]`
- Space is reserved for embeds before they load
- Prevents content jumping when media loads

### Image Dimension Attributes

- All images have explicit width/height or aspect-ratio
- Browser can calculate space before image downloads
- Reduces Cumulative Layout Shift (CLS) score

## Build Configuration

### Vite Optimizations

Location: `frontend/vite.config.ts`

**Configured optimizations:**

1. **Source Maps**: Enabled for production debugging
2. **Chunk Size Warning**: Increased to 600 kB for optimized chunks
3. **Minification**: Using esbuild (faster than Terser)
4. **Bundle Analyzer**: rollup-plugin-visualizer for size analysis

### Tree Shaking

- Vite/Rollup automatically removes unused code
- ES modules enable effective tree shaking
- Named imports preferred over default imports

## Tailwind CSS v4 Migration

### Custom Breakpoint Configuration

- **Status**: ✅ Implemented
- Added custom `xs` breakpoint (375px) for mobile devices
- Configured using `@custom-variant` in `src/index.css`
- Ensures responsive design works across all screen sizes

## Testing Recommendations

### Lighthouse Audits

Run Lighthouse audits on key pages:

```bash
# Install Lighthouse CLI
npm install -g @lhci/cli

# Run audit on homepage
lhci autorun --collect.url=http://localhost:5173/

# Run audit on clip detail page
lhci autorun --collect.url=http://localhost:5173/clip/1
```

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s (Good)
- **CLS (Cumulative Layout Shift)**: < 0.1 (Good)
- **INP (Interaction to Next Paint)**: < 200ms (Good)

### Bundle Size Analysis

```bash
# Build with analyzer
npm run build

# Check dist/stats.html for bundle visualization
```

## Future Improvements

### Potential Optimizations

1. **Image CDN**: Use a CDN with automatic image optimization (WebP, AVIF)
2. **Font Optimization**: Preload critical fonts, use font-display: swap
3. **Service Worker**: Implement caching strategy for offline support
4. **Critical CSS**: Inline above-the-fold CSS
5. **Prefetching**: Prefetch likely navigation targets
6. **Virtual Scrolling**: For long lists (feed pages)
7. **Web Workers**: Offload heavy computations

### Monitoring

Consider adding:

- Real User Monitoring (RUM) for Core Web Vitals
- Performance budgets in CI/CD
- Automated Lighthouse CI checks

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [React Lazy Loading](https://react.dev/reference/react/lazy)
- [Image Optimization](https://web.dev/fast/#optimize-your-images)
