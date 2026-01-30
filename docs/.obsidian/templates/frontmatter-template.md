---
title: "Document Title"
summary: "Brief one-sentence description of the document's purpose and content"
tags: ["tag1", "tag2", "tag3"]
area: "docs"
status: "draft"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-29
aliases: ["alternative name"]
---

# Frontmatter Template Guide

This template defines the standard YAML frontmatter structure for all Clipper documentation pages in the Obsidian vault.

## Required Fields

### title
**Type**: String  
**Required**: Yes  
**Description**: Human-readable title for the document. Should match the main H1 heading.

**Example**:
```yaml
title: "Backend Architecture"
```

### summary
**Type**: String  
**Required**: Yes  
**Description**: Brief one-sentence description of the document's purpose and content. Used for search previews and navigation.

**Example**:
```yaml
summary: "System design, components, and data flow for the Go backend service"
```

### tags
**Type**: Array of strings  
**Required**: Yes  
**Description**: Categorization tags for the document. See [[tag-taxonomy]] for approved tags.

**Example**:
```yaml
tags: ["backend", "architecture", "go"]
```

### area
**Type**: String  
**Required**: Yes  
**Description**: Primary documentation area/section.

**Valid Values**:
- `docs` - General documentation
- `backend` - Backend/API documentation
- `frontend` - Web frontend documentation
- `mobile` - Mobile app documentation
- `operations` - Ops/deployment documentation
- `deployment` - Deployment procedures
- `testing` - Testing documentation
- `setup` - Setup and configuration
- `features` - Feature documentation
- `product` - Product management docs
- `premium` - Premium/monetization docs
- `compliance` - Compliance and legal
- `legal` - Legal documents
- `decisions` - Architecture decisions
- `rfcs` - Request for Comments
- `examples` - Code examples
- `pipelines` - Data pipelines
- `users` - User-facing documentation

**Example**:
```yaml
area: "backend"
```

### status
**Type**: String  
**Required**: Yes  
**Description**: Current document status.

**Valid Values**:
- `draft` - Work in progress, may be incomplete
- `review` - Ready for review
- `stable` - Reviewed and current
- `deprecated` - Outdated, kept for reference
- `archived` - Historical, no longer maintained

**Example**:
```yaml
status: "stable"
```

### owner
**Type**: String  
**Required**: Yes  
**Description**: Team or individual responsible for maintaining the document.

**Common Values**:
- `team-core` - Core engineering team
- `team-ops` - Operations team
- `team-product` - Product team
- `team-mobile` - Mobile team
- Individual GitHub username

**Example**:
```yaml
owner: "team-core"
```

### version
**Type**: String  
**Required**: Yes  
**Description**: Document version number using semantic versioning.

**Example**:
```yaml
version: "1.0"
```

### last_reviewed
**Type**: Date (YYYY-MM-DD)  
**Required**: Yes  
**Description**: Date when the document was last reviewed for accuracy.

**Example**:
```yaml
last_reviewed: 2026-01-29
```

## Optional Fields

### aliases
**Type**: Array of strings  
**Required**: No  
**Description**: Alternative names or terms that should resolve to this document.

**Example**:
```yaml
aliases: ["backend hub", "api docs", "server documentation"]
```

### links
**Type**: Array of strings  
**Required**: No  
**Description**: Related documents using wikilink syntax.

**Example**:
```yaml
links:
  - "[[authentication|Authentication Guide]]"
  - "[[rbac|RBAC Documentation]]"
```

## Complete Example

```yaml
---
title: "Backend Architecture"
summary: "System design, components, and data flow for the Go backend service"
tags: ["backend", "architecture", "go", "system-design"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2026-01-29
aliases: ["backend design", "system architecture"]
links:
  - "[[api|API Reference]]"
  - "[[database|Database Documentation]]"
---
```

## Usage Instructions

### Creating a New Document

1. Copy this template
2. Fill in all required fields
3. Add appropriate tags from [[tag-taxonomy]]
4. Set status to "draft" initially
5. Update last_reviewed to today's date
6. Add relevant aliases if applicable

### Updating an Existing Document

When updating a document:
1. Review and update the summary if needed
2. Add any new relevant tags
3. Update version if making substantial changes
4. **Always update last_reviewed to today's date**
5. Change status if applicable (e.g., draft → review → stable)

## Validation

Documents are validated automatically via CI:
- Markdown linting checks frontmatter syntax
- Missing required fields trigger warnings
- Invalid area/status values are flagged

## See Also

- [[tag-taxonomy|Tag Taxonomy]] - Approved tags and usage guidelines
- [[../contributing|Contributing Guide]] - Documentation contribution workflow
- [[../index|Documentation Home]] - Main documentation index

## Related Issues

- Issue #803: Docs Structure & Canonical Pages
- Issue #845: Docs Structure & Canonical Pages (duplicate ref)
- Issue #846: Obsidian Frontmatter & Metadata (this issue)

---

**Last Updated**: 2026-01-29  
**Maintained by**: Team Core
