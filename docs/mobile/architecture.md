# Mobile Architecture

Architecture and design for the Clipper React Native mobile app.

## Overview

- **Framework**: React Native 0.76 + Expo 52
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: TanStack Query + Zustand
- **Styling**: TailwindCSS (via NativeWind)
- **API Client**: Axios

## Platform Support

- iOS 13+
- Android 8.0+ (API 26+)

## Project Structure

```
mobile/
├── app/              # Expo Router pages (file-based routing)
│   ├── (tabs)/       # Tab navigator
│   ├── clip/[id].tsx # Clip detail
│   └── _layout.tsx   # Root layout
├── components/       # Reusable components
├── hooks/            # Custom hooks
├── lib/              # API client, utilities
├── stores/           # Zustand stores
├── types/            # TypeScript types
├── app.json          # Expo config
└── eas.json          # EAS Build config
```

## Navigation

File-based routing with Expo Router:
```
app/
├── index.tsx         → /
├── (tabs)/
│   ├── _layout.tsx   → Tab navigator
│   ├── index.tsx     → / (Home tab)
│   └── search.tsx    → /search (Search tab)
├── clip/[id].tsx     → /clip/:id
└── profile/[username].tsx → /profile/:username
```

Navigate programmatically:
```tsx
import { router } from 'expo-router';

router.push(`/clip/${clipId}`);
```

## State Management

Same pattern as web frontend:

**Server State (TanStack Query)**:
```tsx
const { data: clip } = useQuery({
  queryKey: ['clip', clipId],
  queryFn: () => api.getClip(clipId)
});
```

**Client State (Zustand)**:
```tsx
const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  toggleTheme: () => set((state) => ({
    theme: state.theme === 'dark' ? 'light' : 'dark'
  }))
}));
```

## Styling

NativeWind (TailwindCSS for React Native):
```tsx
import { View, Text } from 'react-native';

<View className="flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
  <Text className="text-xl font-bold">Hello</Text>
</View>
```

## Shared Code

~70% code shared with web frontend:
- API client (`lib/api.ts`)
- Hooks (`hooks/useClips.ts`)
- Stores (`stores/themeStore.ts`)
- Types (`types/clip.ts`)

Platform-specific:
- UI components (React Native vs. React DOM)
- Navigation (Expo Router vs. React Router)
- Device features (camera, push notifications)

## Platform-Specific Features

### Video Playback

Uses `expo-av`:
```tsx
import { Video } from 'expo-av';

<Video
  source={{ uri: clip.video_url }}
  useNativeControls
  style={{ width: '100%', height: 300 }}
/>
```

### Deep Linking

Configure in `app.json`:
```json
{
  "expo": {
    "scheme": "clipper",
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "data": { "scheme": "https", "host": "clipper.app" }
      }]
    },
    "ios": {
      "associatedDomains": ["applinks:clipper.app"]
    }
  }
}
```

Handle links:
```tsx
// app/_layout.tsx
export default function RootLayout() {
  useEffect(() => {
    Linking.addEventListener('url', (event) => {
      const { url } = event;
      // Parse and navigate: /clip/abc123
    });
  }, []);
}
```

### Push Notifications

Expo Notifications:
```tsx
import * as Notifications from 'expo-notifications';

// Request permission
const { status } = await Notifications.requestPermissionsAsync();

// Get push token
const token = await Notifications.getExpoPushTokenAsync();

// Send to backend
await api.registerPushToken(token.data);
```

### Camera (for QR code scanning)

```tsx
import { Camera } from 'expo-camera';

const [hasPermission, setHasPermission] = useState(null);

useEffect(() => {
  Camera.requestCameraPermissionsAsync().then(({ status }) => {
    setHasPermission(status === 'granted');
  });
}, []);
```

## Authentication

Same JWT flow as web:
- User logs in via Twitch OAuth (in-app browser)
- Backend sets JWT in `httpOnly` cookie
- Mobile uses session-based auth (cookies via Axios)

See [[../backend/authentication|Authentication]].

## Offline Support

Use TanStack Query cache:
```tsx
const { data: clips, isLoading } = useQuery({
  queryKey: ['clips'],
  queryFn: api.getClips,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000 // 30 minutes
});
```

Show cached data while offline.

## Performance

- **List Virtualization**: `FlashList` for clip feeds
- **Image Optimization**: `expo-image` with caching
- **Lazy Loading**: Expo Router code splitting
- **Memoization**: `React.memo`, `useMemo`

## Build & Deploy

See [[implementation|Mobile Implementation]].

---

Related: [[implementation|Mobile Implementation]] · [[../backend/api|API]] · [[../frontend/architecture|Frontend Architecture]]

[[../index|← Back to Index]]
