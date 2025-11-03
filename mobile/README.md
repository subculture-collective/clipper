# Clipper Mobile App

React Native mobile application for Clipper, built with Expo.

## Features

- 📱 Native iOS and Android support
- 🎬 Browse and discover Twitch clips
- 🔍 Search functionality
- ⭐ Save favorite clips
- 👤 User profiles and authentication
- 🎨 Modern UI with React Native

## Prerequisites

- Node.js 20+
- npm or yarn
- iOS Simulator (macOS only) or Android Emulator
- Expo Go app (for physical device testing)

## Getting Started

### Install Dependencies

From the repository root:

```bash
npm install
```

Or from the mobile directory:

```bash
cd mobile
npm install
```

### Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
API_BASE_URL=http://localhost:8080
ENV=development
```

### Running the App

Start the development server:

```bash
npm run start
```

Run on iOS simulator:

```bash
npm run ios
```

Run on Android emulator:

```bash
npm run android
```

Run in web browser:

```bash
npm run web
```

### Using Expo Go

1. Install Expo Go on your physical device
2. Start the dev server with `npm run start`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)

## Development

### Project Structure

```
mobile/
├── app/              # Expo Router screens
│   ├── (tabs)/      # Tab-based navigation
│   ├── _layout.tsx  # Root layout
│   └── +not-found.tsx
├── src/
│   ├── components/  # Reusable components
│   ├── screens/     # Screen components
│   ├── navigation/  # Navigation configuration
│   ├── services/    # API services
│   ├── hooks/       # Custom React hooks
│   ├── utils/       # Utility functions
│   ├── types/       # TypeScript types
│   └── config/      # Configuration
├── assets/          # Images, fonts, etc.
└── app.json         # Expo configuration
```

### Shared Package

This app uses `@clipper/shared` for shared types and constants with the web application:

```typescript
import { Clip, ClipFeedResponse } from '@clipper/shared';
```

### Code Style

- ESLint for linting
- Prettier for code formatting
- TypeScript for type safety

Run linting:

```bash
npm run lint
```

Fix linting issues:

```bash
npm run lint:fix
```

### Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

### Type Checking

```bash
npm run type-check
```

## Building for Production

### iOS

```bash
npx eas build --platform ios
```

### Android

```bash
npx eas build --platform android
```

## Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)

## Troubleshooting

### Clear cache and restart

```bash
npm run start -- --clear
```

### Reset dependencies

```bash
rm -rf node_modules
npm install
```

### iOS build issues

```bash
cd ios
pod install
cd ..
```

## Contributing

Please read the main [CONTRIBUTING.md](../CONTRIBUTING.md) for development guidelines.
