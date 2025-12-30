---
title: "Documentation Rendering System"
summary: "Technical guide to the dual-mode documentation rendering pipeline (Obsidian + Admin Dashboard)"
tags: ["frontend", "docs", "rendering", "obsidian"]
area: "frontend"
status: "stable"
owner: "team-core"
last_reviewed: 2025-12-29
---

# Documentation Rendering System

## Overview

The Clipper documentation system supports dual-mode rendering:
- **Obsidian vault** for authoring (in `/docs`)
- **Admin dashboard** for web viewing (Vite + React)

This document describes how the rendering pipeline works.

## Architecture

```
/docs/*.md (Markdown + Frontmatter)
    ↓
Backend API (/api/v1/docs/:path)
    ↓
Frontend DocsPage
    ↓
markdown-utils.ts processing:
    - Parse frontmatter
    - Remove doctoc blocks
    - Process Dataview blocks
    - Convert wikilinks
    - Generate TOC
    ↓
React Components:
    - DocHeader (metadata)
    - DocTOC (navigation)
    - ReactMarkdown (content)
```

## Frontend Components

### markdown-utils.ts

Core utilities module that handles:

1. **Frontmatter Parsing**: Uses `gray-matter` to extract YAML metadata
2. **Doctoc Removal**: Strips HTML comment TOC blocks
3. **Dataview Processing**: Converts Dataview blocks to informational callouts
4. **TOC Generation**: Auto-generates table of contents from headings
5. **Wikilink Conversion**: Transforms `[[page]]` to clickable links
6. **Text Extraction**: Handles complex React children for heading IDs

### DocHeader Component

Displays frontmatter metadata in a clean UI:
- Title (h1)
- Summary (subtitle)
- Tags (badges)
- Status badge (stable/draft/etc.)
- Area, owner, last_reviewed fields

### DocTOC Component

Generates navigable table of contents:
- Hierarchical structure from h1-h6
- Smooth scrolling to sections
- Auto-generated, no manual maintenance

### DocsPage Component

Main documentation viewer:
- Fetches markdown from backend API
- Processes with markdown-utils
- Renders with custom components
- Handles navigation and search

## Authoring Guidelines

### Frontmatter

Every doc should have YAML frontmatter:

```yaml
---
title: "Page Title"
summary: "Brief description"
tags: ["tag1", "tag2"]
area: "backend"
status: "stable"
owner: "team-core"
last_reviewed: 2025-12-01
---
```

### Dataview Blocks (Obsidian Only)

Dataview queries work in Obsidian, render as callouts on web:

```dataview
TABLE title, status
FROM "docs/backend"
```

Becomes:

> [!note] Obsidian Dataview Query
> This section uses Dataview queries that are only visible in Obsidian.

### Wikilinks

Use Obsidian-style wikilinks for internal navigation:

```markdown
See [[backend/api]] for details.
See [[glossary#term|the glossary]] for definitions.
```

These are automatically converted to clickable links in the web UI.

### No Doctoc in /docs

The `doctoc` tool should NOT be used in `/docs/**`. It only runs on `README.md`.
TOC is generated dynamically at render time.

## Backend API

### GET /api/v1/docs

Returns directory tree of all docs (excludes vault).

### GET /api/v1/docs/:path

Returns specific document:

```json
{
  "path": "backend/api",
  "content": "raw markdown with frontmatter",
  "github_url": "https://github.com/..."
}
```

### GET /api/v1/docs/search?q=query

Full-text search across all docs (excludes vault).

## Validation Scripts

All validation scripts exclude `/vault/**`:

- `docs:lint`: Markdown linting
- `docs:spell`: Spell checking
- `docs:links`: Link validation
- `docs:anchors`: Anchor validation
- `docs:orphans`: Orphan page detection
- `docs:assets`: Unused asset detection

## Testing

Run tests:
```bash
cd frontend
npm test markdown-utils.test.ts
```

Coverage:
- Frontmatter parsing
- Doctoc removal
- Dataview processing
- TOC generation
- Wikilink conversion
- Text extraction

## Future Enhancements

Potential improvements:
- [ ] Full-text search in frontend
- [ ] Dark/light mode toggle for docs
- [ ] Print-friendly styling
- [ ] PDF export
- [ ] Version history/changelog integration
- [ ] Collaborative editing features
