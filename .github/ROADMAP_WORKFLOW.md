# Roadmap & Workflow Documentation

## Overview

This repository uses a structured roadmap and automated workflows to facilitate collaboration between humans and AI agents. This document explains the complete system.

## Components

### 1. Product Roadmap (#175)

The [Product Roadmap](https://github.com/subculture-collective/clipper/issues/175) is the central hub that:

- Groups all issues by milestone (MVP, Beta, GA, Post-GA)
- Provides checklists to track progress
- Links to detailed issues with acceptance criteria
- Includes quick reference for labels and workflow

### 2. Agent Instructions

[`.github/AGENT_INSTRUCTIONS.md`](.github/AGENT_INSTRUCTIONS.md) provides step-by-step instructions for AI agents (or any contributor):

- How to create branches with proper naming
- How to link PRs to issues
- Testing requirements before opening PRs
- Label meanings and workflow

### 3. Automated Label Sync

[`.github/workflows/sync-issue-labels.yml`](.github/workflows/sync-issue-labels.yml) automatically:

- Detects issue references in PR descriptions (e.g., "Closes #146")
- Fetches labels from those issues
- Copies `milestone/`, `priority/`, `area/`, and `kind/` labels to the PR
- Runs on PR open, edit, or update

### 4. Issue Templates

Pre-filled templates for consistency:

- [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml)
- [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml)

Both templates:

- Link to Agent Instructions at the top
- Prompt for Summary, Scope, and Acceptance Criteria
- Include priority and milestone dropdowns
- Ensure proper labeling from the start

### 5. PR Template

[`.github/pull_request_template.md`](.github/pull_request_template.md) guides contributors to:

- Link the related issue with "Closes #"
- Describe changes and testing
- Follow a consistent checklist
- Reminds that labels will auto-sync

## Workflow for AI Agents

### Starting Work

1. **Get assigned** to an issue (or self-assign from the roadmap)
2. **Read the issue** carefully - review Summary, Scope, Acceptance Criteria
3. **Check the milestone label** to understand priority context

### Development

4. **Create a branch** following the naming convention:

    ```bash
    # Pattern: <milestone>/<short-description>-<issue-number>
    git checkout -b mvp/fix-voting-146
    ```

5. **Implement the changes** following acceptance criteria exactly
6. **Write tests** - add unit/integration tests as required
7. **Test locally**:

    ```bash
    make test   # Run all tests
    make build  # Verify build passes
    ```

### Creating the PR

8. **Open a Pull Request** with:

    - Title describing the change
    - Body including `Closes #<issue-number>` (critical for auto-labeling)
    - Description of what changed and how it was tested

9. **Automatic label sync** happens within seconds:

    - The workflow detects the issue reference
    - Copies all relevant labels to the PR
    - You'll see labels appear automatically

10. **CI runs automatically** - GitHub Actions will:
    - Run tests
    - Check build
    - Report results on the PR

### Review & Merge

11. **Address feedback** from reviewers
12. **Keep PR updated** with latest main branch
13. **Merge** - Once approved, the PR merges and:
    - The linked issue closes automatically
    - Your branch can be deleted
    - The roadmap checklist gets updated manually

## Label System

### Milestones

- `milestone/MVP` - Foundations, must-fixes, go-to-market blockers
- `milestone/Beta` - Core UX completeness, reliability, admin
- `milestone/GA` - Polish, growth, docs, SEO
- `milestone/Post-GA` - Nice-to-have, stretch goals

### Priority

- `priority/P0` - Critical, must be done first
- `priority/P1` - High priority
- `priority/P2` - Medium priority
- `priority/P3` - Low priority

### Area

- `area/frontend` - React/TypeScript frontend changes
- `area/backend` - Go backend API changes
- `area/infrastructure` - Docker, CI/CD, deployment

### Kind

- `kind/bug` - Fixes broken functionality
- `kind/feature` - Adds new functionality
- `kind/chore` - Maintenance, refactoring, tooling
- `kind/epic` - Large multi-issue initiative

### Status

- `status/ready` - Ready for work to begin
- `status/blocked` - Waiting on dependencies
- `status/in-progress` - Currently being worked on

### Topical

- `i18n` - Internationalization
- `search` - Search functionality
- `security` - Security hardening
- `payments/stripe` - Stripe integration
- `a11y` / `accessibility` - Accessibility improvements
- `SEO` - Search engine optimization
- `notifications` - Notification system
- `docs` - Documentation
- `auth` - Authentication/authorization
- `moderation` - Moderation features
- `privacy` - Privacy features
- `performance` - Performance optimization

## Benefits

### For AI Agents

- Clear, actionable instructions at every step
- Automated labeling reduces manual work
- Consistent branch/PR naming simplifies navigation
- Comprehensive acceptance criteria ensure quality

### For Humans

- Easy oversight via roadmap checklists
- Labels filter issues/PRs by milestone, priority, or area
- Automated workflows reduce toil
- Clear audit trail of what was done and why

### For the Project

- Organized, milestone-driven development
- High-quality issues with clear acceptance criteria
- Automated label propagation keeps PRs organized
- Easy to onboard new contributors (human or AI)

## Maintenance

### Adding New Issues

1. Use issue templates for consistency
2. Assign priority and milestone during creation
3. Add issue to roadmap (#175) under appropriate milestone section

### Updating the Roadmap

1. Check boxes as issues close
2. Add new issues under the right milestone
3. Keep the top-level summary in sync

### Adjusting Labels

- Add new label categories as needed
- Update sync workflow if new prefixes are introduced
- Document new labels in this file

## Quick Links

- [Product Roadmap](https://github.com/subculture-collective/clipper/issues/175)
- [Agent Instructions](.github/AGENT_INSTRUCTIONS.md)
- [Label Sync Workflow](.github/workflows/sync-issue-labels.yml)
- [Feature Template](.github/ISSUE_TEMPLATE/feature_request.yml)
- [Bug Template](.github/ISSUE_TEMPLATE/bug_report.yml)
- [PR Template](.github/pull_request_template.md)

---

**Questions?** Open an issue or reference existing PRs for examples.
