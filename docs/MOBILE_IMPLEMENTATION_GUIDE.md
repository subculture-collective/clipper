# Mobile Implementation Guide

This guide walks through implementing the Clipper mobile apps based on the decisions in [RFC 001](./rfcs/001-mobile-framework-selection.md).

## Prerequisites

### Required Tools

1. **Node.js 20+**: JavaScript runtime
2. **npm or yarn**: Package manager
3. **Expo CLI**: `npm install -g expo-cli eas-cli`
4. **Git**: Version control

### Optional (for testing)

5. **Xcode**: For iOS development (macOS only)
6. **Android Studio**: For Android development
7. **iOS Simulator**: macOS only
8. **Android Emulator**: Any platform

## Project Setup

### 1. Install Dependencies

```bash
# From repository root
npm install

# Install mobile dependencies
npm -w mobile install

# Install shared dependencies
npm -w shared install
```

### 2. Configure Environment

Create `mobile/.env`:

```env
API_URL=http://localhost:8080/api/v1
SENTRY_DSN=
POSTHOG_KEY=
```

### 3. Start Development Server

```bash
# From repository root
npm run dev:mobile

# Or from mobile directory
cd mobile
npm start
```

This will start Metro bundler and show a QR code.

### 4. Run on Simulator/Emulator

#### iOS (macOS only)

```bash
npm run ios
```

Or press `i` in the Metro terminal.

#### Android

```bash
npm run android
```

Or press `a` in the Metro terminal.

#### Web (for quick testing)

```bash
npm run web
```

Or press `w` in the Metro terminal.

## Development Workflow

### File Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation
│   │   ├── index.tsx      # Feed screen
│   │   ├── search.tsx     # Search screen
│   │   ├── favorites.tsx  # Favorites screen
│   │   └── profile.tsx    # Profile screen
│   ├── clip/[id].tsx      # Dynamic clip detail
│   ├── auth/login.tsx     # Authentication
│   └── _layout.tsx        # Root layout
├── src/                   # Source code
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API services
│   └── stores/           # Zustand stores
└── assets/               # Static assets
```

### Creating New Screens

Expo Router uses file-based routing. To add a new screen:

1. Create a file in `app/` directory
2. Export a React component
3. Access via navigation

Example:

```tsx
// app/games/[id].tsx
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  return (
    <View>
      <Text>Game: {id}</Text>
    </View>
  );
}
```

Navigate: `router.push('/games/valorant')`

### Adding Components

Create reusable components in `src/components/`:

```tsx
// src/components/ClipCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import type { Clip } from '@clipper/shared';

interface ClipCardProps {
  clip: Clip;
  onPress: (id: string) => void;
}

export function ClipCard({ clip, onPress }: ClipCardProps) {
  return (
    <TouchableOpacity 
      onPress={() => onPress(clip.id)}
      className="bg-white p-4 rounded-lg shadow"
    >
      <Text className="text-lg font-bold">{clip.title}</Text>
      <Text className="text-gray-600">by {clip.broadcaster.name}</Text>
    </TouchableOpacity>
  );
}
```

### API Integration

Use TanStack Query for API calls:

```tsx
// src/hooks/use-clips.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import type { Clip } from '@clipper/shared';

export function useClips() {
  return useInfiniteQuery({
    queryKey: ['clips'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get<{ data: Clip[] }>('/clips', {
        params: { page: pageParam, perPage: 20 }
      });
      return response.data;
    },
    getNextPageParam: (lastPage, pages) => {
      // Return next page number or undefined if no more pages
      return lastPage.data.length === 20 ? pages.length + 1 : undefined;
    },
  });
}

// Usage in component
function FeedScreen() {
  const { data, fetchNextPage, hasNextPage, isLoading } = useClips();
  
  const clips = data?.pages.flatMap(page => page.data) ?? [];
  
  return (
    <FlatList
      data={clips}
      onEndReached={() => hasNextPage && fetchNextPage()}
      // ...
    />
  );
}
```

### State Management

Use Zustand for global state:

```tsx
// src/stores/auth-store.ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@clipper/shared';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: async (token, user) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token, user, isAuthenticated: true });
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));

// Usage
function ProfileScreen() {
  const { user, logout } = useAuthStore();
  
  return (
    <View>
      <Text>Welcome, {user?.username}</Text>
      <Button onPress={logout}>Logout</Button>
    </View>
  );
}
```

### Styling with NativeWind

Use Tailwind utility classes:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900 mb-4">
    Title
  </Text>
  <TouchableOpacity className="px-4 py-3 bg-primary-500 rounded-lg">
    <Text className="text-white text-center font-semibold">
      Button
    </Text>
  </TouchableOpacity>
</View>
```

Responsive design:

```tsx
<View className="p-4 md:p-6 lg:p-8">
  <Text className="text-lg md:text-xl lg:text-2xl">
    Responsive text
  </Text>
</View>
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

Example test:

```tsx
// src/components/__tests__/ClipCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ClipCard } from '../ClipCard';

describe('ClipCard', () => {
  it('renders clip title', () => {
    const clip = {
      id: '1',
      title: 'Test Clip',
      creator: 'test',
    };
    
    const { getByText } = render(
      <ClipCard clip={clip} onPress={jest.fn()} />
    );
    
    expect(getByText('Test Clip')).toBeTruthy();
  });
  
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ClipCard clip={mockClip} onPress={onPress} />
    );
    
    fireEvent.press(getByTestId('clip-card'));
    expect(onPress).toHaveBeenCalledWith('1');
  });
});
```

### E2E Tests (Future)

Detox will be used for E2E testing:

```bash
# Build test app
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug
```

## Building & Deployment

### EAS Build Setup

1. Create Expo account at expo.dev
2. Login to EAS:

```bash
eas login
```

3. Configure project:

```bash
cd mobile
eas build:configure
```

4. Update `eas.json` with your configuration

### Development Builds

For testing with native features:

```bash
# Build for iOS Simulator
eas build --profile development --platform ios

# Build for Android Emulator
eas build --profile development --platform android

# Install and run
```

### Preview Builds

For internal testing:

```bash
# Build both platforms
eas build --profile preview --platform all

# Builds will be available in Expo dashboard
# Share links with testers
```

### Production Builds

```bash
# Build for App Store and Google Play
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### OTA Updates

For instant updates without app store review:

```bash
# Publish update to production
eas update --branch production --message "Bug fixes"

# Publish to specific channel
eas update --channel preview --message "New feature preview"
```

## CI/CD Integration

The project includes GitHub Actions workflows:

### Required Secrets

Add these to GitHub repository secrets:

- `EXPO_TOKEN`: Expo access token (get from expo.dev)

### Workflow Triggers

- **Lint & Test**: Every push/PR to `mobile/` or `shared/`
- **Preview Build**: On pull requests
- **Production Build**: On push to `main` branch

### Manual Builds

Trigger builds manually:

```bash
# Via GitHub Actions UI
Actions > Mobile CI > Run workflow

# Or with gh CLI
gh workflow run mobile-ci.yml
```

## Authentication Flow

### Twitch OAuth Implementation

1. **Register Twitch App**:
   - Go to dev.twitch.tv/console
   - Create new application
   - Add redirect URI: `clipper://auth/callback`

2. **Implement OAuth Flow**:

```tsx
// app/auth/login.tsx
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

async function handleLogin() {
  const redirectUrl = Linking.createURL('auth/callback');
  const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${TWITCH_CLIENT_ID}` +
    `&redirect_uri=${redirectUrl}` +
    `&response_type=code` +
    `&scope=user:read:email`;
  
  const result = await WebBrowser.openAuthSessionAsync(
    authUrl,
    redirectUrl
  );
  
  if (result.type === 'success') {
    // Extract code from result.url
    // Exchange code for token via backend
    // Store token in SecureStore
  }
}
```

3. **Handle Callback**:

```tsx
// app/auth/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

export default function CallbackScreen() {
  const router = useRouter();
  
  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url);
      const code = queryParams?.code;
      
      if (code) {
        // Exchange code for token
        await authService.login(code);
        router.replace('/');
      }
    };
    
    Linking.addEventListener('url', handleUrl);
  }, []);
  
  return <LoadingScreen />;
}
```

## Push Notifications

### Setup

1. **Configure credentials**:

```bash
eas credentials
```

2. **Request permissions**:

```tsx
// src/services/notifications.ts
import * as Notifications from 'expo-notifications';

export async function registerForPushNotifications() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }
  
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}
```

3. **Handle notifications**:

```tsx
// app/_layout.tsx
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });
  
  return () => subscription.remove();
}, []);
```

## Troubleshooting

### Common Issues

**Metro bundler won't start:**
```bash
# Clear cache
npx expo start -c
```

**Type errors from shared package:**
```bash
# Rebuild shared types
npm -w shared run type-check
```

**iOS simulator not launching:**
```bash
# Open Xcode and launch simulator manually
open -a Simulator
```

**Android emulator not detected:**
```bash
# List devices
adb devices

# Start emulator
emulator -avd Pixel_5_API_31
```

### Debug Tools

- **React DevTools**: Automatically available in dev mode
- **Network Inspector**: Press `Cmd+D` (iOS) or `Cmd+M` (Android) > "Debug Remote JS"
- **Element Inspector**: Shake device or press `Cmd+D` > "Show Element Inspector"

## Next Steps

1. **Implement Authentication**: Complete Twitch OAuth flow
2. **Connect to API**: Replace mock data with real API calls
3. **Add Video Player**: Integrate video playback for clips
4. **Implement Offline Mode**: Add offline queue and caching
5. **Add Analytics**: Integrate PostHog for event tracking
6. **Error Tracking**: Set up Sentry for crash reporting
7. **Performance**: Optimize list rendering and images
8. **Testing**: Write comprehensive test suite
9. **Beta Testing**: Deploy to TestFlight and Google Play Internal
10. **Launch**: Submit to App Store and Google Play

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [RFC 001: Mobile Framework Selection](./rfcs/001-mobile-framework-selection.md)
- [Mobile Architecture](./MOBILE_ARCHITECTURE.md)

## Support

For issues or questions:
- Open an issue on GitHub
- Check Expo forums: forums.expo.dev
- Join Expo Discord: chat.expo.dev

---

**Last Updated:** 2025-11-02  
**Maintainers:** Clipper Engineering Team
