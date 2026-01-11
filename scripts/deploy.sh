#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Preflight checks..."

# Ensure clean git state
# By default ignore untracked files (build artifacts, generated .js) so they don't block deployment.
# Set STRICT=1 in the environment to require zero untracked files as well.
STATUS_CMD="git status --porcelain"
if [[ "${STRICT:-0}" != "1" ]]; then
  STATUS_CMD="$STATUS_CMD --untracked-files=no"
fi
if [[ -n "$(eval $STATUS_CMD)" ]]; then
  echo "❌ Working tree not clean. Commit or stash first."
  exit 1
fi

echo "✅ Git clean (ignoring untracked files)"

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
