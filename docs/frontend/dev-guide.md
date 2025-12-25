---
title: "Frontend Development Guide"
summary: "Setup, workflow, and best practices for React frontend development."
tags: ["frontend", "development", "guide"]
area: "frontend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["frontend guide", "react dev"]
---

# Frontend Development Guide

Setup, development workflow, and best practices for the Clipper frontend.

## Quick Start

```bash
cd frontend
pnpm install
pnpm dev
```

App runs at: `http://localhost:5173`

## Development Workflow

### Project Scripts

- `pnpm dev` - Start dev server (Vite)
- `pnpm build` - Production build
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests (Vitest)
- `pnpm typecheck` - TypeScript type checking

### File Organization

Create new components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// src/components/ui/index.ts
export * from './Button';
```

Create new pages:
```tsx
// src/pages/HomePage.tsx
export function HomePage() {
  return <div>...</div>;
}
```

### API Integration

Add new API endpoint:
```tsx
// lib/api.ts
export const api = {
  getClips: () => axios.get<Clip[]>('/api/v1/clips'),
  // Add new endpoint here
};
```

Use with TanStack Query:
```tsx
// hooks/useClips.ts
export function useClips() {
  return useQuery({
    queryKey: ['clips'],
    queryFn: api.getClips
  });
}
```

### Routing

Add new route in `App.tsx`:
```tsx
<Route path="/new-page" element={<NewPage />} />
```

## Styling

### TailwindCSS

Configure `tailwind.config.js`:
```js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { /* custom colors */ }
    }
  }
};
```

Use utility classes:
```tsx
<div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-800">
  {/* ... */}
</div>
```

### CSS Modules

For component-specific styles:
```tsx
// ClipCard.module.css
.card { /* ... */ }

// ClipCard.tsx
import styles from './ClipCard.module.css';
<div className={styles.card}>...</div>
```

## Testing

### Unit Tests (Vitest)

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

test('renders button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByText('Click')).toBeInTheDocument();
});
```

Run tests:
```bash
pnpm test
```

### E2E Tests (Playwright)

```ts
test('user can browse clips', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Latest Clips')).toBeVisible();
});
```

Run E2E tests:
```bash
pnpm test:e2e
```

## Environment Variables

Create `.env.local`:
```bash
VITE_API_URL=http://localhost:8080
VITE_TWITCH_CLIENT_ID=your_client_id
```

Access in code:
```tsx
const apiUrl = import.meta.env.VITE_API_URL;
```

See [[../setup/environment|Environment]].

## Code Quality

### ESLint

Configure `.eslintrc.json`:
```json
{
  "extends": ["eslint:recommended", "plugin:react/recommended"],
  "rules": {
    "react/react-in-jsx-scope": "off"
  }
}
```

Run linter:
```bash
pnpm lint
```

### Prettier

Auto-format code:
```bash
pnpm format
```

### TypeScript

Strict mode enabled in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Type check:
```bash
pnpm typecheck
```

## Build Process

### Development Build

```bash
pnpm dev
```

- Hot module replacement (HMR)
- Source maps
- Fast refresh

### Production Build

```bash
pnpm build
```

Output: `dist/`

Optimizations:
- Minified JavaScript/CSS
- Tree shaking
- Code splitting
- Asset hashing

### Preview Production Build

```bash
pnpm preview
```

Test production build locally before deploying.

## Deployment

Build and deploy to CDN or static hosting:
```bash
pnpm build
# Upload dist/ to S3, Vercel, Netlify, etc.
```

Or serve with Nginx (see [[../operations/deployment|Deployment]]).

## Best Practices

- Use TypeScript for type safety
- Keep components small and focused
- Extract custom hooks for reusable logic
- Use TanStack Query for server state
- Lazy load routes for code splitting
- Optimize images (lazy loading, WebP)
- Write tests for critical flows

---

Related: [[architecture|Frontend Architecture]] · [[../backend/api|API]] · [[../setup/development|Development]]

[[../index|← Back to Index]]
