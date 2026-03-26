#!/bin/bash
# Post-build script: compile watchOS target and embed in iOS app
set -e

echo "[watch-build] Building VITTAUPWatch..."

IOS_APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -path "*/Build/Products/*-iphoneos/VITTAUP.app" -type d 2>/dev/null | head -1)

if [ -z "$IOS_APP_PATH" ]; then
  echo "[watch-build] iOS app not found in DerivedData, searching archive..."
  IOS_APP_PATH=$(find /tmp -path "*/Products/Applications/VITTAUP.app" -type d 2>/dev/null | head -1)
fi

if [ -z "$IOS_APP_PATH" ]; then
  echo "[watch-build] WARNING: Could not find iOS app to embed watch into"
  exit 0
fi

echo "[watch-build] Found iOS app at: $IOS_APP_PATH"

# Build watch app
cd "$(dirname "$0")/.."
xcodebuild build \
  -project ios/VITTAUP.xcodeproj \
  -target VITTAUPWatch \
  -configuration Release \
  -sdk watchos \
  -derivedDataPath /tmp/watch-dd \
  DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-}" \
  CODE_SIGN_STYLE=Automatic \
  SKIP_INSTALL=NO \
  2>&1 | tail -5

WATCH_APP=$(find /tmp/watch-dd -name "VITTAUPWatch.app" -type d 2>/dev/null | head -1)

if [ -z "$WATCH_APP" ]; then
  echo "[watch-build] WARNING: Watch app build failed"
  exit 0
fi

echo "[watch-build] Watch app built at: $WATCH_APP"

# Embed in iOS app
mkdir -p "$IOS_APP_PATH/Watch"
cp -r "$WATCH_APP" "$IOS_APP_PATH/Watch/"

echo "[watch-build] Watch app embedded successfully!"
