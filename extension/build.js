#!/usr/bin/env node
/**
 * Build script for the Clipper browser extension.
 * Bundles TypeScript source files using esbuild and copies static assets to dist/.
 */

import { build, context } from 'esbuild';
import { cpSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const outDir = join(__dirname, 'dist');

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'popup'), { recursive: true });
mkdirSync(join(outDir, 'icons'), { recursive: true });

/** @type {import('esbuild').BuildOptions} */
const sharedOptions = {
  bundle: true,
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  minify: !isWatch,
  sourcemap: isWatch,
};

/** Copy static assets that do not need bundling. */
function copyStaticAssets() {
  copyFileSync(
    join(__dirname, 'manifest.json'),
    join(outDir, 'manifest.json')
  );

  copyFileSync(
    join(__dirname, 'src/popup/popup.html'),
    join(outDir, 'popup/popup.html')
  );

  copyFileSync(
    join(__dirname, 'src/popup/popup.css'),
    join(outDir, 'popup/popup.css')
  );

  const iconsDir = join(__dirname, 'icons');
  if (existsSync(iconsDir)) {
    cpSync(iconsDir, join(outDir, 'icons'), { recursive: true });
  }
}

async function buildExtension() {
  // Build background service worker
  await build({
    ...sharedOptions,
    entryPoints: [join(__dirname, 'src/background.ts')],
    outfile: join(outDir, 'background.js'),
  });

  // Build content script (must be IIFE for content scripts)
  await build({
    ...sharedOptions,
    format: 'iife',
    entryPoints: [join(__dirname, 'src/content.ts')],
    outfile: join(outDir, 'content.js'),
  });

  // Build popup script
  await build({
    ...sharedOptions,
    entryPoints: [join(__dirname, 'src/popup/popup.ts')],
    outfile: join(outDir, 'popup/popup.js'),
  });

  copyStaticAssets();

  console.log('✅ Extension built to dist/');
}

async function watchExtension() {
  // Use esbuild context() API for proper watch support.
  const [bgCtx, contentCtx, popupCtx] = await Promise.all([
    context({
      ...sharedOptions,
      entryPoints: [join(__dirname, 'src/background.ts')],
      outfile: join(outDir, 'background.js'),
    }),
    context({
      ...sharedOptions,
      format: 'iife',
      entryPoints: [join(__dirname, 'src/content.ts')],
      outfile: join(outDir, 'content.js'),
    }),
    context({
      ...sharedOptions,
      entryPoints: [join(__dirname, 'src/popup/popup.ts')],
      outfile: join(outDir, 'popup/popup.js'),
    }),
  ]);

  await Promise.all([bgCtx.watch(), contentCtx.watch(), popupCtx.watch()]);

  copyStaticAssets();
  console.log('👀 Watching for changes...');

  process.on('SIGINT', async () => {
    await Promise.all([bgCtx.dispose(), contentCtx.dispose(), popupCtx.dispose()]);
    process.exit(0);
  });
}

if (isWatch) {
  watchExtension().catch(err => {
    console.error('Watch failed:', err);
    process.exit(1);
  });
} else {
  buildExtension().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
