#!/usr/bin/env node
/**
 * check-anchors.js
 *
 * Validates that internal anchor links point to existing headings.
 * Builds a heading→anchor map and ensures [text](#anchor) targets exist.
 * Ignores [[wikilinks]] as they are handled by Obsidian.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const README_PATH = path.join(__dirname, '..', 'README.md');

/**
 * Convert heading text to anchor format (GitHub style)
 */
function headingToAnchor(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(content) {
  const headings = new Set();
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const anchor = headingToAnchor(match[1]);
    headings.add(anchor);
  }

  return headings;
}

/**
 * Extract anchor links from markdown content
 * Matches [text](#anchor) but ignores [[wikilinks]]
 */
function extractAnchorLinks(content, filePath) {
  const links = [];
  // Match markdown links with anchors: [text](#anchor) or [text](file.md#anchor)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[2];

    // Check if link has an anchor
    if (href.includes('#')) {
      const [filePart, anchor] = href.split('#');

      // Internal anchor (same file)
      if (!filePart || filePart === '') {
        links.push({
          type: 'internal',
          anchor: anchor,
          file: filePath,
          original: match[0],
        });
      }
      // Cross-file anchor
      else if (!filePart.startsWith('http')) {
        const targetFile = path.resolve(path.dirname(filePath), filePart);
        links.push({
          type: 'cross-file',
          anchor: anchor,
          file: targetFile,
          original: match[0],
        });
      }
    }
  }

  return links;
}

/**
 * Build heading map for all markdown files
 */
function buildHeadingMap(files) {
  const headingMap = new Map();

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const headings = extractHeadings(content);
      headingMap.set(file, headings);
    } catch (err) {
      console.error(`Error reading ${file}: ${err.message}`);
    }
  }

  return headingMap;
}

/**
 * Main function
 */
function main() {
  console.log('🔗 Checking anchor links...\n');

  // Find all markdown files
  const docsFiles = glob.sync('**/*.md', { cwd: DOCS_DIR, absolute: true });
  const allFiles = [...docsFiles];

  if (fs.existsSync(README_PATH)) {
    allFiles.push(README_PATH);
  }

  if (allFiles.length === 0) {
    console.log('No markdown files found.');
    process.exit(0);
  }

  // Build heading map
  const headingMap = buildHeadingMap(allFiles);

  // Check all anchor links
  const errors = [];

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const links = extractAnchorLinks(content, file);

      for (const link of links) {
        const targetFile =
          link.type === 'internal' ? file : link.file;

        // Normalize path
        const normalizedTarget = targetFile.endsWith('.md')
          ? targetFile
          : targetFile + '.md';

        const headings = headingMap.get(normalizedTarget);

        if (!headings) {
          // Target file doesn't exist - skip (link checker handles this)
          continue;
        }

        if (!headings.has(link.anchor)) {
          const relFile = path.relative(process.cwd(), file);
          errors.push({
            file: relFile,
            link: link.original,
            anchor: link.anchor,
            targetFile: path.relative(process.cwd(), normalizedTarget),
          });
        }
      }
    } catch (err) {
      console.error(`Error processing ${file}: ${err.message}`);
    }
  }

  // Report results
  if (errors.length === 0) {
    console.log('✅ All anchor links are valid!\n');
    process.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} broken anchor link(s):\n`);

    for (const error of errors) {
      console.log(`  ${error.file}`);
      console.log(`    Link: ${error.link}`);
      console.log(`    Missing anchor: #${error.anchor}`);
      console.log(`    Target file: ${error.targetFile}\n`);
    }

    process.exit(1);
  }
}

// Check if glob is available, if not provide helpful error
try {
  require.resolve('glob');
  main();
} catch {
  // If glob is not installed, use basic file listing
  console.log('Note: glob package not found, using basic file listing');

  function walkDir(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walkDir(fullPath, files);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  // Redefine main with basic file listing
  const files = [];
  if (fs.existsSync(DOCS_DIR)) {
    files.push(...walkDir(DOCS_DIR));
  }
  if (fs.existsSync(README_PATH)) {
    files.push(README_PATH);
  }

  if (files.length === 0) {
    console.log('No markdown files found.');
    process.exit(0);
  }

  const headingMap = buildHeadingMap(files);
  const errors = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const links = extractAnchorLinks(content, file);

      for (const link of links) {
        const targetFile = link.type === 'internal' ? file : link.file;
        const normalizedTarget = targetFile.endsWith('.md')
          ? targetFile
          : targetFile + '.md';
        const headings = headingMap.get(normalizedTarget);

        if (!headings) continue;

        if (!headings.has(link.anchor)) {
          errors.push({
            file: path.relative(process.cwd(), file),
            link: link.original,
            anchor: link.anchor,
            targetFile: path.relative(process.cwd(), normalizedTarget),
          });
        }
      }
    } catch (err) {
      console.error(`Error processing ${file}: ${err.message}`);
    }
  }

  if (errors.length === 0) {
    console.log('✅ All anchor links are valid!\n');
    process.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} broken anchor link(s):\n`);
    for (const error of errors) {
      console.log(`  ${error.file}`);
      console.log(`    Link: ${error.link}`);
      console.log(`    Missing anchor: #${error.anchor}`);
      console.log(`    Target file: ${error.targetFile}\n`);
    }
    process.exit(1);
  }
}
