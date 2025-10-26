# Instructions for AI Agents

When assigned to an issue in this repository, follow these steps to complete the work:

## 1. Read the Issue Carefully

- Review the **Summary**, **Scope**, and **Acceptance Criteria**
- Check the **milestone** label (MVP, Beta, GA, Post-GA) for priority context
- Note any **dependencies** or **tech notes** mentioned

## 2. Create a Working Branch

Create a branch named after the issue:

```bash
# For issue #146 with milestone/MVP
git checkout -b mvp/fix-voting-146

# For issue #148 with milestone/MVP
git checkout -b mvp/i18n-foundation-148

# Pattern: <milestone>/<short-description>-<issue-number>
```

## 3. Implement the Changes

- Follow the acceptance criteria exactly
- Add or update tests as required
- Update documentation if needed
- Ensure code follows project style guidelines

## 4. Test Your Changes

```bash
# Backend tests
cd backend && make test

# Frontend tests
cd frontend && npm test

# Full build verification
make build
```

## 5. Create a Pull Request

When creating the PR:

### IMPORTANT: Link the Issue

In your PR description, include:

```
Closes #<issue-number>
```

This will:

- Automatically link the PR to the issue
- Trigger the label sync workflow to copy milestone, priority, area, and kind labels to your PR
- Close the issue when the PR is merged

### Example PR Description

```markdown
Closes #146

## Description

Fixed unauthorized voting by adding authentication checks on all vote endpoints and disabling vote UI for unauthenticated users.

## Testing

-   Added unit tests for auth middleware
-   Added integration tests for vote endpoints
-   Manual testing: verified login prompt appears when not authenticated
```

## 6. Wait for CI and Review

- GitHub Actions will run tests automatically
- Labels will be synced from the issue within seconds
- Address any review feedback
- Keep the PR updated with the latest main branch

## 7. After Merge

- The issue will close automatically
- Delete your branch (GitHub can do this automatically)
- The Roadmap (#175) checklist will be updated manually

---

## Quick Reference: Label Meanings

### Milestones

- `milestone/MVP` - Foundations, must-fixes, go-to-market blockers
- `milestone/Beta` - Core UX completeness, reliability, admin features
- `milestone/GA` - Polish, growth features, docs, SEO
- `milestone/Post-GA` - Nice-to-have, stretch goals

### Priority

- `priority/P0` - Critical, must be done first
- `priority/P1` - High priority
- `priority/P2` - Medium priority
- `priority/P3` - Low priority

### Area

- `area/frontend` - React/TypeScript frontend changes
- `area/backend` - Go backend changes
- `area/infrastructure` - Docker, CI/CD, deployment

### Kind

- `kind/bug` - Fixes broken functionality
- `kind/feature` - Adds new functionality
- `kind/chore` - Maintenance, refactoring, tooling

---

## Need Help?

- Check existing PRs for examples
- Review project documentation in `/docs`
- Ask questions in PR comments
- Reference the Product Roadmap: #175
