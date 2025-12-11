# Documentation Hosting Implementation

## Overview

The Clipper documentation is now hosted within the application and accessible from the admin panel at `/docs`. This provides a seamless, integrated documentation experience with **full-text search**, **GitHub edit links**, and **admin dashboard integration**.

## Architecture

### Backend (Go)

**Handler**: `backend/internal/handlers/docs_handler.go`
- Serves markdown files from the `/docs` directory
- Provides three endpoints:
  - `GET /api/v1/docs` - Returns hierarchical tree of all docs
  - `GET /api/v1/docs/:path` - Returns content of specific document with GitHub URL
  - `GET /api/v1/docs/search?q=query` - Full-text search across all docs
- Security features:
  - Directory traversal prevention
  - Path validation
  - Archive folder exclusion
- GitHub integration:
  - Generates edit URLs for each document
  - Configured with owner, repo, and branch

**API Integration**: `backend/cmd/api/main.go`
- Registered docs routes in v1 API group
- Public access (no authentication required)
- Initialized with GitHub repo info: `"subculture-collective", "clipper", "main"`

### Frontend (React)

**Component**: `frontend/src/pages/DocsPage.tsx`
- Fetches documentation from backend API
- Renders markdown with `react-markdown` and `remark-gfm`
- Features:
  - **Full-text search** with result highlighting
  - **Hierarchical navigation** tree
  - **Wikilink support** for cross-referencing
  - **GitHub edit links** on every document
  - **URL parameters** for direct doc navigation (`/docs?doc=path`)
  - Syntax highlighting for code blocks
  - Responsive layout
  - Back navigation

**Admin Dashboard**: `frontend/src/pages/admin/AdminDashboard.tsx`
- Quick documentation access widget
- 6 most important operational docs linked
- Direct navigation to specific documents
- "View All Docs" link to full index

**Dependencies**:
- `react-markdown@10.1.0` - Markdown rendering
- `remark-gfm` - GitHub-flavored markdown support

## Features

### 1. Full-Text Search ✅

**Backend Implementation**:
- Searches all markdown files recursively
- Case-insensitive matching
- Returns up to 3 matching lines per document
- Scores results (filename matches get bonus points)
- Truncates long lines with context around match

**Frontend UI**:
- Real-time search as you type
- Shows result count
- Displays matching excerpts with context
- Click result to view full document
- Clears search when viewing document

**Example**:
```
Search: "deployment"
Results:
- operations/deployment.md (5 matches)
  "...production deployment instructions..."
  "...deploy to staging environment..."
```

### 2. GitHub Edit Links ✅

**Backend**:
- Generates GitHub URLs automatically
- Format: `https://github.com/{owner}/{repo}/edit/{branch}/docs/{path}`
- Included in document response

**Frontend**:
- "✏️ Edit on GitHub" button on every document
- Opens in new tab
- Positioned next to back button
- Only shown if GitHub URL is available

**Benefits**:
- Easy community contributions
- Quick fixes for typos
- Transparent documentation updates

### 3. Admin Dashboard Integration ✅

**Quick Documentation Widget**:
- Prominent card at top of admin dashboard
- 6 essential operational docs:
  - **Runbook** - Incident response
  - **Deployment** - Production deploy
  - **Monitoring** - Metrics and alerts
  - **API Reference** - Complete API docs
  - **Database** - Schema and migrations
  - **Feature Flags** - Toggle features
- "View All Docs" link for full index
- Direct navigation via URL parameters

**Navigation Flow**:
1. Admin clicks "Runbook" in dashboard
2. Redirects to `/docs?doc=operations/runbook`
3. DocsPage loads and automatically opens that document
4. User can read, search, or navigate to related docs

### 4. Hierarchical Navigation

Docs organized by folder structure:
```
docs/
├── backend/ (8 files)
├── frontend/ (2 files)
├── mobile/ (2 files)
├── setup/ (3 files)
├── users/ (3 files)
├── premium/ (4 files)
├── operations/ (8 files)
├── pipelines/ (3 files)
└── decisions/ (3 files)
```

Each section rendered as expandable tree in UI.

### 5. Wikilink Support

Markdown files can reference each other:
```markdown
See [[backend/api|API Reference]] for endpoints.
For setup, see [[setup/development]].
```

Frontend automatically converts to clickable navigation.

### 6. Markdown Rendering

Supports:
- **GitHub Flavored Markdown (GFM)** - tables, task lists, strikethrough
- **Code blocks** with language-specific styling
- **Headings** styled hierarchically
- **Lists** (ordered and unordered)
- **Links** (internal wikilinks and external URLs)
- **Blockquotes**
- **Images** (if included)

### 7. Security

Backend implements:
- Path traversal protection (`..` blocked)
- File path validation
- Restricted to `/docs` directory only
- Archive folder excluded from listing
- No authentication required (public docs)

## Usage

### Accessing Documentation

1. **Via Navigation**: Click "Docs" in main navigation → `/docs`
2. **From Admin Dashboard**: Click any quick doc link → `/docs?doc=path`
3. **Direct URL**: Navigate to `/docs` or `/docs?doc=backend/api`
4. **Search**: Use search bar to find specific topics

### Searching Documentation

1. Navigate to `/docs`
2. Type query in search bar (e.g., "authentication")
3. View results with matching excerpts
4. Click any result to open full document
5. Use "Edit on GitHub" to contribute improvements

### Admin Quick Access

From `/admin/dashboard`:
- Click "Runbook" → Opens incident response procedures
- Click "Deployment" → Opens production deployment guide
- Click "Monitoring" → Opens metrics and alerting docs
- Click any other quick link → Direct to that document

### Editing Documentation

1. Navigate to any document
2. Click "✏️ Edit on GitHub" button (top right)
3. Opens GitHub editor in new tab
4. Make changes and submit pull request
5. Changes appear in app once merged

### Adding New Documentation

1. Create markdown file in `/docs` (or subdirectory)
2. Use wikilinks for cross-references:
   ```markdown
   For setup, see [[setup/development|Development Guide]].
   ```
3. Restart backend (or wait for hot reload if implemented)
4. Document appears in tree automatically
5. Searchable immediately

## API Reference

### GET /api/v1/docs

Returns list of all available documentation files.

**Response**:
```json
{
  "docs": [
    {
      "name": "backend",
      "path": "backend",
      "type": "directory",
      "children": [
        {
          "name": "api",
          "path": "backend/api",
          "type": "file"
        }
      ]
    }
  ]
}
```

### GET /api/v1/docs/:path

Returns content of specific documentation file with GitHub edit URL.

**Parameters**:
- `path` - Document path (e.g., `backend/api`)

**Response**:
```json
{
  "path": "backend/api",
  "content": "# API Reference\n\n...",
  "github_url": "https://github.com/subculture-collective/clipper/edit/main/docs/backend/api.md"
}
```

### GET /api/v1/docs/search

Full-text search across all documentation.

**Query Parameters**:
- `q` - Search query (required)

**Response**:
```json
{
  "query": "deployment",
  "count": 3,
  "results": [
    {
      "path": "operations/deployment",
      "name": "deployment",
      "score": 6,
      "matches": [
        "Production deployment instructions...",
        "Deploy to staging environment...",
        "Rollback deployment if needed..."
      ]
    }
  ]
}
```

**Scoring**:
- +1 for each line match
- +5 if filename contains query
- Results sorted by score (highest first)

## Future Enhancements

### 1. Advanced Search Features
- **Fuzzy matching** - Handle typos and variations
- **Filters** - By section, file type, date modified
- **Autocomplete** - Suggest queries as you type
- **Search history** - Remember recent searches

### 2. Versioning
Support multiple documentation versions:
- `/docs/v1.0/`, `/docs/v2.0/`, etc.
- Version selector in UI
- Default to latest version
- Archive old versions

### 3. Table of Contents
Auto-generate TOC for long documents:
- Parse headings from markdown
- Render sticky TOC sidebar
- Highlight active section on scroll
- Smooth scroll to headings

### 4. Analytics
Track documentation usage:
- Most viewed pages
- Search queries (what users look for)
- Time spent on each page
- User feedback (helpful/not helpful)

### 5. Hot Reload
Watch docs directory for changes:
- Use `fsnotify` or similar
- Rebuild doc tree on file change
- No server restart needed
- Webhook from GitHub on commits

### 6. Offline Support
- Cache docs in browser storage
- Service worker for offline access
- Download docs as PDF/ZIP
- Mobile app integration

### 7. Collaboration Features
- Inline comments on docs
- Suggest edits without GitHub
- Track changes and approvals
- Discuss improvements

## Deployment Notes

1. Ensure `/docs` directory is included in Docker image
2. Set appropriate file permissions (read-only)
3. Consider caching doc tree in Redis for performance
4. Monitor API usage to prevent abuse

## Testing

### Manual Testing

**Basic Navigation**:
1. Start backend: `cd backend && go run cmd/api/main.go`
2. Start frontend: `cd frontend && npm run dev`
3. Navigate to `http://localhost:5173/docs`
4. Verify doc tree loads
5. Click through different sections

**Search Functionality**:
1. Navigate to `/docs`
2. Type "authentication" in search bar
3. Verify results appear
4. Click a result
5. Verify document loads

**GitHub Edit Links**:
1. Open any document
2. Click "✏️ Edit on GitHub"
3. Verify GitHub editor opens
4. Check URL format is correct

**Admin Dashboard**:
1. Login as admin
2. Navigate to `/admin/dashboard`
3. Verify "Quick Documentation" widget appears
4. Click "Runbook"
5. Verify correct document opens

**URL Parameters**:
1. Navigate to `/docs?doc=backend/api`
2. Verify API documentation loads automatically
3. Test with different paths

### Automated Testing

**Backend Tests** (`docs_handler_test.go`):
```go
func TestDocsHandler_GetDoc(t *testing.T) {
  // Test path validation
  // Test directory traversal prevention
  // Test GitHub URL generation
}

func TestDocsHandler_SearchDocs(t *testing.T) {
  // Test search with various queries
  // Test result scoring
  // Test empty query handling
}
```

**Frontend Tests** (`DocsPage.test.tsx`):
```tsx
describe('DocsPage', () => {
  it('renders doc tree', () => {});
  it('handles search', () => {});
  it('navigates via URL params', () => {});
  it('shows GitHub edit link', () => {});
});
```

**E2E Tests** (Playwright/Cypress):
- Full navigation flow
- Search and result selection
- Admin dashboard integration
- GitHub link opening

## Related Files

**Backend**:
- `backend/internal/handlers/docs_handler.go` - Main handler with search
- `backend/cmd/api/main.go` - Route registration with GitHub config

**Frontend**:
- `frontend/src/pages/DocsPage.tsx` - Main docs viewer with search
- `frontend/src/pages/admin/AdminDashboard.tsx` - Quick docs widget

**Documentation**:
- `docs/` - All documentation content (40+ files)
- `docs/DOCUMENTATION_HOSTING.md` - This implementation guide
- `README.md` - Updated with new docs structure

---

**Implementation Date**: November 30, 2024  
**Status**: ✅ Complete with full-text search, GitHub edit links, and admin integration  
**Features**:
- ✅ Hosted documentation
- ✅ Full-text search
- ✅ GitHub edit links
- ✅ Admin dashboard widget
- ✅ URL parameter navigation
- ✅ Wikilink support
- ✅ Responsive design
- ✅ Security hardening
