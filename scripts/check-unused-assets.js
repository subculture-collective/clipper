#!/usr/bin/env node
/**
 * check-unused-assets.js
 *
 * Finds unreferenced files in /docs/_assets/ and warns if any are >500KB.
 * Assets should be referenced from documentation to be considered in use.
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const ASSETS_DIR = path.join(DOCS_DIR, '_assets');
const SIZE_WARN_KB = 500;

// Asset file extensions to check
const ASSET_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.pdf',
  '.mp4',
  '.webm',
]);

/**
 * Walk directory and collect all markdown files
 */
function collectMarkdownFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip hidden directories, vault (secrets), and archives
      if (!entry.name.startsWith('.') && entry.name !== 'vault' && entry.name !== 'archive') {
        collectMarkdownFiles(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Collect all asset files
 */
function collectAssetFiles(dir) {
  const assets = [];

  if (!fs.existsSync(dir)) return assets;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      assets.push(...collectAssetFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) {
        const stats = fs.statSync(fullPath);
        assets.push({
          path: fullPath,
          name: entry.name,
          relative: path.relative(DOCS_DIR, fullPath),
          sizeKB: Math.round(stats.size / 1024),
        });
      }
    }
  }

  return assets;
}

/**
 * Extract all asset references from markdown content
 */
function extractAssetReferences(content) {
  const refs = new Set();

  // Match image references: ![alt](path) or <img src="path">
  const imgRegex = /!\[[^\]]*\]\(([^)]+)\)|<img[^>]+src=["']([^"']+)["']/g;
  let match;

  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1] || match[2];
    if (src && !src.startsWith('http')) {
      // Extract just the filename for comparison
      const filename = path.basename(src.split('#')[0].split('?')[0]);
      refs.add(filename);
    }
  }

  // Match generic link references that might be assets
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];
    if (href && !href.startsWith('http') && !href.startsWith('#')) {
      const ext = path.extname(href).toLowerCase();
      if (ASSET_EXTENSIONS.has(ext)) {
        const filename = path.basename(href.split('#')[0].split('?')[0]);
        refs.add(filename);
      }
    }
  }

  return refs;
}

/**
 * Main function
 */
function main() {
  console.log('🖼️  Checking for unused assets...\n');

  // Check if assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('ℹ️ No _assets directory found in docs/. Skipping asset check.\n');
    console.log('✅ Asset check complete (no assets to check).\n');
    process.exit(0);
  }

  // Collect all assets
  const assets = collectAssetFiles(ASSETS_DIR);

  if (assets.length === 0) {
    console.log('No asset files found in docs/_assets/');
    console.log('✅ Asset check complete.\n');
    process.exit(0);
  }

  console.log(`Found ${assets.length} asset(s) in docs/_assets/\n`);

  // Collect all markdown files and their asset references
  const markdownFiles = collectMarkdownFiles(DOCS_DIR);
  const allRefs = new Set();

  for (const file of markdownFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const refs = extractAssetReferences(content);
      refs.forEach((ref) => allRefs.add(ref));
    } catch (err) {
      console.error(`Error reading ${file}: ${err.message}`);
    }
  }

  // Also check README.md in root
  const readmePath = path.join(__dirname, '..', 'README.md');
  if (fs.existsSync(readmePath)) {
    try {
      const content = fs.readFileSync(readmePath, 'utf-8');
      const refs = extractAssetReferences(content);
      refs.forEach((ref) => allRefs.add(ref));
    } catch (err) {
      // Ignore errors
    }
  }

  // Find unused assets
  const unused = [];
  const large = [];

  for (const asset of assets) {
    if (!allRefs.has(asset.name)) {
      unused.push(asset);
    }

    if (asset.sizeKB > SIZE_WARN_KB) {
      large.push(asset);
    }
  }

  // Report results
  let hasIssues = false;

  if (large.length > 0) {
    console.log(`⚠️ Found ${large.length} large asset(s) (>${SIZE_WARN_KB}KB):\n`);
    for (const asset of large.sort((a, b) => b.sizeKB - a.sizeKB)) {
      console.log(`  📦 ${asset.relative} (${asset.sizeKB}KB)`);
    }
    console.log('\nConsider optimizing these assets to reduce repository size.\n');
    hasIssues = true;
  }

  if (unused.length > 0) {
    console.log(`⚠️ Found ${unused.length} unreferenced asset(s):\n`);
    for (const asset of unused.sort((a, b) => a.relative.localeCompare(b.relative))) {
      console.log(`  🗑️  ${asset.relative} (${asset.sizeKB}KB)`);
    }
    console.log('\nThese assets are not referenced in any documentation.');
    console.log('Consider removing them or adding references.\n');
    hasIssues = true;
  }

  if (!hasIssues) {
    console.log('✅ All assets are referenced and within size limits!\n');
  }

  // Exit with 0 - unused assets are warnings, not errors
  process.exit(0);
}

main();
