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

## 🚀 YOLO MODE — DEPLOYMENT / VPS EXECUTION ORDER (clpr.tv)

You are operating in **YOLO MODE**.

This means:

* **No approvals**
* **No pauses for permission**
* **No stopping early**
* **Fix and continue until deployment is working**

Your job is to **deploy and validate production on a VPS** where **almost everything runs in Docker**, the site must be live at **clpr.tv**, and the current deploy script is **known broken** and must be updated.

---

## 🎯 Mission

Bring the production deployment to a **working, repeatable state** on this VPS:

* `clpr.tv` serves the correct frontend (and routes API traffic correctly)
* All required services are up and stable in Docker
* Reverse proxy works via **Caddy**
* Secrets are pulled from **Vault** correctly
* Port conflicts and shared-network collisions are resolved
* Deployment is **documented and reproducible**

This is not a “review the server” task. This is **fix + ship**.

---

## 🧭 Environment Facts (Authoritative)

### Server type

* This is a **VPS**
* A reverse proxy is already present using **Caddy**
* There is a **shared Docker network**
* **Port conflicts are possible** (multiple stacks on one host)

### Secrets

* Secrets are managed with **Vault**
* Any deploy process must integrate with Vault
* Assume: **secrets are not hardcoded** and must not be committed

### Project layout

Everything lives under:

* `~/projects/`

Inside `~/projects/`, these directories exist and are relevant:

* `caddy/`
* `clipper/`
* `dozzle/`
* `pgadmin/`
* `reddit-cluster-map/`
* `systemd/`
* `vault/`

Also present in `~/projects/`:

* `.tmux.conf`
* `keys.txt`

Treat these as **real**, and use them to infer intended workflows.

### Domain

* The site must be served at: **clpr.tv**
* Assume TLS is required and Caddy should handle certificates

### Runtime model

* “Pretty much everything” runs in **Docker containers**
* Prefer Docker-first solutions unless something is explicitly systemd-managed

---

## ⚙️ Working Rules

### 1) Do not trust the existing deploy script

* The deploy script **will not work without changes**
* You must:

  * Inspect it
  * Identify why it fails in this VPS environment
  * Update it to match current reality (Vault + Caddy + shared network + current ports)
* Do not try to “run it until it works” without understanding conflicts.

---

### 2) Start with a deployment map

Before changing anything big:

* Inventory what is running now:

  * Docker containers, networks, volumes
  * Ports bound on the host
  * Caddy config + active routes
  * Any systemd units in `~/projects/systemd`
* Identify:

  * What should serve `clpr.tv`
  * What container(s) expose backend/API
  * Which ports must be internal-only vs public

Then proceed to fixes.

---

### 3) Respect the shared network & avoid port collisions

* Prefer internal Docker networking + Caddy reverse proxying by container name
* Avoid binding new services directly to common ports unless necessary
* If there is a conflict:

  * Fix by adjusting compose/service ports or Caddy upstreams
  * Do not “just stop” other services unless they are confirmed obsolete

---

### 4) Vault integration is mandatory

* Locate how Vault is currently used (`~/projects/vault` and any env templates)
* Update deployment so secrets are sourced from Vault in a clean way:

  * Environment injection at deploy time
  * Templates / env files generated securely
  * No plaintext secrets committed into repos
* Ensure containers receive required secrets and boot cleanly

---

### 5) Caddy must correctly serve clpr.tv

* Confirm Caddy is the reverse proxy in front
* Update Caddy config if required so that:

  * `clpr.tv` serves the correct frontend
  * API routes proxy to backend container(s)
  * TLS works
  * No accidental exposure of admin tools (pgAdmin, Vault UI, Dozzle) unless explicitly intended

---

## ✅ Definition of Done (Deployment)

You are finished **only when all are true**:

* `clpr.tv` is live and serving the intended app over HTTPS
* Frontend loads without obvious runtime errors
* Core UI flows can be exercised against the live backend
* Backend/API is reachable through the proxy and functions correctly
* Docker services are stable and restart-safe
* No accidental port conflicts remain
* Secrets are sourced from Vault and not leaked into git or logs
* Updated deploy steps are reproducible:

  * A single command (or short sequence) can redeploy cleanly
* Any remaining work is logged as issues (non-blocking only)

---

## 📝 Output Expectations (Minimal)

As you work:

* Make necessary edits in-place (compose files, Caddy config, deploy scripts, env templates)
* After completion, provide:

  * What changed
  * How to deploy now (exact commands)
  * What to check if it fails (common failure points)
  * Any issues you logged for later

No hedging. No “should”. Only what is true.

---

## 🚫 Forbidden Behaviors

* Stopping after “Caddy is up” but app is broken
* Ignoring Vault and hardcoding secrets
* Binding random ports without checking conflicts
* Exposing admin tools publicly by accident
* Declaring success without verifying `clpr.tv` end-to-end

---

**YOLO MODE IS ACTIVE. DEPLOY UNTIL DONE.**

