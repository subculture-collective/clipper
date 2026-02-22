#!/usr/bin/env node
/**
 * Build script for the Clipper browser extension.
 * Bundles TypeScript source files using esbuild and copies static assets to dist/.
 */

import { build } from 'esbuild';
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

  // Copy static assets
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

  // Copy icons
  const iconsDir = join(__dirname, 'icons');
  if (existsSync(iconsDir)) {
    cpSync(iconsDir, join(outDir, 'icons'), { recursive: true });
  }

  console.log('✅ Extension built to dist/');
}

if (isWatch) {
  // Watch mode: use esbuild's watch API
  const contexts = await Promise.all([
    build({
      ...sharedOptions,
      entryPoints: [join(__dirname, 'src/background.ts')],
      outfile: join(outDir, 'background.js'),
      watch: true,
    }).catch(() => null),
  ]);
  console.log('👀 Watching for changes...');
  process.on('SIGINT', () => {
    contexts.forEach(ctx => ctx?.dispose?.());
    process.exit(0);
  });
} else {
  buildExtension().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
