# Clipper Mobile

Native mobile apps for iOS and Android built with React Native and Expo.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS only) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Running on Simulators

```bash
# iOS (macOS only)
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

## 📁 Project Structure

```
mobile/
├── app/                    # Expo Router file-based routing
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home/Feed
│   │   ├── search.tsx     # Search
│   │   ├── favorites.tsx  # Favorites
│   │   └── profile.tsx    # Profile
│   ├── clip/
│   │   └── [id].tsx       # Clip detail (dynamic route)
│   ├── auth/
│   │   └── login.tsx      # Login screen
│   ├── settings/
│   │   └── index.tsx      # Settings
│   ├── _layout.tsx        # Root layout
│   └── +not-found.tsx     # 404 screen
├── src/                   # Source code
│   ├── components/        # Reusable components (future)
│   ├── hooks/            # Custom hooks (future)
│   ├── services/         # API services (future)
│   └── stores/           # Zustand stores (future)
├── assets/               # Images, fonts, icons
├── app.json             # Expo configuration
├── eas.json             # EAS Build configuration
└── package.json
```

## 🛠 Tech Stack

- **Framework**: React Native 0.76 + Expo 52
- **Routing**: Expo Router (file-based)
- **Styling**: NativeWind (TailwindCSS)
- **State Management**: TanStack Query + Zustand
- **Build System**: EAS Build
- **OTA Updates**: EAS Update
- **Type Safety**: TypeScript

## 🎨 Styling

This project uses NativeWind for styling, which brings TailwindCSS utility classes to React Native:

```tsx
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">
    Hello World
  </Text>
</View>
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📦 Building

### Development Build

```bash
# Build for iOS Simulator
eas build --profile development --platform ios

# Build for Android Emulator
eas build --profile development --platform android
```

### Production Build

```bash
# Build for both platforms
npm run build:production

# Or build individually
eas build --profile production --platform ios
eas build --profile production --platform android
```

## 🚀 Deployment

### Submit to App Stores

```bash
# Submit to both stores
npm run submit

# Or submit individually
eas submit --platform ios
eas submit --platform android
```

### OTA Updates

```bash
# Publish update to production channel
eas update --branch production --message "Bug fixes"

# Publish to preview channel
eas update --branch preview --message "New feature preview"
```

## 🔗 Deep Linking

The app supports deep linking with the `clipper://` scheme:

- `clipper://clip/123` - Open clip with ID 123
- `clipper://user/john` - Open user profile for john
- `clipper://search?q=gaming` - Open search with query

## 📱 Development Tips

### Using Expo Go

For quick iteration, use Expo Go app:

1. Install Expo Go from App Store or Google Play
2. Run `npm start`
3. Scan QR code with camera (iOS) or Expo Go (Android)

### Using Development Build

For full native features:

1. Build development client: `eas build --profile development`
2. Install on device/simulator
3. Run `npm start` and select development build

### Environment Variables

Create `mobile/.env`:

```env
API_URL=http://localhost:8080/api/v1
SENTRY_DSN=your-sentry-dsn
POSTHOG_KEY=your-posthog-key
```

## 🔐 Security

- Auth tokens stored in Expo SecureStore (encrypted)
- API requests use JWT authentication
- Deep links validated before processing
- No secrets in source code

## 🐛 Troubleshooting

### Metro bundler not starting

```bash
# Clear cache
npx expo start -c
```

### iOS build fails

```bash
# Update CocoaPods
cd ios && pod install --repo-update
```

### Android build fails

```bash
# Clean gradle cache
cd android && ./gradlew clean
```

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [RFC 001: Mobile Framework Selection](../docs/rfcs/001-mobile-framework-selection.md)
- [Mobile Architecture](../docs/MOBILE_ARCHITECTURE.md)

## 🤝 Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT - See [LICENSE](../LICENSE) for details.
