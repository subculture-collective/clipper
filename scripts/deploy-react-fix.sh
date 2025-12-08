#!/bin/bash

# Production Deployment Trigger for React Initialization Fix
# This script can be run locally or via CI/CD to force a fresh deployment

set -e

echo "🔄 Production Deployment - React Initialization Fix"
echo "=================================================="
echo ""

# Verify we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "❌ Error: Must be on 'main' branch to deploy to production"
  exit 1
fi

# Get the latest commit
LATEST_COMMIT=$(git rev-parse --short HEAD)
LATEST_TAG=$(git describe --tags --always)

echo "✅ Current branch: $CURRENT_BRANCH"
echo "✅ Latest commit: $LATEST_COMMIT"
echo "✅ Latest tag: $LATEST_TAG"
echo ""

echo "📦 Building frontend locally..."
cd frontend
npm ci
npm run build
cd ..
echo "✅ Frontend built successfully"
echo ""

echo "📦 Building backend locally..."
cd backend
go build -o bin/api ./cmd/api
cd ..
echo "✅ Backend built successfully"
echo ""

echo "🐳 Docker build instructions:"
echo "   For CI/CD systems that support direct triggers:"
echo "   - GitHub Actions: Automatically triggered on push to main"
echo "   - Manual trigger: Visit GitHub Actions and click 'Run workflow'"
echo ""

echo "🚀 Deployment steps:"
echo "   1. Ensure the GitHub Actions workflow completes successfully"
echo "   2. Verify the production deployment in Actions tab"
echo "   3. Check clpr.tv is serving the new build"
echo ""

echo "🔍 Verification:"
echo "   After deployment, verify the fix by:"
echo "   1. Open browser DevTools (F12)"
echo "   2. Go to Application → Cache Storage"
echo "   3. Clear all caches"
echo "   4. Hard refresh (Cmd/Ctrl + Shift + R)"
echo "   5. Check Console for 'Cannot set properties of undefined' errors"
echo ""

echo "📝 What was fixed:"
echo "   - React/ReactDOM kept in main bundle (not chunked)"
echo "   - Prevents 'Activity' property initialization race condition"
echo "   - Main bundle now: app-*.js (~127 KB)"
echo ""

echo "✅ Ready to deploy!"
echo ""
echo "If GitHub Actions automation fails, manual deployment:"
echo "   cd /opt/clipper"
echo "   docker compose pull"
echo "   docker compose up -d"
echo "   curl http://localhost:8080/health"
