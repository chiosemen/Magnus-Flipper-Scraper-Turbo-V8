#!/bin/bash

# Asset Generation Script for App Store Submission
# Generates all required icon sizes from a single 1024x1024 source

set -e

echo "📱 Magnus Flipper - Asset Generation"
echo "====================================="

cd "$(dirname "$0")/.."

# Check if assets directory exists
if [ ! -d "assets" ]; then
  echo "Creating assets directory..."
  mkdir -p assets
fi

echo ""
echo "📋 Required Assets Checklist:"
echo ""
echo "  iOS App Store:"
echo "    ✓ icon.png (1024x1024) - App Store icon"
echo "    ✓ splash.png (2048x2732) - Splash screen"
echo ""
echo "  Android Play Store:"
echo "    ✓ adaptive-icon.png (1024x1024) - Adaptive icon"
echo "    ✓ Feature graphic (1024x500) - Play Store listing"
echo ""
echo "  Common:"
echo "    ✓ favicon.png (48x48) - Web favicon"
echo ""

# Check for icon.png
if [ ! -f "assets/icon.png" ]; then
  echo "❌ MISSING: assets/icon.png (1024x1024)"
  echo ""
  echo "📝 To generate assets:"
  echo "   1. Create a 1024x1024 PNG icon"
  echo "   2. Place it in assets/icon.png"
  echo "   3. Re-run this script"
  echo ""
  exit 1
else
  echo "✅ Found: assets/icon.png"
fi

# Check for splash.png
if [ ! -f "assets/splash.png" ]; then
  echo "⚠️  MISSING: assets/splash.png (recommended 2048x2732)"
else
  echo "✅ Found: assets/splash.png"
fi

# Check for adaptive-icon.png
if [ ! -f "assets/adaptive-icon.png" ]; then
  echo "⚠️  MISSING: assets/adaptive-icon.png (1024x1024)"
  echo "   Using icon.png as fallback..."
  cp assets/icon.png assets/adaptive-icon.png
  echo "✅ Created: assets/adaptive-icon.png (from icon.png)"
else
  echo "✅ Found: assets/adaptive-icon.png"
fi

# Generate favicon if missing
if [ ! -f "assets/favicon.png" ]; then
  if command -v magick &> /dev/null; then
    echo "Generating favicon.png from icon.png..."
    magick assets/icon.png -resize 48x48 assets/favicon.png
    echo "✅ Generated: assets/favicon.png"
  else
    echo "⚠️  MISSING: assets/favicon.png"
    echo "   Install ImageMagick to auto-generate: brew install imagemagick"
  fi
else
  echo "✅ Found: assets/favicon.png"
fi

echo ""
echo "====================================="
echo "✅ Asset check complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Verify assets visually"
echo "   2. Run: eas build --profile preview --platform android"
echo ""
