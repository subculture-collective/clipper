import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
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
            // Use Vite's provided `mode` instead of NODE_ENV for reliability
            disable: !process.env.SENTRY_AUTH_TOKEN || mode !== 'production',
            // Align the upload release with runtime init
            release: (() => {
                const name = process.env.VITE_SENTRY_RELEASE || process.env.SENTRY_RELEASE;
                return name ? { name } : undefined;
            })(),
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
        }) as Plugin] : []),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        // Generate source maps for production
        sourcemap: true,
        rollupOptions: {
            output: {
                // Smart vendor chunking: Keep React with app bundle to avoid race conditions
                // Split only truly heavy optional dependencies
                manualChunks(id) {
                    // Split heavy optional dependencies into separate chunks
                    // These are loaded on-demand and don't need to be in critical path
                    if (id.includes('node_modules/recharts')) {
                        return 'recharts';
                    }
                    if (id.includes('node_modules/react-markdown') ||
                        id.includes('node_modules/remark')) {
                        return 'markdown';
                    }
                    if (id.includes('node_modules/lodash')) {
                        return 'lodash';
                    }
                    // Everything else (including React) stays in main bundle
                },
                entryFileNames: 'assets/app-[hash].js',
                chunkFileNames: 'assets/chunk-[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
            treeshake: true,
        },
        // Keep CSS in the same output for consistent load ordering
        cssCodeSplit: false,
        // Reasonable chunk size warning limit
        chunkSizeWarningLimit: 600,
        // Use esbuild minifier (default, faster than terser)
        minify: 'esbuild',
    },
}));
