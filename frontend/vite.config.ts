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
        // Eliminate React init races by bundling entry as a single JS file
        // so React and ReactDOM initialize in the same execution unit.
        rollupOptions: {
            output: {
                // Disable manual vendor chunking
                manualChunks: undefined,
                // Inline dynamic imports at the entry to avoid multi-chunk init ordering issues
                inlineDynamicImports: true,
                entryFileNames: 'assets/app-[hash].js',
                chunkFileNames: 'assets/chunk-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]',
            },
            treeshake: true,
        },
        // Keep CSS in the same output for consistent load ordering
        cssCodeSplit: false,
        // Increase chunk size warning limit since we may have a larger single bundle
        chunkSizeWarningLimit: 1200,
        // Use esbuild minifier (default, faster than terser)
        minify: 'esbuild',
    },
}));
