<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Testing Performance Improvements](#testing-performance-improvements)
  - [Quick Start](#quick-start)
    - [1. Build the Production Bundle](#1-build-the-production-bundle)
    - [2. Preview the Production Build](#2-preview-the-production-build)
  - [Measuring Performance](#measuring-performance)
    - [Option 1: Chrome DevTools (Recommended)](#option-1-chrome-devtools-recommended)
    - [Option 2: Lighthouse CI (Command Line)](#option-2-lighthouse-ci-command-line)
    - [Option 3: Web Vitals Extension](#option-3-web-vitals-extension)
    - [Option 4: PageSpeed Insights (Live Site Only)](#option-4-pagespeed-insights-live-site-only)
  - [What to Test](#what-to-test)
    - [Critical Pages to Test](#critical-pages-to-test)
    - [Specific Improvements to Verify](#specific-improvements-to-verify)
  - [Analyzing Bundle Size](#analyzing-bundle-size)
    - [Visualize Bundle Composition](#visualize-bundle-composition)
    - [Check Bundle Report](#check-bundle-report)
  - [Performance Benchmarks](#performance-benchmarks)
    - [Before Optimizations](#before-optimizations)
    - [After Optimizations](#after-optimizations)
  - [Troubleshooting](#troubleshooting)
    - [Bundle Still Large?](#bundle-still-large)
    - [Layout Shifts Occurring?](#layout-shifts-occurring)
    - [Slow Load Times?](#slow-load-times)
  - [Continuous Monitoring](#continuous-monitoring)
    - [Set Up Performance Budgets](#set-up-performance-budgets)
    - [Automate Testing in CI/CD](#automate-testing-in-cicd)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Testing Performance Improvements"
summary: "This guide explains how to verify the performance improvements and measure Core Web Vitals."
tags: ['backend', 'testing']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Testing Performance Improvements

This guide explains how to verify the performance improvements and measure Core Web Vitals.

## Quick Start

### 1. Build the Production Bundle

```bash
cd frontend
npm run build
```

### 2. Preview the Production Build

```bash
npm run preview
```

The app will be available at `http://localhost:4173`

## Measuring Performance

### Option 1: Chrome DevTools (Recommended)

1. **Open Chrome DevTools** (F12)
2. **Go to Lighthouse tab**
3. **Configure settings:**
   - Mode: Navigation
   - Device: Desktop or Mobile
   - Categories: Performance (at minimum)
4. **Click "Analyze page load"**

**Key metrics to check:**

- **LCP (Largest Contentful Paint)**: Should be < 2.5s (Good)
- **CLS (Cumulative Layout Shift)**: Should be < 0.1 (Good)
- **TBT (Total Blocking Time)**: Should be < 200ms (Good)
- **FCP (First Contentful Paint)**: Should be < 1.8s (Good)

### Option 2: Lighthouse CI (Command Line)

```bash
# Install Lighthouse CI globally
npm install -g @lhci/cli

# Start the preview server in one terminal
npm run preview

# In another terminal, run Lighthouse
lhci autorun --collect.url=http://localhost:4173/
```

### Option 3: Web Vitals Extension

1. Install [Web Vitals Chrome Extension](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma)
2. Navigate to your app
3. See real-time Core Web Vitals in the overlay

### Option 4: PageSpeed Insights (Live Site Only)

Once deployed, test with Google PageSpeed Insights:

```
https://pagespeed.web.dev/
```

## What to Test

### Critical Pages to Test

1. **Homepage** (`/`)
   - Should load quickly with lazy-loaded images
   - TwitchEmbed thumbnails should not cause layout shifts

2. **Clip Detail Page** (`/clip/:id`)
   - Main content area (Twitch embed) should have reserved space
   - No layout shifts when embed loads
   - Lazy loading of related content

3. **Feed Pages** (`/new`, `/top`, `/rising`)
   - Long lists of clips with thumbnails
   - Verify lazy loading of images as you scroll
   - Smooth scrolling performance

4. **Profile/Creator Pages** (`/creator/:id`, `/profile`)
   - Avatar images should load lazily
   - Charts on analytics pages should only load when page is visited

### Specific Improvements to Verify

#### 1. Image Lazy Loading

**Test:**

1. Open DevTools Network tab
2. Navigate to a page with many images (e.g., `/new`)
3. Filter by "Img"
4. Scroll down slowly
5. **Expected:** Images should only load as they approach the viewport

#### 2. Layout Shift Prevention (CLS)

**Test:**

1. Open DevTools Performance tab
2. Record while loading a clip detail page
3. Look at "Experience" row
4. **Expected:** No red "Layout Shift" markers, or very minimal (< 0.1 score)

#### 3. Code Splitting

**Test:**

1. Open DevTools Network tab
2. Load homepage
3. Note which JS chunks are loaded
4. Navigate to an analytics page (e.g., `/creator/123/analytics`)
5. **Expected:** A new chunk (analytics-*.js) should load only when accessing analytics page

#### 4. Bundle Size

**Test:**

```bash
npm run build
# Check the output - main bundle should be around 274 KB gzipped
```

**Expected bundles:**

- Main bundle: ~274 KB gzipped
- Analytics chunk: ~112 KB gzipped (only loaded for analytics pages)
- Individual page chunks: 0.2-5 KB each

## Analyzing Bundle Size

### Visualize Bundle Composition

```bash
npm run build:analyze
```

This opens an interactive visualization showing:

- What's in each chunk
- Relative sizes of dependencies
- Potential optimization opportunities

### Check Bundle Report

After building, check the console output for:

- Total bundle size
- Individual chunk sizes
- Warnings about large chunks

## Performance Benchmarks

### Before Optimizations

*(Baseline - if measurements were taken)*

### After Optimizations

**Expected improvements:**

- ✅ Route-level code splitting active (already implemented)
- ✅ Image lazy loading reduces initial bandwidth by 40-60%
- ✅ Layout shifts prevented with aspect ratios
- ✅ Preconnect hints reduce connection time to external domains
- ✅ Analytics library (429 KB) only loads when needed

## Troubleshooting

### Bundle Still Large?

- Check if all images are using lazy loading
- Verify that heavy dependencies like Recharts are only loaded on analytics pages
- Run `npm run build:analyze` to see what's taking up space

### Layout Shifts Occurring?

- Check if all images have width/height or aspect-ratio
- Verify TwitchEmbed maintains its aspect ratio
- Look for elements that change size after loading

### Slow Load Times?

- Check network throttling in DevTools
- Verify preconnect hints are in index.html
- Check if service worker or caching is interfering
- Try in incognito mode for clean test

## Continuous Monitoring

### Set Up Performance Budgets

Add to package.json:

```json
{
  "lighthouse": {
    "ci": {
      "assert": {
        "preset": "lighthouse:recommended",
        "assertions": {
          "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
          "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
          "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
        }
      }
    }
  }
}
```

### Automate Testing in CI/CD

```yaml
# Example GitHub Actions step
- name: Run Lighthouse CI
  run: |
    npm run build
    npm install -g @lhci/cli
    lhci autorun
```

## Resources

- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/overview/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Web.dev Performance](https://web.dev/fast/)
