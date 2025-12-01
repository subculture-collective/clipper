# Mobile Implementation Guide

Setup, development workflow, and deployment for the Clipper React Native app.

## Quick Start

```bash
cd mobile
pnpm install
pnpm start
```

Choose platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app

## Prerequisites

- Node.js 18+
- Xcode (for iOS)
- Android Studio (for Android)
- Expo CLI: `npm install -g expo-cli`

## Development Workflow

### Project Scripts

- `pnpm start` - Start Expo dev server
- `pnpm ios` - Run on iOS simulator
- `pnpm android` - Run on Android emulator
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests (Jest)
- `pnpm typecheck` - TypeScript type checking

### Hot Reloading

Expo provides fast refresh:
- Edit code → app updates instantly
- State preserved across reloads

### Debugging

- Shake device → open dev menu
- Enable "Debug Remote JS" → Chrome DevTools
- Use React DevTools: `npx react-devtools`

## Platform-Specific Setup

### iOS

Install CocoaPods dependencies:
```bash
cd ios
pod install
cd ..
```

Run simulator:
```bash
pnpm ios
```

### Android

Start emulator in Android Studio, then:
```bash
pnpm android
```

## Environment Variables

Create `.env`:
```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_TWITCH_CLIENT_ID=your_client_id
```

Access in code:
```tsx
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
```

See [[../setup/environment|Environment]].

## Testing

### Unit Tests (Jest)

```tsx
import { render, screen } from '@testing-library/react-native';
import { ClipCard } from './ClipCard';

test('renders clip card', () => {
  render(<ClipCard clip={mockClip} />);
  expect(screen.getByText('Test Clip')).toBeTruthy();
});
```

Run tests:
```bash
pnpm test
```

### E2E Tests (Detox)

```ts
describe('Clip Feed', () => {
  it('should display clips', async () => {
    await element(by.id('clip-feed')).toBeVisible();
    await element(by.text('Latest Clips')).tap();
  });
});
```

Run E2E tests:
```bash
pnpm test:e2e
```

## Building

### Development Build

EAS Build for development:
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

Install on device:
```bash
eas build:run --platform ios
```

### Production Build

Configure `eas.json`:
```json
{
  "build": {
    "production": {
      "ios": {
        "distribution": "store",
        "bundleIdentifier": "com.clipper.app"
      },
      "android": {
        "distribution": "store",
        "buildType": "apk"
      }
    }
  }
}
```

Build:
```bash
eas build --profile production --platform all
```

### App Signing

**iOS**: Apple Developer account required
- Create App ID, provisioning profile
- Configure in `app.json`

**Android**: Generate keystore
```bash
keytool -genkeypair -v -keystore clipper.keystore -alias clipper -keyalg RSA -keysize 2048 -validity 10000
```

Upload to EAS:
```bash
eas credentials
```

## Deployment

### TestFlight (iOS)

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

Submit to TestFlight via App Store Connect.

### Google Play (Android)

```bash
eas build --profile production --platform android
eas submit --platform android
```

Upload to Google Play Console.

## Over-the-Air Updates

Expo supports OTA updates (JavaScript/assets only):
```bash
eas update --branch production --message "Fix bug"
```

Users get updates without app store approval.

## Deep Linking

Test deep links:
```bash
# iOS
xcrun simctl openurl booted clipper://clip/abc123

# Android
adb shell am start -a android.intent.action.VIEW -d clipper://clip/abc123
```

See [[architecture|Mobile Architecture]].

## Performance Optimization

- Use `FlashList` instead of `FlatList`
- Optimize images with `expo-image`
- Enable Hermes engine (faster JavaScript)
- Profile with Flipper

## Best Practices

- Use TypeScript for type safety
- Keep components small and focused
- Extract custom hooks for reusable logic
- Use TanStack Query for API calls
- Test on both iOS and Android
- Handle offline gracefully
- Optimize images and assets

---

Related: [[architecture|Mobile Architecture]] · [[../backend/api|API]] · [[../setup/development|Development]]

[[../index|← Back to Index]]
