import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        // Upload source maps to Sentry on production builds
        sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            // Only upload on production builds when auth token is set
            disable: !process.env.SENTRY_AUTH_TOKEN || process.env.NODE_ENV !== 'production',
            sourcemaps: {
                assets: './dist/**',
                filesToDeleteAfterUpload: ['**/*.js.map', '**/*.mjs.map'],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Generate source maps for production
        sourcemap: true,
    },
});
