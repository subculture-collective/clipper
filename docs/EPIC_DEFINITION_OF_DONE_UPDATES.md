# Epic Definition of Done (DoD) Updates

This document contains ready-to-paste Definition of Done sections for epics. Each section is designed to be appended to the bottom of the corresponding epic body under a new heading "Definition of Done". Checklists reference child issues directly and include measurable, verifiable outcomes.

When GitHub access is available, apply each section to its issue body. Until then, this serves as the authoritative draft.

---

## #429 — Transition Epic: Submission Workflow

### Definition of Done

- [ ] All child epics closed: #431, #432, #433, #434, #435, #436, #437
- [ ] Launch checklist completed and checked in to repo (docs/DEPLOYMENT_READINESS.md updated)
- [ ] Operational SLOs met for 7 consecutive days post-launch (latency, error rate, availability)
- [ ] Post-deploy verification runbook executed without manual hotfixes
- [ ] Rollback procedure validated in staging and documented
- [ ] Final QA sign-off and issue audit shows 0 open P0/P1 defects
- [ ] Final announcement posted; analytics confirm baseline usage and conversion targets

---

## #431 — Security Hardening Epic

### Definition of Done

- [ ] All scoped issues closed: #398, #399, #400, #396, #397, #325, #326
- [ ] 0 known P0/P1 security vulnerabilities open (including third-party dependency advisories)
- [ ] MFA and secrets management controls implemented and verified in CI/CD
- [ ] OpenSearch/Query validation and cost controls enforced; negative test suite passes
- [ ] IDOR and authz regression tests included in CI; report archived under docs/SECURITY_TEST_REPORTS/
- [ ] Security runbook (detection, response, rotation) documented under docs/SECURITY.md
- [ ] Alerts for auth errors, permission denials, and suspicious query patterns enabled in monitoring

---

## #432 — Production Readiness Testing Epic

### Definition of Done

- [ ] All scoped issues closed: #315, #316, #317, #318, #320, #322 (Related: #428)
- [ ] Web and mobile E2E suites consistently green in CI for 5 consecutive runs (flake rate < 2%)
- [ ] Load tests meet SLOs at target RPS with <1% error rate and p95 latency within thresholds; reports archived
- [ ] Accessibility audit passes WCAG 2.1 AA for critical flows; remediations tracked to closure
- [ ] Test artifacts (coverage, k6, a11y) stored and linked from docs/TEST_ROADMAP.md
- [ ] CI gates enforce minimum coverage and performance thresholds

---

## #433 — Production Deployment Orchestration Epic

### Definition of Done

- [ ] All scoped issues closed: #328, #329, #330
- [ ] Blue/green or canary strategy implemented; dry-run performed in staging
- [ ] Automated rollback verified end-to-end in staging with a simulated failure
- [ ] Post-deploy smoke tests run automatically; failure alerts route to on-call
- [ ] Deployment and rollback runbooks documented in docs/DEPLOYMENT.md
- [ ] SLO monitors and alerts configured for deploy windows (latency, error rates, saturation)

---

## #434 — Marketing & Launch Campaign Epic

### Definition of Done

- [ ] All scoped issues closed: #331, #332, #333
- [ ] Launch content calendar published; all assets approved and versioned
- [ ] Landing page and UTM tracking live; analytics events verified end-to-end
- [ ] Initial A/B test configured with success metric defined; monitoring dashboard shared
- [ ] Legal/comms approvals captured; public announcement published

---

## #435 — Internationalization v1 Epic

### Definition of Done

- [ ] All scoped issues closed: #311, #312, #313, #314
- [ ] Locale switcher available; language fallback logic verified
- [ ] 100% of user-facing strings extracted and localized for target locales
- [ ] Pseudo-localization pass completed; layout regressions fixed
- [ ] i18n test coverage added for routing, formatting, and RTL as applicable
- [ ] i18n developer guide added to docs/I18N.md

---

## #436 — Browser Extension v1 Epic

### Definition of Done

- [ ] All scoped issues closed: #302, #303, #304, #305, #306
- [ ] Extension installs and updates successfully; permissions minimized and documented
- [ ] Core flows instrumented; telemetry events visible in analytics
- [ ] Performance and memory usage validated under realistic browsing load
- [ ] Publishing checklist completed (store listing, icons, privacy policy)
- [ ] QA matrix executed across supported browsers/versions; results archived

---

## #437 — Discord Bot v1 Epic

### Definition of Done

- [ ] All scoped issues closed: #307, #308, #309, #310
- [ ] Bot deployed to production with environment-specific configs
- [ ] Slash commands and permissions model validated; rate limits enforced
- [ ] Monitoring and alerting in place (uptime, error rates); on-call runbook added
- [ ] Secrets rotation procedure documented; least privilege validated
- [ ] Admin guide for server setup and usage published in docs/INTEGRATIONS.md

---

Notes

- Each epic should retain its existing Summary, Scope Checklist, and Success Criteria. Append the above DoD section verbatim under a new "### Definition of Done" heading.
- Where a report/archive is referenced, place artifacts under an appropriate docs/ subfolder and link from the epic.
- Update labels as needed to reflect readiness once DoD is satisfied (e.g., close epic; remove milestone labels).
