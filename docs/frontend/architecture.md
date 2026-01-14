---
title: "Frontend Architecture"
summary: "React frontend architecture, components, state management, and patterns."
tags: ["frontend", "react", "architecture"]
area: "frontend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["frontend", "react architecture"]
---

# Frontend Architecture

Architecture and design patterns for the Clipper React frontend.

## Overview

- **Framework**: React 19
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS + CSS Modules
- **Routing**: React Router v6
- **State Management**: TanStack Query + Zustand
- **HTTP Client**: Axios (with TanStack Query)

## Project Structure

```
frontend/
├── public/          # Static assets
├── src/
│   ├── components/  # Reusable UI components
│   │   ├── ui/      # Base components (Button, Input, Modal)
│   │   └── layout/  # Layout components (Header, Sidebar)
│   ├── pages/       # Route components
│   ├── hooks/       # Custom React hooks
│   ├── lib/         # API client, utilities
│   ├── stores/      # Zustand stores
│   ├── types/       # TypeScript types
│   ├── styles/      # Global styles
│   └── main.tsx     # Entry point
└── vite.config.ts
```

## Component Architecture

### Component Hierarchy

- **Pages**: Top-level route components (`HomePage`, `ClipPage`, `ProfilePage`)
- **Layout**: Shared layout components (`AppLayout`, `Header`, `Footer`)
- **Features**: Domain-specific components (`ClipCard`, `CommentList`, `SearchBar`)
- **UI**: Generic reusable components (`Button`, `Input`, `Modal`)

### Component Patterns

**Functional Components** (React 19):
```tsx
export function ClipCard({ clip }: { clip: Clip }) {
  return (
    <article className="clip-card">
      <h3>{clip.title}</h3>
      {/* ... */}
    </article>
  );
}
```

**Custom Hooks**:
```tsx
export function useClip(clipId: string) {
  return useQuery({
    queryKey: ['clip', clipId],
    queryFn: () => api.getClip(clipId)
  });
}
```

## State Management

### Server State (TanStack Query)

For API data fetching and caching:
- Clips, comments, user profiles
- Automatic cache invalidation
- Optimistic updates

```tsx
const { data: clip } = useQuery({
  queryKey: ['clip', clipId],
  queryFn: () => api.getClip(clipId)
});

const mutation = useMutation({
  mutationFn: api.upvoteClip,
  onSuccess: () => queryClient.invalidateQueries(['clip', clipId])
});
```

### Client State

For UI state:
- Sidebar open/closed
- Modal visibility
- User preferences

Applications can use React Context API or custom hooks for client-side state management as needed.

## Routing

React Router v6 with nested routes:
```tsx
<Routes>
  <Route path="/" element={<AppLayout />}>
    <Route index element={<HomePage />} />
    <Route path="clip/:id" element={<ClipPage />} />
    <Route path="profile/:username" element={<ProfilePage />} />
    <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
  </Route>
</Routes>
```

Protected routes check auth state:
```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
}
```

## Styling

### TailwindCSS

Utility-first CSS for rapid UI development:
```tsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
  Click Me
</button>
```

### CSS Modules

For component-scoped styles:
```tsx
import styles from './ClipCard.module.css';

<div className={styles.card}>...</div>
```

### Dark Mode

Via TailwindCSS dark mode class:
```tsx
<div className="bg-white dark:bg-gray-900">...</div>
```

## API Integration

Centralized API client:
```tsx
// lib/api.ts
export const api = {
  getClip: (id: string) => axios.get(`/api/v1/clips/${id}`),
  upvoteClip: (id: string) => axios.post(`/api/v1/clips/${id}/upvote`),
  // ...
};
```

Used with TanStack Query hooks:
```tsx
const { data } = useQuery({
  queryKey: ['clip', clipId],
  queryFn: () => api.getClip(clipId)
});
```

## Authentication

JWT stored in `httpOnly` cookie (set by backend).

Auth context:
```tsx
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch current user on mount
    api.getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

## Performance

- **Code Splitting**: Route-based lazy loading
- **Image Optimization**: Lazy loading, responsive images
- **Memoization**: `React.memo`, `useMemo`, `useCallback`
- **Virtualization**: `react-window` for large lists

## Build & Deploy

Built with Vite:
```bash
pnpm build
```

Output: `dist/` folder with optimized static files.

Deploy: Serve via Nginx or CDN.

See [[dev-guide|Frontend Dev Guide]].

---

Related: [[../backend/api|API]] · [[../setup/development|Development]] · [[dev-guide|Dev Guide]]

[[../index|← Back to Index]]
