import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
        // Bundle analyzer - only in analyze mode
        ...(mode === 'analyze' ? [visualizer({
            filename: './dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
        }) as any] : []),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Generate source maps for production
        sourcemap: true,
        // Optimize chunk splitting for better caching and loading performance
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Separate vendor chunks for better caching
                    if (id.includes('node_modules')) {
                        // React and related libraries
                        if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                            return 'react-vendor';
                        }
                        // Tanstack Query
                        if (id.includes('@tanstack/react-query')) {
                            return 'query-vendor';
                        }
                        // Charts library
                        if (id.includes('recharts') || id.includes('d3-')) {
                            return 'chart-vendor';
                        }
                        // Sentry for error tracking
                        if (id.includes('@sentry')) {
                            return 'sentry';
                        }
                        // Date and utility libraries
                        if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
                            return 'ui-vendor';
                        }
                        // All other node_modules
                        return 'vendor';
                    }
                },
            },
        },
        // Increase chunk size warning limit since we're optimizing chunks
        chunkSizeWarningLimit: 600,
        // Use esbuild minifier (default, faster than terser)
        minify: 'esbuild',
    },
}));
