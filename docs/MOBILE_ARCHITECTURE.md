# Mobile App Architecture

**Last Updated:** 2025-11-02
**Status:** Active
**Related:** [RFC 001: Mobile Framework Selection](./rfcs/001-mobile-framework-selection.md)

## Overview

This document describes the architecture of Clipper's mobile applications (iOS and Android), built with React Native and Expo. The mobile apps share code, types, and business logic with the web frontend while providing native mobile experiences.

## High-Level Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Client Layer                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐         ┌──────────────────┐       │
│  │   Web Frontend   │         │  Mobile Apps     │       │
│  │   React + Vite   │         │  React Native    │       │
│  │                  │         │  + Expo          │       │
│  │  ┌────────────┐  │         │  ┌────────────┐  │       │
│  │  │ Components │  │         │  │ RN Comp.   │  │       │
│  │  ├────────────┤  │         │  ├────────────┤  │       │
│  │  │ React      │  │         │  │ Expo       │  │       │
│  │  │ Router     │  │         │  │ Router     │  │       │
│  │  ├────────────┤  │         │  ├────────────┤  │       │
│  │  │ TanStack   │  │         │  │ TanStack   │  │       │
│  │  │ Query      │◄─┼─────────┼─►│ Query      │  │       │
│  │  └────────────┘  │         │  └────────────┘  │       │
│  └────────┬─────────┘         └────────┬─────────┘       │
│           │                            │                  │
│           └────────────┬───────────────┘                  │
│                        │                                  │
│              ┌─────────▼──────────┐                       │
│              │   Shared Package   │                       │
│              │  (TypeScript)      │                       │
│              │  - Types           │                       │
│              │  - API Client      │                       │
│              │  - Utils           │                       │
│              │  - Constants       │                       │
│              └─────────┬──────────┘                       │
│                        │                                  │
└────────────────────────┼──────────────────────────────────┘
                         │ HTTPS/REST
                         │
┌────────────────────────▼──────────────────────────────────┐
│                   Backend Layer                           │
├───────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Go Backend (Gin Framework)               │ │
│  │  ┌───────────┐  ┌──────────┐  ┌─────────────────┐ │ │
│  │  │ Handlers  │  │ Services │  │  Repositories   │ │ │
│  │  └─────┬─────┘  └────┬─────┘  └────┬────────────┘ │ │
│  │        │             │             │              │ │
│  └────────┼─────────────┼─────────────┼──────────────┘ │
│           │             │             │                 │
│  ┌────────▼─────┐  ┌────▼─────┐  ┌───▼─────────┐      │
│  │  PostgreSQL  │  │  Redis   │  │ OpenSearch  │      │
│  └──────────────┘  └──────────┘  └─────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Mobile App Architecture

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React Native Components (UI)                     │  │
│  │  - Screens (Feed, Clip Detail, Profile, etc.)    │  │
│  │  - Reusable Components (Card, Button, etc.)      │  │
│  │  - Styled with NativeWind (Tailwind-like)        │  │
│  └───────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   Navigation Layer                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Expo Router (File-based Routing)                │  │
│  │  - Tab Navigation                                 │  │
│  │  - Stack Navigation                               │  │
│  │  - Deep Linking                                   │  │
│  │  - Type-safe Navigation                           │  │
│  └───────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                     State Layer                          │
│  ┌─────────────────────┐    ┌───────────────────────┐  │
│  │  TanStack Query     │    │      Zustand          │  │
│  │  - API State        │    │  - Auth State         │  │
│  │  - Cache Management │    │  - Theme State        │  │
│  │  - Optimistic UI    │    │  - Global Settings    │  │
│  │  - Background Sync  │    │  - Offline Queue      │  │
│  └─────────┬───────────┘    └──────────┬────────────┘  │
└───────────┼────────────────────────────┼────────────────┘
            │                            │
┌───────────▼────────────────────────────▼────────────────┐
│                    Services Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ API Service  │  │ Auth Service │  │Push Service  │  │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  │
│  │Storage Svc   │  │Analytics Svc │  │Error Tracking│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Navigation Structure

### File-Based Routing (Expo Router)

```
mobile/app/
├── _layout.tsx              # Root layout (auth check, providers)
├── (auth)/                  # Auth group (public)
│   ├── _layout.tsx         # Auth layout
│   ├── login.tsx           # Login screen
│   └── callback.tsx        # OAuth callback
├── (tabs)/                  # Main app (protected)
│   ├── _layout.tsx         # Tab bar layout
│   ├── index.tsx           # Home/Feed tab
│   ├── search.tsx          # Search tab
│   ├── favorites.tsx       # Favorites tab
│   └── profile.tsx         # Profile tab
├── clip/
│   └── [id].tsx            # Clip detail (dynamic route)
├── user/
│   └── [username].tsx      # User profile
├── settings/
│   ├── index.tsx           # Settings home
│   ├── account.tsx         # Account settings
│   ├── notifications.tsx   # Notification settings
│   └── about.tsx           # About app
└── +not-found.tsx          # 404 screen
```

### Navigation Flow

```
App Launch
    ↓
Check Auth Token (Zustand + SecureStore)
    ↓
    ├─ Not Authenticated → (auth)/login.tsx
    │                          ↓
    │                    OAuth Flow → callback.tsx
    │                          ↓
    │                    Store Token → SecureStore
    │                          ↓
    └─ Authenticated ─────────→ (tabs)/index.tsx
                                     ↓
                           ┌─────────┼─────────┐
                           ↓         ↓         ↓
                        Home    Search    Favorites
                           ↓
                    Tap Clip Card
                           ↓
                    clip/[id].tsx
                           ↓
                    ┌──────┴──────┐
                    ↓             ↓
            Video Player    Comments Section
```

## Data Flow

### Read Operation (Fetching Data)

```
1. User opens Feed screen
    ↓
2. Component mounts → useInfiniteQuery hook
    ↓
3. TanStack Query checks cache
    ├─ Cache Hit (fresh) → Return cached data
    │                       ↓
    │                    Render UI
    │
    └─ Cache Miss/Stale → Fetch from API
                              ↓
                        API Service (Axios)
                              ↓
                        Backend (Go API)
                              ↓
                        Database (PostgreSQL)
                              ↓
                        Response → JSON
                              ↓
                        Update Cache (TanStack Query)
                              ↓
                        Render UI
```

### Write Operation (Creating/Updating Data)

```
1. User upvotes a clip
    ↓
2. Component calls useMutation hook
    ↓
3. Optimistic Update (TanStack Query)
    ├─ Update local cache immediately
    ├─ Show updated UI (vote count +1)
    └─ Queue API request
           ↓
4. API Service sends request
    ├─ Success → Confirm cache update
    │             ↓
    │          Invalidate related queries
    │             ↓
    │          Background refetch
    │
    └─ Failure → Rollback cache
                  ↓
               Show error toast
                  ↓
               Optional: Add to retry queue
```

## State Management

### TanStack Query (API State)

**Purpose:** Manage server state, caching, synchronization

**Use Cases:**

- Fetching clips, users, comments
- Infinite scroll pagination
- Background data refresh
- Optimistic updates
- Request deduplication

**Configuration:**

```typescript
// mobile/src/config/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Zustand (Global Client State)

**Purpose:** Manage client-only global state

**Use Cases:**

- Authentication state (user, token, isAuthenticated)
- Theme preference (light/dark mode)
- App settings
- Offline queue

**Store Structure:**

```typescript
// mobile/src/stores/auth-store.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// mobile/src/stores/settings-store.ts
interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    enabled: boolean;
    mentions: boolean;
    replies: boolean;
  };
  setTheme: (theme: string) => void;
  toggleNotifications: (key: string) => void;
}
```

## Caching Strategy

### Multi-Layer Cache

```
┌───────────────────────────────────────────────────┐
│          Cache Layer Hierarchy                    │
├───────────────────────────────────────────────────┤
│                                                   │
│  L1: Memory Cache (TanStack Query)               │
│      - Fastest access (~1ms)                      │
│      - Max 50 entries                             │
│      - TTL: 5 minutes (staleTime)                 │
│      - Used for: All API responses                │
│                                                   │
│  L2: Secure Storage (Expo SecureStore)           │
│      - Fast access (~10ms)                        │
│      - Encrypted by OS                            │
│      - Persistent across app restarts             │
│      - Used for: Auth tokens, sensitive data      │
│                                                   │
│  L3: Async Storage (React Native AsyncStorage)   │
│      - Moderate access (~50ms)                    │
│      - Unencrypted key-value store                │
│      - Persistent across app restarts             │
│      - Used for: User preferences, settings       │
│                                                   │
│  L4: File System Cache (expo-file-system)        │
│      - Slower access (~100-500ms)                 │
│      - For large files (images, videos)           │
│      - TTL: 7 days                                │
│      - Max size: 100MB                            │
│      - Used for: Media assets                     │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Cache Invalidation

```typescript
// Example: Invalidate feed cache after posting comment
const addCommentMutation = useMutation({
  mutationFn: (data: CreateCommentInput) =>
    apiClient.comments.create(data),

  onSuccess: (newComment, variables) => {
    // Invalidate clip detail query
    queryClient.invalidateQueries(['clip', variables.clipId]);

    // Invalidate feed query (clip appears in feed)
    queryClient.invalidateQueries(['feed']);

    // Optimistically update cache
    queryClient.setQueryData(
      ['clip', variables.clipId],
      (old: Clip) => ({
        ...old,
        commentCount: old.commentCount + 1,
      })
    );
  },
});
```

## API Integration

### Shared API Client

Located in `shared/` package, used by both web and mobile:

```typescript
// shared/src/api/client.ts
import axios, { AxiosInstance } from 'axios';
import type { Clip, User, Comment, ApiResponse } from '../types';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string, getToken: () => string | null) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Clip endpoints
  clips = {
    list: (params: ListClipsParams) =>
      this.client.get<ApiResponse<Clip[]>>('/clips', { params }),

    get: (id: string) =>
      this.client.get<ApiResponse<Clip>>(`/clips/${id}`),

    vote: (id: string, direction: 'up' | 'down') =>
      this.client.post(`/clips/${id}/vote`, { direction }),
  };

  // User endpoints
  users = {
    me: () => this.client.get<ApiResponse<User>>('/users/me'),
    get: (username: string) =>
      this.client.get<ApiResponse<User>>(`/users/${username}`),
  };

  // Comment endpoints
  comments = {
    list: (clipId: string) =>
      this.client.get<ApiResponse<Comment[]>>(`/clips/${clipId}/comments`),

    create: (data: CreateCommentInput) =>
      this.client.post<ApiResponse<Comment>>('/comments', data),
  };
}
```

### Mobile-Specific Usage

```typescript
// mobile/src/services/api.ts
import { ApiClient } from '@clipper/shared';
import { useAuthStore } from '../stores/auth-store';
import Constants from 'expo-constants';

const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  'https://api.clipper.app';

export const apiClient = new ApiClient(
  API_BASE_URL,
  () => useAuthStore.getState().token
);

// React Query hooks
export const useClips = (params: ListClipsParams) => {
  return useInfiniteQuery({
    queryKey: ['clips', params],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.clips.list({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
};
```

## Performance Optimization

### Strategies

1. **List Virtualization:**
   - Use `FlashList` instead of `FlatList` for long lists
   - 10x better performance for large datasets

2. **Image Optimization:**
   - Use `expo-image` with blurhash placeholders
   - Lazy load images with `IntersectionObserver`
   - Cache images in file system

3. **Code Splitting:**
   - Expo Router automatically code-splits by route
   - Lazy load heavy components with `React.lazy`

4. **Bundle Optimization:**
   - Enable Hermes engine (default in Expo)
   - Remove unused imports with tree-shaking
   - Use `expo-optimize` for asset optimization

5. **Network Optimization:**
   - Request deduplication via TanStack Query
   - Batch API requests where possible
   - Use GraphQL for complex queries (future)

### Performance Monitoring

```typescript
// mobile/src/utils/performance.ts
import * as Sentry from '@sentry/react-native';

export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const duration = performance.now() - start;

  Sentry.addBreadcrumb({
    category: 'performance',
    message: `${name} took ${duration}ms`,
    level: 'info',
  });

  if (duration > 1000) {
    Sentry.captureMessage(`Slow operation: ${name}`, 'warning');
  }
};
```

## Security Architecture

### Authentication Flow

```
1. User taps "Login with Twitch"
    ↓
2. App opens Twitch OAuth in browser
    ↓
3. User authorizes app
    ↓
4. Twitch redirects to app://callback?code=xxx
    ↓
5. App extracts authorization code
    ↓
6. Exchange code for tokens (backend API)
    ↓
7. Store access token in SecureStore (encrypted)
    ↓
8. Store refresh token in SecureStore
    ↓
9. Load user profile
    ↓
10. Navigate to home screen
```

### Token Management

```typescript
// mobile/src/services/auth-service.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const authService = {
  async saveToken(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  async saveRefreshToken(token: string) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },

  async refreshToken(): Promise<string> {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await apiClient.auth.refresh(refreshToken);
    await this.saveToken(response.accessToken);
    return response.accessToken;
  },

  async logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
```

## Offline Support

### Strategy

```
1. Read Operations:
   - Serve from cache when offline
   - Show "offline" indicator
   - Queue background sync when online

2. Write Operations:
   - Queue mutations in AsyncStorage
   - Show "pending" state in UI
   - Retry when back online
   - Handle conflicts with server
```

### Implementation

```typescript
// mobile/src/utils/offline-queue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedMutation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

class OfflineQueue {
  private queue: QueuedMutation[] = [];

  async add(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>) {
    const item: QueuedMutation = {
      ...mutation,
      id: uuid(),
      timestamp: Date.now(),
    };

    this.queue.push(item);
    await this.persist();
  }

  async processQueue() {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);
    if (!isConnected) return;

    for (const item of this.queue) {
      try {
        await this.processMutation(item);
        this.queue = this.queue.filter(i => i.id !== item.id);
      } catch (error) {
        console.error('Failed to process queued mutation:', error);
      }
    }

    await this.persist();
  }

  private async persist() {
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
}

export const offlineQueue = new OfflineQueue();
```

## Testing Strategy

### Unit Tests (Jest + React Native Testing Library)

```typescript
// mobile/src/components/__tests__/ClipCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ClipCard } from '../ClipCard';

describe('ClipCard', () => {
  it('renders clip title and creator', () => {
    const clip = {
      id: '1',
      title: 'Amazing Play',
      creator: 'shroud',
      views: 1000,
    };

    const { getByText } = render(<ClipCard clip={clip} />);

    expect(getByText('Amazing Play')).toBeTruthy();
    expect(getByText('shroud')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ClipCard clip={mockClip} onPress={onPress} />
    );

    fireEvent.press(getByTestId('clip-card'));
    expect(onPress).toHaveBeenCalledWith(mockClip.id);
  });
});
```

### E2E Tests (Detox)

```typescript
// mobile/e2e/feed.test.ts
describe('Feed Screen', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should display feed with clips', async () => {
    await expect(element(by.id('feed-screen'))).toBeVisible();
    await expect(element(by.id('clip-card-1'))).toBeVisible();
  });

  it('should navigate to clip detail on tap', async () => {
    await element(by.id('clip-card-1')).tap();
    await expect(element(by.id('clip-detail-screen'))).toBeVisible();
  });

  it('should load more clips on scroll', async () => {
    await element(by.id('feed-list')).scrollTo('bottom');
    await waitFor(element(by.id('clip-card-20')))
      .toBeVisible()
      .withTimeout(2000);
  });
});
```

## Deployment Pipeline

### Build Profiles (eas.json)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "distribution": "store",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "team@clipper.app",
        "ascAppId": "1234567890",
        "appleTeamId": "ABC123"
      },
      "android": {
        "serviceAccountKeyPath": "./secrets/google-play.json",
        "track": "internal"
      }
    }
  }
}
```

### Deployment Flow

```
1. Push to main branch
    ↓
2. GitHub Actions triggered
    ↓
3. Run tests (unit + E2E)
    ↓
4. Build with EAS Build
    ├─ iOS build (ipa)
    └─ Android build (aab)
    ↓
5. Upload to TestFlight (iOS)
   Upload to Google Play Internal (Android)
    ↓
6. Internal testing (QA team)
    ↓
7. Promote to production
    ↓
8. Submit to App Store / Google Play
    ↓
9. OTA update for minor changes
```

## Monitoring & Analytics

### Error Tracking (Sentry)

```typescript
// mobile/src/config/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn,
  enableInExpoDevelopment: false,
  debug: __DEV__,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.ReactNativeTracing({
      tracingOrigins: ['api.clipper.app'],
      routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
    }),
  ],
});
```

### Analytics (PostHog)

```typescript
// mobile/src/config/analytics.ts
import PostHog from 'posthog-react-native';

export const analytics = new PostHog(
  Constants.expoConfig?.extra?.posthogKey,
  { host: Constants.expoConfig?.extra?.posthogHost }
);

// Track screen views
export const trackScreenView = (screenName: string) => {
  analytics.screen(screenName);
};

// Track events
export const trackEvent = (event: string, properties?: object) => {
  analytics.capture(event, properties);
};
```

## Future Considerations

### GraphQL Migration

When REST API becomes too chatty:

- Use Apollo Client for GraphQL
- Share GraphQL schema with web
- Reduce over-fetching with precise queries

### Background Sync

For offline-first experience:

- Implement background fetch
- Use `expo-background-fetch` for iOS
- Use WorkManager for Android

### App Clips / Instant Apps

For viral sharing:

- iOS App Clips (lightweight app snippet)
- Android Instant Apps
- Deep link to specific clips without full install

## References

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
- [NativeWind Documentation](https://www.nativewind.dev/)

---

**Maintainers:** Clipper Engineering Team
**Last Review:** 2025-11-02
**Next Review:** 2026-05-02
