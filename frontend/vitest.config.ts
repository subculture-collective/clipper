import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        passWithNoTests: true,
        testTimeout: 10000,
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/e2e/**',
            '**/.{idea,git,cache,output,temp}/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData',
                'dist/',
            ],
        },
        env: {
            VITE_STRIPE_PRO_MONTHLY_PRICE_ID: 'price_test_monthly',
            VITE_STRIPE_PRO_YEARLY_PRICE_ID: 'price_test_yearly',
            VITE_GA_MEASUREMENT_ID: 'G-TEST123456',
            VITE_ENABLE_ANALYTICS: 'true',
            VITE_DOMAIN: 'test.clpr.tv',
        },
    },
});
