<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [React Chunking Error Fix](#react-chunking-error-fix)
  - [Problem](#problem)
  - [Root Cause](#root-cause)
  - [Solution](#solution)
    - [Why This Works](#why-this-works)
    - [Trade-offs](#trade-offs)
    - [Current Strategy](#current-strategy)
  - [Build Output](#build-output)
  - [Testing](#testing)
  - [Prevention](#prevention)
  - [Related Files](#related-files)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# React Chunking Error Fix

## Problem

**Error:** `Uncaught TypeError: Cannot set properties of undefined (setting 'Activity')`
- Occurred in `react.production.js` at initialization
- Happened when chunks loaded out of synchronous order

## Root Cause

Vite was splitting React and ReactDOM into separate chunks. When the main app chunk tried to execute before React's core chunk fully initialized, React's internal objects (like `Activity`) weren't defined yet.

This is a **race condition** in chunk loading order:
1. Main app chunk starts executing
2. It tries to use React features
3. React core chunk hasn't finished loading yet
4. React properties are undefined → error

## Solution

**Keep React in the main bundle** instead of chunking it separately.

### Why This Works

- React requires synchronous initialization before any code can use it
- By keeping React in the main entry point, it's guaranteed to initialize first
- Other chunks can safely depend on React once the main chunk loads

### Trade-offs

| Aspect | Before (Broken) | After (Fixed) |
|--------|---|---|
| Main bundle size | ~128 KB | ~127 KB |
| Initialization safety | ❌ Race condition | ✅ Safe |
| Caching efficiency | Slightly better (React cached separately) | Good (React cached with app) |
| Load time | Faster perceived (chunked) but broken | Reliable (unified core) |

### Current Strategy

Only split out truly **optional, heavy dependencies**:
- `recharts` - Charts library (only used on analytics pages)
- `react-markdown` - Markdown renderer (only used for content)
- `lodash` - Utility library (optional)
- All other vendors bundled together

Keep **required dependencies in main bundle**:
- `react` and `react-dom` ✓
- `react-router-dom` ✓
- `zustand` (state management) ✓
- `@tanstack/react-query` (data fetching) ✓
- `axios`, `i18next`, etc. ✓

## Build Output

```
Rebuilt: frontend/dist/
Main bundle: app-CPVzJLFo.js (127.73 KB gzipped: 34.44 KB)
Contains: React core + all essential dependencies
Chunks: Only heavy optional libraries split out
```

## Testing

To verify the fix works:

```bash
cd frontend
npm run build
npm run preview
# Open http://localhost:4173
# Check browser console - should have no React initialization errors
```

## Prevention

For future chunking optimizations:
1. ✅ DO test with `npm run preview` to catch timing issues
2. ✅ DO keep framework cores (React, Vue, Angular) in main bundle
3. ✅ DO monitor browser console for initialization errors
4. ❌ DON'T split code that needs synchronous access to core framework
5. ❌ DON'T rely on modulepreload as sole solution for ordering

## Related Files

- [frontend/vite.config.ts](frontend/vite.config.ts) - Build configuration
- Commit: `0a2559a` - Fix implementation
