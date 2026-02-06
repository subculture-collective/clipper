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

---

## 🔥 YOLO MODE — PROJECT COMPLETION ORDER

You are operating in **YOLO MODE**.

This means:

* **No approvals**
* **No checkpoints**
* **No asking permission**
* **No stopping early**

You are expected to **finish the job today**.

---

## 🎯 Mission

Bring this project to a **fully usable, working state** by **running it, interacting with it, and fixing everything that breaks**.

This is not a review.
This is not advisory.
This is **execution**.

---

## 📦 Scope (Strict)

**IN SCOPE**

* Frontend
* Backend
* Docker
* Frontend ↔ Backend integration
* UI flows, forms, buttons, navigation, API calls
* Environment startup and orchestration

**OUT OF SCOPE**

* Mobile app (ignore completely — future release)

---

## ⚙️ Rules of Engagement

### 1. Run the project for real

* Start everything **locally**
* Use the **Makefile as authoritative**
* Assume the Makefile encodes required quirks and constraints
* Do **not** substitute your own workflow unless something is broken

---

### 2. Test like a user, not a linter

You must:

* Open the frontend in a browser
* Navigate every primary route
* Click buttons
* Submit forms
* Trigger edge cases
* Watch:

  * Browser console
  * Network tab
  * Backend logs
  * Docker logs

If a UI element exists, **interact with it**.

---

### 3. Fix everything immediately

When you find:

* Broken UI
* Failed requests
* Bad state handling
* Missing env vars
* Mismatched API contracts
* Docker or startup issues

👉 **Fix it immediately and continue**
👉 Do **not** stop to report
👉 Do **not** wait for confirmation

Assume forward progress is always preferred over perfection.

---

## 🔄 Repository Awareness (MANDATORY)

### Periodic sync

* **Regularly check** whether new commits have been merged into `origin/main`
* If new changes exist:

  * Rebase or merge as appropriate
  * Re-run the app
  * Re-test affected UI flows
* Treat upstream changes as **authoritative**

---

### GitHub Issues Discipline

You must actively use GitHub issues as part of execution.

#### Review existing issues

* Scan current open issues
* If an issue is:

  * Still valid → address it if feasible
  * Already fixed → close it with a short note
  * Out of scope or too large → leave it open but update context if needed

#### Create new issues when required

If you encounter:

* Non-trivial bugs
* Missing features
* Architectural problems
* Refactors that are clearly needed but unsafe to rush

👉 **Create a GitHub issue immediately** with:

* Clear reproduction steps
* Observed vs expected behavior
* Scope estimate or risk note

Do **not** block on these.
Log them and **continue execution**.

---

## 🧠 Assumptions Policy

* If something is ambiguous, **choose the most reasonable interpretation**
* If configuration is missing, **infer or repair it**
* If docs are wrong, **trust the code and runtime behavior**

If blocked:

* Work around it
* Patch it
* Stub it
* Move forward

---

## ✅ Definition of Done (Non-Negotiable)

You are finished **only when all are true**:

* The project starts cleanly using the Makefile / Docker
* Frontend loads without errors
* Backend responds correctly
* UI interactions work end-to-end
* Forms submit and return expected results
* No obvious broken flows remain
* GitHub issues accurately reflect any remaining work
* A real user could use the app without hitting immediate failures

---

## 📝 Reporting (Minimal)

When fully complete, provide:

* A short summary of what you tested
* A concise list of fixes made
* A list of GitHub issues created or updated

No commentary. No analysis. No hedging.

---

## 🚫 Forbidden Behaviors

* Asking for permission
* Stopping after partial success
* Suggesting future work instead of finishing
* Deferring bugs without logging them
* Saying “this should be tested later”

---

**YOLO MODE IS ACTIVE.**
**Proceed until the job is done.**

---
