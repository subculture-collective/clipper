# Mobile First Implementation

This document outlines the implementation of the Clipper mobile application using React Native and Expo.

## Overview

The Clipper mobile app is a React Native application built with Expo, designed to provide a native mobile experience for browsing, discovering, and interacting with Twitch clips on iOS and Android devices.

## Architecture

### Technology Stack

- **React Native**: 0.76.3
- **Expo**: ~52.0.7
- **Expo Router**: ~4.0.10 (file-based routing)
- **TypeScript**: 5.3.3
- **Axios**: HTTP client for API communication

### Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab-based navigation
│   │   ├── _layout.tsx   # Tab navigator configuration
│   │   ├── index.tsx     # Home/Feed screen
│   │   ├── search.tsx    # Search screen
│   │   ├── favorites.tsx # Favorites screen
│   │   └── profile.tsx   # Profile screen
│   ├── _layout.tsx        # Root layout
│   └── +not-found.tsx     # 404 screen
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation utilities
│   ├── services/          # API services
│   │   ├── api.ts        # Axios instance configuration
│   │   └── clipService.ts # Clip-related API calls
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript types
│   └── config/            # Configuration
│       └── env.ts         # Environment configuration
├── assets/                # Images, fonts, icons
├── app.json               # Expo configuration
├── babel.config.js        # Babel configuration
├── tsconfig.json          # TypeScript configuration
├── .eslintrc.js           # ESLint configuration
├── .prettierrc            # Prettier configuration
└── package.json           # Dependencies and scripts
```

## Monorepo Integration

The mobile app is integrated into the Clipper monorepo using npm workspaces:

### Workspace Structure

```
clipper/
├── frontend/              # Web application
├── mobile/                # Mobile application (this)
├── shared/                # Shared TypeScript packages
│   └── src/
│       ├── types/        # Shared type definitions
│       └── constants/    # Shared constants
├── backend/               # Go backend
└── package.json           # Root workspace configuration
```

### Shared Package (`@clipper/shared`)

The `@clipper/shared` package contains TypeScript types and constants that are shared between the web and mobile applications:

**Types:**
- `Clip`: Clip model interface
- `ClipFeedResponse`: API response for clip feeds
- `ClipFeedFilters`: Filter options for clip queries
- `ApiResponse<T>`: Generic API response wrapper
- `PaginatedResponse<T>`: Paginated data structure

**Constants:**
- `API_BASE_URL`: Base URL for the API
- `API_VERSION`: API version
- `API_URL`: Full API URL
- `DEFAULT_PAGE_SIZE`: Default pagination size
- `MAX_PAGE_SIZE`: Maximum pagination size

## Features

### Navigation

The app uses Expo Router for file-based routing with a tab-based navigation structure:

1. **Feed**: Browse trending and latest clips
2. **Search**: Search for clips, streamers, and games
3. **Favorites**: View saved favorite clips
4. **Profile**: User profile and settings

### API Integration

#### Services Layer

**`api.ts`**: Configures Axios with:
- Base URL from environment configuration
- Request/response interceptors
- Error handling
- Future authentication token injection

**`clipService.ts`**: Provides methods for:
- `getClips()`: Fetch clip feed with filters
- `getClipById()`: Get a specific clip
- `voteClip()`: Vote on a clip
- `favoriteClip()`: Add clip to favorites
- `unfavoriteClip()`: Remove clip from favorites

### Environment Configuration

Environment variables are managed through:

1. **`.env.example`**: Template for environment variables
2. **`src/config/env.ts`**: Centralized configuration with fallbacks

Supported environment variables:
- `API_BASE_URL`: Backend API URL (default: `http://localhost:8080`)
- `ENV`: Environment name (default: `development`)

## Development Setup

### Prerequisites

- Node.js 20+
- npm or yarn
- iOS Simulator (macOS only) or Android Emulator
- Expo Go app (optional, for physical device testing)

### Installation

From the repository root:

```bash
# Install all dependencies
npm install

# Build shared package
npm run shared:build
```

### Running the App

```bash
# Start the Expo development server
npm run mobile:start

# Run on iOS simulator (macOS only)
npm run mobile:ios

# Run on Android emulator
npm run mobile:android
```

### Development Commands

```bash
# Lint code
npm run mobile:lint

# Type check
npm run mobile:type-check

# Run tests
npm run mobile:test
```

## Code Quality

### Linting and Formatting

- **ESLint**: Configured with `eslint-config-universe/native` and Prettier
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict type checking

### Git Hooks

Pre-commit hooks (via Husky and lint-staged):
- Automatic linting on staged files
- Code formatting enforcement

### CI/CD

GitHub Actions workflow (`.github/workflows/mobile-ci.yml`):
- Linting
- Testing
- Build verification for Android and iOS

## Known Issues and Limitations

### TypeScript Type Checking

There is currently a known issue with TypeScript type checking related to React 18 types and React Native components. The error manifests as:

```
'Tabs' cannot be used as a JSX component.
Type 'bigint' is not assignable to type 'ReactNode'.
```

**Status**: This is a compatibility issue between @types/react versions and React Native. The code works correctly at runtime and passes ESLint checks.

**Workaround**: Type checking uses `skipLibCheck: true` in tsconfig.json to avoid these errors while maintaining type safety for application code.

**Tracking**: This issue affects many React Native projects using recent React 18 types and is being addressed by the React Native and Expo teams.

## API Integration

### Authentication

Authentication will be implemented using:
- Expo SecureStore for token storage
- Axios interceptors for automatic token injection
- Twitch OAuth flow (future implementation)

### Endpoints

The mobile app connects to the same backend API as the web application:

**Base URL**: Configured via environment variable
**API Version**: v1
**Endpoints**:
- `GET /api/v1/clips/feed` - Get clip feed
- `GET /api/v1/clips/:id` - Get specific clip
- `POST /api/v1/clips/vote` - Vote on clip
- `POST /api/v1/clips/favorite` - Favorite a clip
- `DELETE /api/v1/clips/favorite/:id` - Unfavorite a clip

## Testing Strategy

### Unit Tests

- Jest and Jest-Expo for testing framework
- React Test Renderer for component testing
- Test coverage for:
  - Services and API calls
  - Utility functions
  - Component rendering

### E2E Testing

Future implementation with Detox or Maestro for:
- User flow testing
- Navigation testing
- Integration testing

## Building for Production

### iOS

```bash
# Using EAS Build (recommended)
npx eas build --platform ios

# Local build (requires macOS and Xcode)
cd ios && pod install && cd ..
npx expo run:ios --configuration Release
```

### Android

```bash
# Using EAS Build (recommended)
npx eas build --platform android

# Local build
npx expo run:android --variant release
```

## Deployment

### App Store Distribution

1. **iOS**: Distribute via Apple App Store Connect
2. **Android**: Distribute via Google Play Console

### Over-the-Air (OTA) Updates

Expo provides OTA updates for JavaScript and asset changes without requiring app store submissions.

## Future Enhancements

### Planned Features

1. **Authentication**
   - Twitch OAuth integration
   - Persistent login state
   - Profile management

2. **Offline Support**
   - Local caching with AsyncStorage
   - Offline clip viewing
   - Sync when online

3. **Push Notifications**
   - New clip notifications
   - Favorite streamer updates
   - Comment replies

4. **Enhanced UI**
   - Dark mode support
   - Animations and transitions
   - Pull-to-refresh

5. **Video Player**
   - Native video playback
   - Picture-in-picture mode
   - Playback controls

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make changes and ensure linting passes
3. Submit a pull request
4. CI must pass before merging

### Code Style

- Follow existing patterns and conventions
- Use TypeScript for all new code
- Write meaningful component and function names
- Add comments for complex logic

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Consult the team in discussions

---

**Last Updated**: 2025-11-03
**Version**: 0.1.0
**Status**: Initial implementation complete
