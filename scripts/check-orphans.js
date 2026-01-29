#!/usr/bin/env node
/**
 * check-orphans.js
 *
 * Finds orphan documentation pages that are not reachable from /docs/index.md.
 * Uses BFS traversal to find all reachable pages.
 * Reports unreachable .md files (with allowlist for changelog.md, etc.)
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const INDEX_PATH = path.join(DOCS_DIR, 'index.md');

// Files that are allowed to be orphans (not linked from index)
const ALLOWLIST = new Set([
  'changelog.md',
  'CHANGELOG.md',
  'contributing.md',
  'CONTRIBUTING.md',
]);

// Directories to skip (archives, vault for secrets, etc.)
const SKIP_DIRS = new Set(['archive', '.obsidian', 'adr', 'vault']);

/**
 * Walk directory and collect all markdown files
 */
function collectMarkdownFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) {
        collectMarkdownFiles(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract all links from markdown content
 * Handles both [[wikilinks]] and [text](path.md) formats
 */
function extractLinks(content, currentFile) {
  const links = new Set();

  // Match wikilinks: [[path]] or [[path|alias]]
  const wikilinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  let match;

  while ((match = wikilinkRegex.exec(content)) !== null) {
    let linkPath = match[1].trim();

    // Remove anchor if present
    if (linkPath.includes('#')) {
      linkPath = linkPath.split('#')[0];
    }

    if (linkPath) {
      // Resolve relative to docs directory
      const resolved = resolveLink(linkPath, currentFile);
      if (resolved) links.add(resolved);
    }
  }

  // Match markdown links: [text](path.md) or [text](path)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  while ((match = mdLinkRegex.exec(content)) !== null) {
    let href = match[2].trim();

    // Skip external links, anchors only, and http links
    if (
      href.startsWith('http') ||
      href.startsWith('#') ||
      href.startsWith('mailto:')
    ) {
      continue;
    }

    // Remove anchor if present
    if (href.includes('#')) {
      href = href.split('#')[0];
    }

    if (href) {
      const resolved = resolveLink(href, currentFile);
      if (resolved) links.add(resolved);
    }
  }

  return links;
}

/**
 * Resolve a link path to an absolute file path
 */
function resolveLink(linkPath, currentFile) {
  // Handle wikilink-style paths (relative to docs root)
  if (!linkPath.startsWith('.') && !linkPath.startsWith('/')) {
    // Try resolving from docs root
    let resolved = path.join(DOCS_DIR, linkPath);
    if (!resolved.endsWith('.md')) resolved += '.md';

    if (fs.existsSync(resolved)) {
      return path.resolve(resolved);
    }

    // Try resolving from current file's directory
    const fromCurrent = path.resolve(path.dirname(currentFile), linkPath);
    let resolvedFromCurrent = fromCurrent;
    if (!resolvedFromCurrent.endsWith('.md'))
      resolvedFromCurrent += '.md';

    if (fs.existsSync(resolvedFromCurrent)) {
      return resolvedFromCurrent;
    }
  }

  // Handle relative paths
  let resolved = path.resolve(path.dirname(currentFile), linkPath);
  if (!resolved.endsWith('.md')) resolved += '.md';

  if (fs.existsSync(resolved)) {
    return resolved;
  }

  return null;
}

/**
 * BFS traversal from index.md to find all reachable pages
 */
function findReachablePages(startFile) {
  const visited = new Set();
  const queue = [startFile];

  while (queue.length > 0) {
    const current = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    try {
      const content = fs.readFileSync(current, 'utf-8');
      const links = extractLinks(content, current);

      for (const link of links) {
        if (!visited.has(link)) {
          queue.push(link);
        }
      }
    } catch (err) {
      // File doesn't exist or can't be read - skip
    }
  }

  return visited;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Checking for orphan pages...\n');

  // Check if index exists
  if (!fs.existsSync(INDEX_PATH)) {
    console.log('⚠️ docs/index.md not found. Skipping orphan check.\n');
    process.exit(0);
  }

  // Collect all markdown files
  const allFiles = collectMarkdownFiles(DOCS_DIR);

  if (allFiles.length === 0) {
    console.log('No markdown files found in docs/');
    process.exit(0);
  }

  // Find all reachable pages from index
  const reachable = findReachablePages(INDEX_PATH);

  // Find orphans
  const orphans = [];

  for (const file of allFiles) {
    const resolved = path.resolve(file);
    const relative = path.relative(DOCS_DIR, file);
    const basename = path.basename(file);

    // Skip allowlisted files
    if (ALLOWLIST.has(basename)) continue;

    // Skip index files (they're hubs)
    if (basename === 'index.md') continue;

    // Check if reachable
    if (!reachable.has(resolved)) {
      orphans.push(relative);
    }
  }

  // Report results
  if (orphans.length === 0) {
    console.log(
      `✅ All ${allFiles.length} documentation pages are reachable from index.md!\n`,
    );
    process.exit(0);
  } else {
    console.log(
      `⚠️ Found ${orphans.length} orphan page(s) not reachable from index.md:\n`,
    );

    for (const orphan of orphans.sort()) {
      console.log(`  📄 docs/${orphan}`);
    }

    console.log('\nTo fix:');
    console.log('  1. Add links to these pages from index.md or other pages');
    console.log('  2. Or move them to docs/archive/ if deprecated');
    console.log('  3. Or add to ALLOWLIST in check-orphans.js if intentional\n');

    // Exit with warning (0) instead of error - orphans are often expected
    process.exit(0);
  }
}

main();
