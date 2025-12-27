// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // React Native 0.81+ best practices
      // Note: Custom rule for pointerEvents prop deprecation can be added
      // via eslint-plugin-react-native when available
      // Inline styles are allowed here because we use NativeWind/Tailwind.
    },
  },
];
