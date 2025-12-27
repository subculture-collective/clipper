// Jest setup file

// Mock expo modules
jest.mock('expo-constants', () => ({
    default: {
        expoConfig: {
            slug: 'mobile',
            version: '1.0.0',
            extra: {},
        },
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));

// Silence console warnings in tests
global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
};
