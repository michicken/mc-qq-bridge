#!/bin/bash
set -e

VERSION=$(node -p "require('./package.json').version")
NAME=$(node -p "require('./package.json').name")
TAR="${NAME}-v${VERSION}.tar.gz"

echo "📦 Building release package: $TAR"

# Clean previous builds
rm -rf dist
mkdir -p dist

# Copy files
cp -r src config systemd scripts README.md LICENSE CONTRIBUTING.md dist/
cp package.json dist/

# Remove unnecessary files from dist
rm -rf dist/.git
find dist -name "*.log" -delete

# Create tarball
tar -czf "$TAR" dist/

echo "✅ Release package created: $TAR"
echo "📊 Size: $(du -h $TAR | cut -f1)"
echo ""
echo "To upload to GitHub:"
echo "1. Create a new release at https://github.com/yourusername/mc-qq-bridge/releases/new"
echo "2. Upload: $TAR"
echo "3. Add release notes"
