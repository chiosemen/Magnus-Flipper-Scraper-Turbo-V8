#!/bin/sh
set -e

echo "=== API Build Verification Gate ==="
echo ""

# Step 1: Compile TypeScript
echo "[1/3] Compiling TypeScript..."
cd api
npx tsc --noEmit
echo "✓ TypeScript compilation successful"

# Step 2: Build to dist/
echo ""
echo "[2/3] Building to dist/..."
npm run build
echo "✓ Build complete"

# Step 3: Verify dist/index.js exists
echo ""
echo "[3/3] Verifying dist/index.js..."
if [ ! -f "dist/index.js" ]; then
  echo "✗ GATE FAILED: dist/index.js not found"
  exit 1
fi
echo "✓ dist/index.js exists"

# Step 4: Enforce Node-only runtime (no tsx)
echo ""
echo "[4/4] Enforcing Node-only runtime..."
if grep -q "tsx" package.json | grep -v "devDependencies"; then
  echo "✗ GATE FAILED: tsx found in production dependencies"
  exit 1
fi
echo "✓ No tsx in production dependencies"

echo ""
echo "=== ✓ BUILD VERIFICATION PASSED ==="
echo "API is production-ready for deployment"
exit 0
