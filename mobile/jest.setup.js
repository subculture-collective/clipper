// Add custom jest matchers from jest-dom
import '@testing-library/jest-dom';

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));
