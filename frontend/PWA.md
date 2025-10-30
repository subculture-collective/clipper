# Progressive Web App (PWA) Implementation

This document describes the PWA implementation in Clipper.

## Overview

Clipper now has baseline PWA support, allowing users to install the app on their devices and providing a limited offline experience through an app shell.

## Features

### 1. Web App Manifest (`public/manifest.json`)

The manifest provides metadata about the application:

- **Name**: "Clipper - Community-Driven Twitch Clip Curation"
- **Short Name**: "Clipper"
- **Display Mode**: Standalone (launches like a native app)
- **Theme Color**: `#6366f1` (primary brand color)
- **Background Color**: `#ffffff`
- **Icons**: Multiple sizes (72x72 to 512x512) including maskable icons for Android

### 2. Icons

Generated PWA icons in multiple sizes are located in `public/icons/`:

- Standard icons: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- Maskable icons: 192x192, 512x512 (for Android adaptive icons)
- Source: `icon.svg` (can be replaced with a custom logo)

### 3. Service Worker (`public/sw.js`)

The service worker provides offline functionality with the following characteristics:

#### Caching Strategy

- **Static Assets**: Network-first strategy with cache fallback
  - Caches HTML, CSS, JavaScript, images, and other static assets
  - Updates cache when online for fresh content
  - Falls back to cached version when offline

- **API Requests**: Never cached (Network-only)
  - All `/api/*` endpoints
  - All `/auth/*` endpoints
  - Any request with Authorization headers
  - Any request with Cookies
  - POST/PUT/DELETE requests

#### Security

The service worker is designed with security in mind:

- ✅ **No sensitive data caching**: API responses, user data, and authenticated requests are never cached
- ✅ **Auth flow respected**: Authentication endpoints are never cached
- ✅ **Privacy-focused**: Only public static assets are cached

#### Offline Experience

When offline:
- Static app shell (header, footer, layout) renders from cache
- User sees a friendly offline page (`/offline.html`) for navigation requests
- API requests return a 503 Service Unavailable error
- The offline page automatically detects when the connection is restored

### 4. Service Worker Registration (`src/lib/sw-register.ts`)

Service worker registration utilities:

- **registerServiceWorker()**: Registers the service worker (production only)
- **unregisterServiceWorker()**: Unregisters all service workers (for debugging)
- **isPWAInstalled()**: Checks if app is running as an installed PWA
- **canInstallPWA()**: Checks if the browser supports PWA installation

The service worker is automatically registered in `src/main.tsx` when the app starts.

### 5. Offline Fallback Page (`public/offline.html`)

A standalone HTML page that displays when users try to navigate while offline:

- Beautiful gradient background
- Clear "You're Offline" messaging
- Connection status monitoring
- "Try Again" button to reload when back online
- Responsive design

## Installation

### For End Users

#### Desktop (Chrome, Edge, Opera)
1. Visit the Clipper website
2. Look for the install icon in the address bar (➕ or 🖥️)
3. Click "Install" in the prompt
4. The app will open in a standalone window

#### Mobile (Chrome, Safari, Firefox)
1. Visit the Clipper website
2. Tap the browser menu (⋮ or ⋯)
3. Select "Add to Home Screen" or "Install App"
4. Follow the prompts
5. The app icon will appear on your home screen

### For Developers

The PWA features only work in production builds:

```bash
# Build the production version
npm run build

# Serve the production build locally to test PWA
npx serve dist

# Or use a production server
npm run preview
```

## Testing PWA Features

### Testing Installability

1. Build and serve the production version
2. Open Chrome DevTools
3. Go to "Application" tab → "Manifest"
4. Verify manifest appears correctly
5. Check for installability issues in the warnings section

### Testing Service Worker

1. Open Chrome DevTools
2. Go to "Application" tab → "Service Workers"
3. Verify the service worker is registered
4. Use "Offline" checkbox to simulate offline mode
5. Navigate around the app to test offline experience

### Testing Cache

1. Open Chrome DevTools
2. Go to "Application" tab → "Cache Storage"
3. Expand "clipper-v1" cache
4. Verify static assets are cached
5. Verify API responses are NOT cached

## Browser Support

PWA features are supported in:

- ✅ Chrome/Edge/Opera (Full support)
- ✅ Firefox (Service worker support, no install prompt)
- ✅ Safari iOS 11.3+ (Limited PWA support)
- ✅ Samsung Internet (Full support)

## Development Notes

### Service Worker in Development

The service worker is **disabled in development mode** to prevent caching issues that can interfere with hot module replacement (HMR). It only registers in production builds.

### Updating the Service Worker

When you make changes to the service worker:

1. Update the `CACHE_NAME` version in `public/sw.js`
2. The new service worker will be detected on page load
3. Users will be prompted to reload to get the new version

### Clearing the Cache

To clear the service worker cache during development:

```javascript
// In browser console
await caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))))
```

Or use the "Clear storage" button in Chrome DevTools → Application tab.

## Future Enhancements

Potential future improvements to the PWA implementation:

- [ ] Background sync for offline submissions
- [ ] Push notifications for new clips
- [ ] Periodic background sync for content updates
- [ ] Advanced caching strategies (e.g., stale-while-revalidate)
- [ ] Offline favorites/bookmarks
- [ ] Share target API for sharing clips to Clipper
- [ ] App shortcuts for quick actions

## Troubleshooting

### Service Worker Not Registering

- Ensure you're running a production build (`npm run build`)
- Check browser console for registration errors
- Verify the app is served over HTTPS (or localhost)

### Cache Not Updating

- Update the `CACHE_NAME` in `sw.js`
- Clear the service worker in DevTools
- Do a hard reload (Ctrl+Shift+R or Cmd+Shift+R)

### App Not Installable

- Check the manifest is accessible at `/manifest.json`
- Verify all required manifest fields are present
- Check for manifest errors in DevTools → Application → Manifest
- Ensure HTTPS (localhost is OK for testing)

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
