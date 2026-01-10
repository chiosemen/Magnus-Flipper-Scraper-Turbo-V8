#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Preflight checks..."

# Ensure clean git state
if [[ -n "$(git status --porcelain)" ]]; then
  echo "❌ Working tree not clean. Commit or stash first."
  exit 1
fi

echo "✅ Git clean"

# Ensure on main
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo "❌ Not on main branch (current: $BRANCH)"
  exit 1
fi

echo "✅ On main branch"

# Install deps (deterministic)
pnpm install --frozen-lockfile

# Full workspace validation
pnpm -r run typecheck
pnpm -r run build

echo "✅ Build & typecheck passed"

# Optional: push (no force)
git push origin main

echo "🚀 Triggering deployment via CI/CD..."
echo "➡️  If you use GitHub Actions, deployment starts now."

# If you deploy manually to Cloud Run, uncomment below:

# gcloud run deploy magnus-api \
#   --source api \
#   --region us-east1 \
#   --allow-unauthenticated

# gcloud run deploy magnus-worker \
#   --source workers \
#   --region us-east1 \
#   --no-allow-unauthenticated

echo "🎉 Deploy command finished"

