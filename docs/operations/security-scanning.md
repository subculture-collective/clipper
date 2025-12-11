---
title: "Security Scanning and Vulnerability Management"
summary: "**Last Updated**: 2025-11-14"
tags: ['operations', 'security']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Security Scanning and Vulnerability Management

**Last Updated**: 2025-11-14  
**Status**: ✅ Active and Configured

## Overview

This document describes the automated security scanning and vulnerability management setup for the Clipper project. The security tooling is fully integrated into the CI/CD pipeline and runs automatically on every commit, pull request, and on a weekly schedule.

## Security Scanning Tools

### 1. CodeQL (SAST)

**Purpose**: Static Application Security Testing for code vulnerabilities

**Configuration**: `.github/workflows/codeql.yml`

**Languages Scanned**:
- Go (backend)
- JavaScript/TypeScript (frontend)

**Triggers**:
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches
- Weekly schedule (Monday at 00:00 UTC)

**What it detects**:
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Command injection
- Path traversal
- Insecure deserialization
- Authentication and authorization issues
- Cryptographic weaknesses
- And 200+ other security issues

**How to view results**:
1. Go to the [Security tab](https://github.com/subculture-collective/clipper/security/code-scanning) in GitHub
2. Review any alerts that appear
3. CodeQL alerts are also visible in pull requests

### 2. Dependabot (Dependency Scanning)

**Purpose**: Automated dependency vulnerability detection and updates

**Configuration**: `.github/dependabot.yml`

**What it monitors**:
- **Backend**: Go modules (`backend/go.mod`)
- **Frontend**: npm packages (`frontend/package.json`)
- **Mobile**: npm packages (`mobile/package.json`)
- **GitHub Actions**: Workflow dependencies

**Schedule**:
- Weekly checks (Monday)
- Automatic pull requests for security updates
- Grouped updates for minor/patch versions

**Update Limits**:
- Backend/Frontend: 10 PRs per week
- GitHub Actions: 5 PRs per week

**How to review**:
1. Go to the [Security > Dependabot alerts](https://github.com/subculture-collective/clipper/security/dependabot) tab
2. Review and merge Dependabot PRs
3. High-severity vulnerabilities create immediate alerts

### 3. Secret Scanning

**Purpose**: Detect accidentally committed secrets and credentials

**Configuration**: `.github/workflows/secrets-scanning.yml`

**Tools Used**:
- **TruffleHog**: Verified secret detection
- **Gitleaks**: Advanced secret patterns (optional, requires license)
- **Custom patterns**: Project-specific checks

**Triggers**:
- Push to `main` and `develop` branches
- Pull requests to `main` and `develop` branches
- Weekly schedule (Monday at 09:00 UTC)
- Manual workflow dispatch

**What it detects**:
- API keys (AWS, Stripe, etc.)
- Private keys (RSA, SSH)
- Database credentials
- OAuth tokens
- JWT secrets
- Hardcoded passwords
- Committed `.env` files

**Checks performed**:
1. **TruffleHog**: Scans commit history for verified secrets
2. **Gitleaks**: Pattern-based secret detection (optional)
3. **Environment Files**: Checks for committed `.env` files
4. **Secret Patterns**: Custom regex patterns for common secrets

**Response to violations**:
- Workflow fails if secrets are detected
- Comment added to PR with details
- Must be resolved before merge

### 4. GitHub Advanced Security

**Features**:
- Secret scanning push protection
- Code scanning with CodeQL
- Dependency review in PRs
- Security advisories

## Current Security Status

### Dependency Vulnerabilities (as of 2025-11-14)

#### Frontend
- ✅ **0 vulnerabilities** (all fixed)
- Recent fix: js-yaml upgraded from 4.1.0 → 4.1.1 (CVE fix for prototype pollution)

#### Mobile
- ⚠️ **23 moderate vulnerabilities** in development dependencies (Jest)
- **Status**: Acceptable - only affects test environment
- **Risk**: Low (not in production code)

#### Backend
- ✅ **0 known vulnerabilities** in Go dependencies
- Regular monitoring via Dependabot

### CodeQL Analysis

- ✅ **0 security vulnerabilities** detected
- ✅ **0 errors** in latest scan
- Regular scans on every push and PR

### Secret Scanning

- ✅ **0 secrets** detected in codebase
- ✅ All `.env` files properly excluded
- ✅ No hardcoded credentials found

## Vulnerability Response Workflow

### High/Critical Severity

1. **Detection**: Automated alert via Dependabot or CodeQL
2. **Triage**: Review vulnerability details and impact
3. **Fix**: Apply security patch or upgrade dependency
4. **Test**: Run full test suite to verify fix
5. **Deploy**: Merge and deploy fix ASAP
6. **Document**: Update security documentation

### Medium Severity

1. **Detection**: Automated alert
2. **Triage**: Review within 7 days
3. **Fix**: Include in next sprint/release
4. **Test**: Standard testing process
5. **Deploy**: Regular deployment cycle

### Low Severity

1. **Detection**: Automated alert
2. **Triage**: Review within 30 days
3. **Fix**: Include in regular updates
4. **Test**: Standard testing process

## Manual Security Scanning

### Running CodeQL Locally

```bash
# Install CodeQL CLI
npm install -g @github/codeql-cli

# Run analysis on backend
cd backend
codeql database create codeql-db --language=go
codeql database analyze codeql-db --format=sarif-latest --output=results.sarif

# Run analysis on frontend
cd frontend
codeql database create codeql-db --language=javascript
codeql database analyze codeql-db --format=sarif-latest --output=results.sarif
```

### Running Dependency Audits

```bash
# Frontend
cd frontend
npm audit
npm audit fix  # Fix automatically if possible

# Mobile
cd mobile
npm audit
npm audit fix

# Backend
cd backend
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```

### Running Secret Scanning Locally

```bash
# Install TruffleHog
brew install trufflesecurity/trufflehog/trufflehog

# Scan entire repository
trufflehog git file://. --only-verified

# Scan specific commit
trufflehog git file://. --since-commit HEAD~1 --only-verified
```

## Security Best Practices

### For Developers

1. **Never commit secrets**
   - Use `.env.example` for documentation
   - Add `.env` files to `.gitignore`
   - Use environment variables for secrets

2. **Keep dependencies updated**
   - Review and merge Dependabot PRs regularly
   - Test updates in development first
   - Check release notes for breaking changes

3. **Review security alerts**
   - Check GitHub Security tab weekly
   - Prioritize high/critical alerts
   - Document fixes in commit messages

4. **Use secure coding practices**
   - Input validation and sanitization
   - Parameterized queries (no SQL injection)
   - Output encoding (no XSS)
   - Proper authentication/authorization

5. **Run security checks before PR**
   - `npm audit` for frontend/mobile
   - `go run golang.org/x/vuln/cmd/govulncheck@latest ./...` for backend
   - Review CodeQL results

### For Repository Admins

1. **Enable branch protection**
   - Require status checks to pass
   - Require code review
   - Include CODEOWNERS for sensitive files

2. **Configure security policies**
   - Review and update `SECURITY.md`
   - Set up security contact email
   - Define incident response process

3. **Monitor security metrics**
   - Track mean time to fix vulnerabilities
   - Review security alert trends
   - Conduct periodic security audits

## CI/CD Integration

Security scanning is integrated into the CI/CD pipeline:

### On Pull Requests

- ✅ CodeQL scan runs automatically
- ✅ Dependency review checks for new vulnerabilities
- ✅ Secret scanning prevents secret commits
- ✅ All checks must pass before merge

### On Merge to Main

- ✅ Full CodeQL analysis
- ✅ Secret scanning on new commits
- ✅ Results published to Security tab

### Weekly Scheduled Scans

- ✅ CodeQL deep analysis (Monday 00:00 UTC)
- ✅ Secret scanning full repository scan (Monday 09:00 UTC)
- ✅ Dependabot checks for updates (Monday)

## Compliance and Reporting

### Security Metrics

Track these metrics for security posture:

- **Mean Time to Detect (MTTD)**: How quickly vulnerabilities are detected
- **Mean Time to Fix (MTTF)**: How quickly vulnerabilities are fixed
- **Vulnerability Backlog**: Number of open security issues
- **Critical/High Severity Count**: Most urgent vulnerabilities

### Monthly Security Report

Generate monthly reports including:

1. Total vulnerabilities detected
2. Vulnerabilities fixed
3. Open vulnerabilities by severity
4. Dependency updates applied
5. CodeQL findings and resolutions

## Troubleshooting

### CodeQL Analysis Fails

**Issue**: CodeQL workflow fails or times out

**Solutions**:
1. Check workflow logs for specific errors
2. Verify language configuration in `codeql.yml`
3. Ensure build succeeds for analyzed language
4. Review [CodeQL troubleshooting guide](https://docs.github.com/en/code-security/code-scanning/troubleshooting-code-scanning)

### Dependabot PRs Not Appearing

**Issue**: No Dependabot updates are being created

**Solutions**:
1. Check `dependabot.yml` syntax
2. Verify repository has Dependabot enabled
3. Check if updates are paused in Settings
4. Review Dependabot logs in Insights tab

### False Positive Alerts

**Issue**: Security tool reports false positive

**Solutions**:
1. **CodeQL**: Add suppression comment with justification
2. **Dependabot**: Dismiss alert with reason
3. **Secret Scanning**: Mark as false positive
4. Document all suppressions for audit trail

## Resources

### Documentation

- [GitHub Code Scanning](https://docs.github.com/en/code-security/code-scanning)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [CodeQL Documentation](https://codeql.github.com/docs/)

### Tools

- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Go Vulnerability Database](https://vuln.go.dev/)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- [Gitleaks](https://github.com/gitleaks/gitleaks)

### Security References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security/getting-started/securing-your-repository)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## See Also

- [SECURITY.md](SECURITY.md) - Application security features
- [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md) - Latest security analysis results
- [CI-CD.md](CI-CD.md) - CI/CD pipeline documentation
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines including security
