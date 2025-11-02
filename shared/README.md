# @clipper/shared

Shared TypeScript code between Clipper web and mobile applications.

## Contents

- **types/**: TypeScript type definitions (models, API types)
- **constants/**: Shared constants and configuration
- **utils/**: Shared utility functions (future)

## Usage

### In Web Frontend

```typescript
import { Clip, User, ApiResponse } from '@clipper/shared';

const clip: Clip = {
  id: '123',
  title: 'Amazing play',
  // ...
};
```

### In Mobile App

```typescript
import { Clip, User, DEFAULT_PAGE_SIZE } from '@clipper/shared';

const fetchClips = async (page: number = 1) => {
  const response = await api.get<ApiResponse<Clip[]>>('/clips', {
    params: { page, perPage: DEFAULT_PAGE_SIZE }
  });
  return response.data;
};
```

## Development

```bash
# Type check
npm run type-check
```

## Benefits

1. **Single Source of Truth**: Data models defined once, used everywhere
2. **Type Safety**: Catch type errors at compile time across web and mobile
3. **Consistency**: Ensure web and mobile use the same data structures
4. **DRY**: Don't repeat yourself - no duplicate type definitions
5. **Maintainability**: Update types in one place, reflected everywhere
